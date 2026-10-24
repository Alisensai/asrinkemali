#!/usr/bin/env node
// MKA FORTRESS — gizli bilgi taraması. Bulunan değerler ASLA yazdırılmaz; yalnız dosya, satır,
// kural ve geri döndürülemez parmak izi (ilk 4 karakter + uzunluk) raporlanır.
//   node tools/mka-fortress/secrets.mjs [--bundle]     (--bundle: web/.next/static istemci paketini de tara)
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { argument, REPO_ROOT } from "./lib/common.mjs";

export const RULES = [
  { id: "aws-access-key", pattern: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { id: "github-token", pattern: /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/g },
  { id: "anthropic-key", pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },
  { id: "openai-key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9]{32,}\b/g },
  { id: "google-api-key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { id: "slack-token", pattern: /\bxox[abpors]-[A-Za-z0-9-]{10,}\b/g },
  { id: "stripe-live-key", pattern: /\b(sk|rk)_live_[A-Za-z0-9]{20,}\b/g },
  { id: "private-key-block", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g },
  { id: "jwt", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { id: "assigned-secret", pattern: /\b(?:api[_-]?key|secret|password|passwd|auth[_-]?token|access[_-]?token|client[_-]?secret)\b\s*[:=]\s*["']([^"'\s]{12,})["']/gi, valueGroup: 1, entropy: 3.5 },
];
const SKIP = /(^|\/)(node_modules|\.next|test-results|playwright-report)\/|\.(png|jpe?g|webp|gif|ico|pdf|woff2?|ttf|zip|lock)$|package-lock\.json$/i;
// Bilinen sahte/örnek değerler (testlerde kullanılan yer tutucular) parmak izinden önce elenir.
const PLACEHOLDER = /(example|ornek|örnek|dummy|placeholder|changeme|xxxxx|test[-_]?(key|token|secret)|<[^>]+>|\$\{)/i;

function entropy(value) { const counts = {}; for (const char of value) counts[char] = (counts[char] ?? 0) + 1; return Object.values(counts).reduce((sum, count) => { const p = count / value.length; return sum - p * Math.log2(p); }, 0); }
export const fingerprint = (value) => `${value.slice(0, 4)}…(${value.length})`;

export function scanText(text, file) {
  const findings = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const rule of RULES) {
      rule.pattern.lastIndex = 0;
      for (const match of line.matchAll(rule.pattern)) {
        const value = match[rule.valueGroup ?? 0];
        if (PLACEHOLDER.test(value) || PLACEHOLDER.test(line.slice(Math.max(0, match.index - 20), match.index + match[0].length + 20))) continue;
        if (rule.entropy && entropy(value) < rule.entropy) continue;
        findings.push({ file, line: index + 1, rule: rule.id, fingerprint: fingerprint(value) });
      }
    }
  });
  return findings;
}

export function scanRepository(root = REPO_ROOT) {
  const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\n").filter(Boolean);
  const findings = []; const envFiles = []; const publicEnv = new Set();
  for (const file of tracked) {
    if (/(^|\/)\.env(\.|$)/.test(file) && !/\.env\.example$/.test(file)) envFiles.push(file);
    if (SKIP.test(file)) continue;
    const full = path.join(root, file);
    if (!existsSync(full) || statSync(full).size > 2 * 1024 * 1024) continue;
    const text = readFileSync(full, "utf8");
    findings.push(...scanText(text, file));
    if (/\.(tsx?|mjs|js)$/.test(file)) for (const match of text.matchAll(/\bNEXT_PUBLIC_[A-Z0-9_]+/g)) publicEnv.add(match[0]);
  }
  // NEXT_PUBLIC_ değişkenleri istemci paketine gömülür: adında gizli bilgi çağrıştıran olanlar hatadır.
  const riskyPublic = [...publicEnv].filter((name) => /SECRET|PASSWORD|TOKEN|PRIVATE|KEY/.test(name));
  return { trackedFiles: tracked.length, findings, envFiles, publicEnv: [...publicEnv].sort(), riskyPublic };
}

/** İstemci paketi: sır desenleri ve sunucu dosya yolu sızıntısı. */
export function scanBundle(root = REPO_ROOT) {
  const directory = path.join(root, "web", ".next", "static");
  if (!existsSync(directory)) return { scanned: 0, findings: [], note: "Derleme yok (web/.next/static)." };
  const files = []; const walk = (dir) => { for (const entry of readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) walk(full); else if (/\.(js|css|json)$/.test(entry.name)) files.push(full); } }; walk(directory);
  const findings = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8"); const relative = path.relative(root, file).replaceAll("\\", "/");
    findings.push(...scanText(text, relative));
    for (const match of text.matchAll(/(?:[A-Za-z]:\\\\Users\\\\[^"'\\]+|\/home\/runner\/[^"'\s]+|\/Users\/[^"'\s/]+\/)/g)) findings.push({ file: relative, rule: "server-path-leak", fingerprint: fingerprint(match[0]) });
  }
  return { scanned: files.length, findings };
}

export function main(argv) {
  const repository = scanRepository();
  const bundle = argument(argv, "bundle") ? scanBundle() : null;
  const failing = repository.findings.length + repository.envFiles.length + repository.riskyPublic.length + (bundle?.findings.length ?? 0);
  console.log(JSON.stringify({ repository, bundle, ok: failing === 0, note: "Değerler gösterilmez. Bulgu varsa: anahtarı sağlayıcıda iptal et/yenile (kullanıcı onayıyla), dosyadan kaldır, geçmiş temizliği ayrıca değerlendirilir." }, null, 2));
  return failing ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) process.exitCode = main(process.argv.slice(2));
