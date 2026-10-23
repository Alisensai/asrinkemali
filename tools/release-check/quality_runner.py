#!/usr/bin/env python3
"""Run the release gate suite and produce one machine/human-readable report."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from datetime import datetime, timezone

import checker


SEVERITY_RANK = {"critical": 0, "error": 1, "warning": 2, "expert_review": 2, "info": 3}


def _parse_json_output(output: str) -> dict | None:
    start = output.find("{")
    if start < 0:
        return None
    try:
        value = json.loads(output[start:])
    except json.JSONDecodeError:
        return None
    return value if isinstance(value, dict) else None


def _test_counts(name: str, output: str, code: int) -> tuple[int, int]:
    if name == "release-checker-tests":
        match = re.search(r"Ran\s+(\d+)\s+tests?", output)
        if not match:
            return 0, 1 if code else 0
        passed = int(match.group(1)) if code == 0 else 0
        failed = 0 if code == 0 else max(1, int(match.group(1)))
        return passed, failed
    if name in {"web-unit-tests", "web-e2e"}:
        tests = re.search(r"(?:ℹ\s*)?tests\s+(\d+)", output)
        failed = re.search(r"(?:ℹ\s*)?fail\s+(\d+)", output)
        if tests:
            fail_count = int(failed.group(1)) if failed else (0 if code == 0 else 1)
            return max(0, int(tests.group(1)) - fail_count), fail_count
        if name == "web-e2e":
            passed = re.search(r"(\d+)\s+passed", output)
            failures = re.search(r"(\d+)\s+failed", output)
            return int(passed.group(1)) if passed else 0, int(failures.group(1)) if failures else (0 if code == 0 else 1)
        return 0, 1 if code else 0
    return 0, 0


def run_step(name: str, command: list[str], cwd: Path, env: dict | None = None) -> dict:
    try:
        result = subprocess.run(command, cwd=cwd, env=env, capture_output=True, text=True,
                                encoding="utf-8", errors="replace", check=False)
        output = (result.stdout or "") + (result.stderr or "")
        tests_passed, tests_failed = _test_counts(name, output, result.returncode)
        return {
            "name": name,
            "command": command,
            "passed": result.returncode == 0,
            "exit_code": result.returncode,
            "tests_passed": tests_passed,
            "tests_failed": tests_failed,
            "output_tail": output[-4000:],
            "error": None,
            "_stdout": result.stdout or "",
            "_stderr": result.stderr or "",
        }
    except OSError as exc:
        return {
            "name": name, "command": command, "passed": False, "exit_code": None,
            "tests_passed": 0, "tests_failed": 1 if name.endswith("tests") else 0,
            "output_tail": "", "error": str(exc), "_stdout": "", "_stderr": "",
        }


def add_finding(findings: list[dict], severity: str, code: str, message: str, target: str = "ci", path: str = "") -> None:
    findings.append({"severity": severity, "code": code, "message": message, "target": target, "path": path})


def check_audit(web_root: Path, report: dict) -> None:
    npm = "npm.cmd" if os.name == "nt" else "npm"
    full = run_step("dependency-audit", [npm, "audit", "--json"], web_root)
    production = run_step("production-dependency-audit", [npm, "audit", "--omit=dev", "--json"], web_root)
    full_payload = _parse_json_output(full["_stdout"])
    production_payload = _parse_json_output(production["_stdout"])
    if full_payload is None or production_payload is None:
        full["passed"] = False
        full["error"] = "npm audit JSON çıktısı alınamadı; ağ veya registry erişimini kontrol edin."
        report["checks"].extend([_public_check(full), _public_check(production)])
        add_finding(report["findings"], "error", "dependency-audit-unavailable", full["error"])
        return

    audit_steps = (("all-dependencies", full, full_payload), ("production-dependencies", production, production_payload))
    invalid_audits = [
        label for label, _, payload in audit_steps
        if payload.get("error") is not None
        or not isinstance(payload.get("metadata"), dict)
        or not isinstance(payload.get("vulnerabilities"), dict)
    ]
    if invalid_audits:
        message = "npm audit JSON hata içeriyor veya eksik; ağ/registry erişimini doğrulayın."
        for _, step, _ in audit_steps:
            step["passed"] = False
            step["error"] = message
        report["checks"].extend([_public_check(full), _public_check(production)])
        add_finding(report["findings"], "error", "dependency-audit-unavailable", message, "security")
        return

    production_vulnerabilities = production_payload.get("vulnerabilities", {})
    report["dependency_audit"] = {
        "all_dependencies": full_payload.get("metadata", {}).get("vulnerabilities", {}),
        "production_dependencies": production_payload.get("metadata", {}).get("vulnerabilities", {}),
        "production_vulnerabilities": sorted(production_vulnerabilities),
        "full_audit_exit_code": full["exit_code"],
        "production_audit_exit_code": production["exit_code"],
    }
    severities = {"critical": "critical", "high": "error", "moderate": "warning", "low": "warning"}
    for package, vulnerability in full_payload.get("vulnerabilities", {}).items():
        severity = str(vulnerability.get("severity", "moderate")).lower()
        in_production = package in production_vulnerabilities
        mapped = severities.get(severity, "warning") if in_production else "warning"
        scope = "production" if in_production else "development-only"
        via = vulnerability.get("via", [])
        advisories = [
            item.get("title", item.get("name", "")) for item in via if isinstance(item, dict)
        ]
        details = "; ".join(advisories) or f"{severity} dependency advisory"
        add_finding(report["findings"], mapped, "dependency-vulnerability",
                    f"{package} ({scope}, {severity}): {details}.", "security", package)
    full["passed"] = True
    full["exit_code"] = 0
    production["passed"] = not bool(production_vulnerabilities)
    if production_vulnerabilities:
        production["error"] = f"{len(production_vulnerabilities)} production dependency advisory(ies) found."
    report["checks"].extend([_public_check(full), _public_check(production)])


def _public_check(step: dict) -> dict:
    return {key: value for key, value in step.items() if not key.startswith("_")}


def _markdown(report: dict) -> str:
    summary = report["summary"]
    lines = [
        "# V0.4 release quality report", "",
        f"- **Üretim için hazır:** {'EVET' if report['release_ready'] else 'HAYIR'}",
        f"- **Çalışma zamanı (UTC):** {report['generated_at']}",
        f"- **Hedef:** {report['target_root']}",
        f"- **Testler:** {summary['tests_passed']} geçti / {summary['tests_failed']} başarısız",
        f"- **Kritik hata:** {summary['critical']}",
        f"- **Hata:** {summary['error']}",
        f"- **Uyarı:** {summary['warning']}",
        f"- **Uzman incelemesi:** {summary['expert_review']}",
        "",
        "## Kontroller", "",
        "| Kontrol | Sonuç | Exit code |",
        "|---|---:|---:|",
    ]
    for check in report["checks"]:
        lines.append(f"| {check['name']} | {'GEÇTİ' if check['passed'] else 'BAŞARISIZ'} | {check.get('exit_code', 'n/a')} |")
    if report.get("release_blockers"):
        lines.extend(["", "## Yayın engelleri", ""])
        lines.extend(f"- {item}" for item in report["release_blockers"])
    lines.extend(["", "## Eksik içerikler", ""])
    lines.extend(f"- {item}" for item in report["missing_content"] or ["Eksik içerik bulgusu yok."])
    lines.extend(["", "## Eksik kaynak bilgileri", ""])
    lines.extend(f"- {item}" for item in report["missing_sources"] or ["Eksik kaynak alanı bulgusu yok."])
    lines.extend(["", "## Güvenlik bulguları", ""])
    security = [item for item in report["findings"] if item["target"] == "security"]
    lines.extend(f"- **{item['severity']}** `{item['code']}` {item['path']}: {item['message']}" for item in security)
    if not security:
        lines.append("- Güvenlik bulgusu yok.")
    lines.extend(["", "## Tüm kalite bulguları", "",
                  "| Şiddet | Kod | Hedef | Dosya | Açıklama |",
                  "|---|---|---|---|---|"])
    if report["findings"]:
        for item in report["findings"]:
            cells = [item[key].replace("|", "\\|").replace("\n", " ") for key in ("severity", "code", "target", "path", "message")]
            lines.append("| " + " | ".join(cells) + " |")
    else:
        lines.append("| — | — | — | — | Bulgu yok |")
    archive = report.get("archive", {})
    collections = report.get("data_collections", {})
    lines.extend([
        "", "## Arşiv doğrulama sınırları", "",
        f"- Kayıt sayısı: {archive.get('record_count', 0)}; yayınlanabilir olarak işaretli: {archive.get('publishable_record_count', 0)}.",
        "- Site koleksiyonları: " + (", ".join(f"{name}={count}" for name, count in sorted(collections.items())) or "ölçülemedi"),
        "- URL biçiminin geçerli olması kaynağın gerçekliğini, belgenin içeriğini veya tarihsel iddianın doğruluğunu kanıtlamaz.",
        "- Kaynağın provenansı, telif ve bağlamı için kayıt bazında uzman incelemesi gereklidir. Dış URL kontrolü ayrıca açılmadıkça ağ isteği yapılmaz.",
        "- Bu rapor canlı site, DNS veya arama motoru indekslenmesi iddiası içermez.",
        "",
    ])
    return "\n".join(lines)


def run(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Çalışan uygulama kalite kapılarını yürüt ve release raporu üret.")
    parser.add_argument("--web-root", type=Path, default=Path("web"))
    parser.add_argument("--output-dir", type=Path, default=Path("release-check-reports"))
    parser.add_argument("--e2e", action="store_true", help="Playwright E2E suite'ini çalıştır (Chromium önceden kurulu olmalı).")
    parser.add_argument("--external-links", action="store_true")
    parser.add_argument("--max-file-mb", type=float, default=5.0)
    args = parser.parse_args(argv)
    repo_root = Path.cwd().resolve()
    web_root = (repo_root / args.web_root).resolve() if not args.web_root.is_absolute() else args.web_root.resolve()
    output_root = (repo_root / args.output_dir).resolve() if not args.output_dir.is_absolute() else args.output_dir.resolve()
    npm = "npm.cmd" if os.name == "nt" else "npm"

    report = {
        "schema_version": 2,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "target_root": str(web_root),
        "target": "next",
        "checks": [],
        "findings": [],
        "release_blockers": [],
        "missing_content": [],
        "missing_sources": [],
        "archive": {},
        "summary": {},
        "release_ready": False,
        "external_link_check_enabled": args.external_links,
    }

    if not web_root.is_dir():
        add_finding(report["findings"], "critical", "required-target-missing",
                    f"Gerçek Next.js hedefi yok; sessizce SKIP edilmiyor: {web_root}", "next")
        report["checks"].append({"name": "next-app-present", "passed": False, "exit_code": 1,
                                 "tests_passed": 0, "tests_failed": 0, "error": "web/ directory missing"})
    else:
        commands = [
            ("web-lint", [npm, "run", "lint"]),
            ("web-typecheck", [npm, "run", "typecheck"]),
            ("web-unit-tests", [npm, "test"]),
            ("release-checker-tests", [sys.executable, "-m", "unittest", "discover", "-s",
                                      str(repo_root / "tools" / "release-check" / "tests"), "-v"]),
            ("web-production-build", [npm, "run", "build"]),
        ]
        if args.e2e:
            commands.append(("web-e2e", [npm, "run", "test:e2e"]))
        for name, command in commands:
            step_env = None
            if name == "web-e2e":
                step_env = os.environ.copy()
                step_env["CI"] = "true"
            step = run_step(name, command, web_root if name.startswith("web-") else repo_root, env=step_env)
            report["checks"].append(_public_check(step))
            if name in {"web-unit-tests", "release-checker-tests", "web-e2e"}:
                report["summary"]["tests_passed"] = report["summary"].get("tests_passed", 0) + step["tests_passed"]
                report["summary"]["tests_failed"] = report["summary"].get("tests_failed", 0) + step["tests_failed"]
            if not step["passed"]:
                add_finding(report["findings"], "critical" if name.endswith("tests") or name == "web-e2e" else "error",
                            "quality-command-failed", f"{name} başarısız oldu (exit {step['exit_code']}): {step['error'] or step['output_tail'][-1000:]}", "ci")
        check_audit(web_root, report)
        checker_report = {"findings": [], "targets": {}, "git": {}, "checks": []}
        checker.check_repo(repo_root, checker_report, {})
        checker.check_secret_leaks(repo_root, checker_report)
        checker.check_target(web_root, "next", checker_report, args.max_file_mb, args.external_links,
                             timeout=5.0, rate_limit=0.25, cache={}, require_target=True)
        report["findings"].extend(checker_report["findings"])
        report["archive"] = checker_report.get("archive", {})
        report["data_collections"] = checker_report.get("data_collections", {})
        report["targets"] = checker_report.get("targets", {})
        report["git"] = checker_report.get("git", {})
        report["external_links_checked"] = checker_report.get("external_links_checked", 0)
        report["checks"].append({
            "name": "next-source-audit",
            "passed": not any(item["severity"] in {"critical", "error"} for item in checker_report["findings"]),
            "exit_code": 1 if any(item["severity"] in {"critical", "error"} for item in checker_report["findings"]) else 0,
            "tests_passed": 0, "tests_failed": 0,
            "error": None,
        })

    severities = ("critical", "error", "warning", "expert_review", "info")
    for severity in severities:
        report["summary"][severity] = sum(item["severity"] == severity for item in report["findings"])
    report["summary"].setdefault("tests_passed", 0)
    report["summary"].setdefault("tests_failed", 0)
    report["missing_content"] = [
        item["message"] for item in report["findings"]
        if item["code"] in {"missing-archive-content", "missing-published-content"}
    ]
    report["missing_sources"] = [
        {"path": item["path"], "code": item["code"], "message": item["message"]}
        for item in report["findings"] if item["code"].startswith(("missing-source", "invalid-source-url", "missing-use", "missing-copyright"))
    ]
    report["security_findings"] = [item for item in report["findings"] if item["target"] == "security"]
    report["release_blockers"] = [
        item["message"] for item in report["findings"] if item["severity"] in {"critical", "error"}
    ]
    if not report["archive"].get("publishable_record_count"):
        report["release_blockers"].append("Yayımlanmaya uygun, uzman incelemeli arşiv kaydı bulunmuyor.")
    if not os.environ.get("NEXT_PUBLIC_SITE_URL"):
        # Public URL configuration is intentionally supplied by deployment, never guessed or committed.
        layout = web_root / "app" / "layout.tsx"
        if layout.is_file() and "NEXT_PUBLIC_SITE_URL" in layout.read_text(encoding="utf-8", errors="replace"):
            report["release_blockers"].append("Gerçek production origin'i NEXT_PUBLIC_SITE_URL ile yayın ortamında doğrulanmalı.")
    report["release_ready"] = not report["release_blockers"] and report["summary"]["tests_failed"] == 0

    output_root.mkdir(parents=True, exist_ok=True)
    json_path = output_root / "release-quality.json"
    markdown_path = output_root / "release-quality.md"
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    markdown_path.write_text(_markdown(report), encoding="utf-8")
    print(f"Release report: {json_path}")
    print(f"Release report: {markdown_path}")
    print(f"Tests: {report['summary']['tests_passed']} passed, {report['summary']['tests_failed']} failed")
    print(f"Findings: {report['summary']['critical']} critical, {report['summary']['error']} errors, {report['summary']['warning']} warnings, {report['summary']['expert_review']} expert reviews")
    print(f"Release-ready: {report['release_ready']}")
    gate_failed = (
        report["summary"]["critical"] > 0
        or report["summary"]["error"] > 0
        or report["summary"]["tests_failed"] > 0
        or any(not item["passed"] for item in report["checks"])
    )
    print(f"CI gate: {'FAILED' if gate_failed else 'PASSED'}")
    return 1 if gate_failed else 0


if __name__ == "__main__":
    raise SystemExit(run())
