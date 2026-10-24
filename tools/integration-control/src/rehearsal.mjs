// Entegrasyon provası: gerçek birleştirme DEĞİL. Yalnız işletim sistemi geçici dizininde, aracın kendi
// oluşturduğu ve sahiplik işaretli ayrık (detached) worktree'de çalışır. Hiçbir uzak dala push yapılmaz.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createGitAdapter } from "./adapters.mjs";
import { assertSha, redact, run, tempRoot } from "./safety.mjs";

export const STATUSES = ["clean_merge_possible", "textual_conflict", "semantic_validation_failed", "build_failed", "test_failed", "blocked_on_pr_dependency", "insufficient_information", "validated_in_rehearsal"];
const MARKER = ".mka-rehearsal-owner.json";
/** Araçların çalışırken yeniden ürettiği izlenen dosyalar; temizlikten önce geri alınabilir. */
export const GENERATED_FILES = ["web/next-env.d.ts"];
const ENVIRONMENT_FAILURE = [/is already used, make sure that nothing is running on the port/i, /EADDRINUSE/, /Process from config\.webServer (was not able to start|exited early)/i, /Timed out waiting \d+ms from config\.webServer/i, /browserType\.launch: Executable doesn't exist/i];

/** Varsayılan: yalnız plan. Hangi SHA'lar hangi sırayla denenecek, ön koşul ihlali var mı. */
export function planRehearsal({ baseSha, steps, graph, validateOrder }) {
  assertSha(baseSha); for (const step of steps) assertSha(step.sha);
  const order = graph && validateOrder ? validateOrder(graph, steps.map((step) => step.pr)) : { ok: true, problems: [] };
  return { mode: "plan", baseSha, steps: steps.map((step) => ({ pr: step.pr, sha: step.sha, action: `merge --no-ff ${step.sha.slice(0, 12)} (yalnız geçici worktree'de)` })), orderValid: order.ok, problems: order.problems, wouldCreate: `${tempRoot()}${path.sep}mka-rehearsal-<rastgele>` };
}

/**
 * --execute-rehearsal ile çağrılır. Ana deponun HEAD'i, durumu ve ref parmak izi önce/sonra karşılaştırılır.
 * commands: [{ name, command, args, cwd(relative) }] — derleme/test adımları; bulunamayan komut NOT_RUN.
 */
export function executeRehearsal({ repoDir, baseSha, steps, commands = [], runner = run, keep = false, timeoutMs = 900_000 }) {
  assertSha(baseSha); for (const step of steps) assertSha(step.sha);
  const mainGit = createGitAdapter({ runner, cwd: repoDir });
  const before = { head: mainGit.headSha(), status: mainGit.statusPorcelain(), refs: mainGit.refsFingerprint() };
  const id = `mka-rehearsal-${Date.now()}-${randomBytes(4).toString("hex")}`;
  const dir = path.join(tempRoot(), id);
  const result = { id, baseSha, steps: [], commands: [], status: "insufficient_information", startedAt: new Date().toISOString() };
  const add = runner("git", ["worktree", "add", "--detach", dir, baseSha], { cwd: repoDir, timeoutMs: 300_000 });
  if (add.code !== 0) { result.error = redact(add.stderr); return finish(); }
  writeFileSync(path.join(dir, MARKER), JSON.stringify({ id, createdBy: "tools/integration-control", baseSha }));
  const git = (args, options = {}) => runner("git", ["-c", "user.name=MKA Rehearsal", "-c", "user.email=rehearsal@localhost", ...args], { cwd: dir, timeoutMs: 300_000, ...options });
  result.status = "clean_merge_possible";
  for (const step of steps) {
    const merged = git(["merge", "--no-ff", "--no-edit", step.sha]);
    if (merged.code !== 0) {
      const conflicts = git(["diff", "--name-only", "--diff-filter=U"]).stdout.split("\n").filter(Boolean);
      git(["merge", "--abort"]);
      result.steps.push({ pr: step.pr, sha: step.sha, merged: false, conflicts });
      result.status = conflicts.length ? "textual_conflict" : "insufficient_information";
      return finish();
    }
    result.steps.push({ pr: step.pr, sha: step.sha, merged: true, conflicts: [] });
  }
  result.combinedTree = git(["rev-parse", "HEAD^{tree}"]).stdout.trim();
  for (const command of commands) {
    const cwd = path.join(dir, command.cwd ?? ".");
    if (!existsSync(cwd)) { result.commands.push({ name: command.name, status: "not_run", reason: "çalışma dizini yok" }); continue; }
    const started = Date.now(); const output = runner(command.command, command.args, { cwd, timeoutMs: command.timeoutMs ?? timeoutMs, env: command.env });
    const text = `${output.stdout}
${output.stderr}`;
    // Ortam/başlatma hatası test sonucu değildir: blocked (port dolu, web sunucusu başlamadı, araç yok).
    const environmental = ENVIRONMENT_FAILURE.find((pattern) => pattern.test(text));
    const status = output.timedOut ? "blocked" : output.code === 0 ? "pass" : output.error && /ENOENT/.test(output.error) ? "not_run" : environmental ? "blocked" : "fail";
    result.commands.push({ name: command.name, command: [command.command, ...command.args].join(" "), cwd: command.cwd ?? ".", exitCode: output.code, status, seconds: Math.round((Date.now() - started) / 1000), summary: redact((output.stdout + output.stderr).split("\n").filter((line) => /pass|fail|error|ℹ|passed|failed|✓|✖/i.test(line)).slice(-6).join(" | ")).slice(0, 800) });
    if (status === "blocked") {
      result.commands.at(-1).reason = output.timedOut ? "zaman aşımı" : `ortam: ${String(environmental)}`;
      // Engellenen adımdan sonraki sonuçlar anlamsız olurdu: kalanlar çalıştırılmaz ama raporda görünür.
      for (const skipped of commands.slice(commands.indexOf(command) + 1)) result.commands.push({ name: skipped.name, status: "not_run", reason: "önceki adım engellendi" });
      result.status = "insufficient_information"; break;
    }
    if (status === "fail") { result.status = command.kind === "build" ? "build_failed" : command.kind === "semantic" ? "semantic_validation_failed" : "test_failed"; break; }
  }
  if (result.status === "clean_merge_possible" && commands.length && result.commands.every((command) => command.status === "pass")) result.status = "validated_in_rehearsal";
  return finish();

  function finish() {
    result.cleanup = keep ? "kept" : cleanupRehearsal(repoDir, dir, runner);
    const after = { head: mainGit.headSha(), status: mainGit.statusPorcelain(), refs: mainGit.refsFingerprint() };
    // Prova ana depoyu değiştirmemeli: HEAD, çalışma ağacı ve tüm dal/uzak ref'ler aynı kalmalı (worktree kaydı hariç).
    result.mainRepoUnchanged = before.head === after.head && before.status === after.status && before.refs === after.refs;
    result.finishedAt = new Date().toISOString();
    return result;
  }
}

/** Yalnız sahiplik işareti olan, izlenen dosyası değişmemiş geçici worktree silinir. */
export function cleanupRehearsal(repoDir, dir, runner = run) {
  const resolved = path.resolve(dir);
  if (!resolved.startsWith(path.resolve(tempRoot()) + path.sep) || !path.basename(resolved).startsWith("mka-rehearsal-")) return "refused: dizin aracın geçici alanında değil";
  const markerPath = path.join(resolved, MARKER);
  if (!existsSync(markerPath)) return "refused: sahiplik işareti yok";
  try { JSON.parse(readFileSync(markerPath, "utf8")); } catch { return "refused: sahiplik işareti bozuk"; }
  const changed = () => runner("git", ["status", "--porcelain=v1", "--untracked-files=no"], { cwd: resolved }).stdout.split(/\r?\n/).filter(Boolean).map((line) => line.slice(3));
  const generated = changed().filter((file) => GENERATED_FILES.includes(file));
  if (generated.length) runner("git", ["checkout", "--", ...generated], { cwd: resolved });
  const remaining = changed();
  if (remaining.length) return `refused: izlenen dosyalarda değişiklik var (${remaining.slice(0, 5).join(", ")})`;
  const removed = runner("git", ["worktree", "remove", "--force", resolved], { cwd: repoDir, timeoutMs: 300_000 });
  return removed.code === 0 ? "removed" : `failed: ${redact(removed.stderr).slice(0, 200)}`;
}
