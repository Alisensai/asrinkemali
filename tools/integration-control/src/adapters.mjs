// Salt-okunur GitHub ve git adaptörleri. Çalıştırıcı (runner) enjekte edilebilir: testler ağsız çalışır.
import { assertPrNumber, assertRef, assertSha, EXPECTED_REPO, run } from "./safety.mjs";

export class GithubError extends Error { constructor(kind, message) { super(message); this.kind = kind; } }

function classifyGhFailure(stderr) {
  if (/HTTP 429|rate limit|secondary rate/i.test(stderr)) return new GithubError("rate_limited", "GitHub API hız sınırı aşıldı. Bir süre sonra --resume ile yeniden deneyin veya --offline anlık görüntü kullanın.");
  if (/HTTP 403|HTTP 401|Bad credentials|Resource not accessible/i.test(stderr)) return new GithubError("forbidden", "GitHub erişimi reddedildi (403/401). Salt-okunur depo yetkisi olan bir oturum gerekir.");
  if (/HTTP 404/i.test(stderr)) return new GithubError("not_found", "GitHub kaynağı bulunamadı (404).");
  return new GithubError("unknown", `GitHub isteği başarısız: ${stderr.slice(0, 200)}`);
}

/** Yalnız GET. `--paginate --slurp` ile tüm sayfalar toplanır. */
export function createGithubAdapter({ runner = run, repo = EXPECTED_REPO, cwd } = {}) {
  const get = (endpoint, { paginate = false } = {}) => {
    const args = ["api", "-X", "GET", "-H", "Accept: application/vnd.github+json", ...(paginate ? ["--paginate", "--slurp"] : []), endpoint];
    const result = runner("gh", args, { cwd, timeoutMs: 120_000 });
    if (result.code !== 0) throw classifyGhFailure(result.stderr || result.error || "");
    const parsed = JSON.parse(result.stdout || "null");
    return paginate ? parsed.flat() : parsed;
  };
  return {
    listPullRequests: () => get(`repos/${repo}/pulls?state=all&per_page=100`, { paginate: true }),
    getPullRequest: (number) => get(`repos/${repo}/pulls/${assertPrNumber(number)}`),
    listFiles: (number) => get(`repos/${repo}/pulls/${assertPrNumber(number)}/files?per_page=100`, { paginate: true }),
    listCheckRuns: (sha) => get(`repos/${repo}/commits/${assertSha(sha)}/check-runs?per_page=100`, { paginate: true }).flatMap((page) => page.check_runs ?? (Array.isArray(page) ? page : [page])),
    listWorkflowRuns: (sha) => get(`repos/${repo}/actions/runs?head_sha=${assertSha(sha)}&per_page=100`, { paginate: true }).flatMap((page) => page.workflow_runs ?? []),
    listBranches: () => get(`repos/${repo}/branches?per_page=100`, { paginate: true }),
  };
}

export function createGitAdapter({ runner = run, cwd } = {}) {
  const git = (args, options = {}) => runner("git", args, { cwd, ...options });
  const resolve = (ref) => { const result = git(["rev-parse", "--verify", "--quiet", `${assertRef(ref)}^{commit}`]); return result.code === 0 ? result.stdout.trim() : null; };
  return {
    resolve,
    isAncestor(a, b) { const result = git(["merge-base", "--is-ancestor", assertSha(a), assertSha(b)]); return result.code === 0 ? true : result.code === 1 ? false : null; },
    mergeBase(a, b) { const result = git(["merge-base", assertSha(a), assertSha(b)]); return result.code === 0 ? result.stdout.trim() : null; },
    revList(from, to) { const result = git(["rev-list", "--no-merges", `${assertSha(from)}..${assertSha(to)}`]); return result.code === 0 ? result.stdout.split("\n").filter(Boolean) : null; },
    /** Kararlı patch-id kümesi (birleştirme commit'leri hariç). */
    patchIds(from, to) {
      const log = git(["log", "-p", "--no-merges", "--no-color", `${assertSha(from)}..${assertSha(to)}`], { timeoutMs: 300_000 });
      if (log.code !== 0) return null;
      if (!log.stdout.trim()) return [];
      const ids = git(["patch-id", "--stable"], { input: log.stdout, timeoutMs: 300_000 });
      return ids.code === 0 ? ids.stdout.split("\n").filter(Boolean).map((line) => line.split(" ")[0]) : null;
    },
    changedFiles(base, head) { const result = git(["diff", "--name-only", `${assertSha(base)}...${assertSha(head)}`]); return result.code === 0 ? result.stdout.split("\n").filter(Boolean) : null; },
    /** Gerçek birleştirme yazmadan metin çakışması denetimi (git merge-tree --write-tree). */
    mergeTree(a, b) {
      const result = git(["merge-tree", "--write-tree", "--name-only", "--no-messages", assertSha(a), assertSha(b)], { timeoutMs: 300_000 });
      if (result.code === 0) return { clean: true, conflicts: [] };
      if (result.code === 1) return { clean: false, conflicts: result.stdout.split("\n").slice(1).filter(Boolean) };
      return null;
    },
    headSha: () => git(["rev-parse", "HEAD"]).stdout.trim(),
    statusPorcelain: () => git(["status", "--porcelain=v1"]).stdout,
    refsFingerprint: () => git(["for-each-ref", "--format=%(refname) %(objectname)", "refs/heads", "refs/remotes"]).stdout,
  };
}
