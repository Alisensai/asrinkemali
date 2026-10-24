// PR envanteri, V0.6'ya içerilme sınıflandırması ve bağımlılık grafiği (saf fonksiyonlar + git adaptörü).

export const INCLUSION = ["ancestor_included", "content_equivalent_likely", "partially_included", "not_included", "unknown"];

/**
 * PR'ın hedef dalda (ör. V0.6 başı) bulunma durumu.
 * - ancestor_included: PR başı hedefin atasıdır (geçmişte birebir var).
 * - content_equivalent_likely: tüm commit'lerin kararlı patch-id'si hedefte var (farklı SHA).
 * - partially_included: bir kısmı var. patch-id eşitliği tam semantik içerilmeyi kanıtlamaz.
 */
export function classifyInclusion(git, prHead, target) {
  if (!prHead || !target) return { status: "unknown", reason: "ref çözülemedi" };
  const ancestor = git.isAncestor(prHead, target);
  if (ancestor === null) return { status: "unknown", reason: "ata ilişkisi hesaplanamadı (sığ klon/eksik ref)" };
  if (ancestor) return { status: "ancestor_included", reason: "PR başı hedefin atası" };
  const base = git.mergeBase(prHead, target);
  if (!base) return { status: "unknown", reason: "ortak ata yok" };
  const prPatches = git.patchIds(base, prHead); const targetPatches = git.patchIds(base, target);
  if (prPatches === null || targetPatches === null) return { status: "unknown", reason: "patch-id hesaplanamadı" };
  if (prPatches.length === 0) return { status: "unknown", reason: "birleştirme dışı commit yok" };
  const present = new Set(targetPatches); const matched = prPatches.filter((id) => present.has(id)).length;
  if (matched === prPatches.length) return { status: "content_equivalent_likely", reason: `${matched}/${prPatches.length} patch-id hedefte`, matched, total: prPatches.length };
  if (matched > 0) return { status: "partially_included", reason: `${matched}/${prPatches.length} patch-id hedefte`, matched, total: prPatches.length };
  return { status: "not_included", reason: `0/${prPatches.length} patch-id hedefte`, matched: 0, total: prPatches.length };
}

/** Sürüm katmanı: dal adındaki vNN belirteci, yoksa taban dala göre. */
export function layerOf(pr) {
  const match = (pr.headRef ?? "").match(/v0?(\d{1,2})(?!\d)/i) ?? (pr.baseRef ?? "").match(/v0?(\d{1,2})(?!\d)/i);
  if (match) return `V0.${Number(match[1])}`;
  return pr.baseRef === "main" ? "main/V0.3" : "unknown";
}

/** Dal tabanlı kenarlar: B.baseRef === A.headRef ise A → B. Döngü ve eksik düğüm denetimli topolojik sıra. */
export function buildGraph(prs) {
  const byHead = new Map();
  for (const pr of prs) byHead.set(pr.headRef, [...(byHead.get(pr.headRef) ?? []), pr.number]);
  const edges = []; const externalBases = new Set();
  for (const pr of prs) {
    const parents = (byHead.get(pr.baseRef) ?? []).filter((parent) => parent !== pr.number);
    if (!parents.length) externalBases.add(pr.baseRef);
    for (const parent of parents) edges.push({ from: parent, to: pr.number, kind: "branch_base" });
  }
  return { nodes: prs.map((pr) => pr.number).sort((a, b) => a - b), edges: edges.sort((a, b) => a.from - b.from || a.to - b.to), externalBases: [...externalBases].sort() };
}

export function topologicalOrder(graph) {
  const incoming = new Map(graph.nodes.map((node) => [node, 0]));
  for (const edge of graph.edges) { if (!incoming.has(edge.from) || !incoming.has(edge.to)) throw new Error(`Grafikte eksik düğüm: #${edge.from} → #${edge.to}`); incoming.set(edge.to, incoming.get(edge.to) + 1); }
  const queue = graph.nodes.filter((node) => incoming.get(node) === 0).sort((a, b) => a - b); const order = [];
  while (queue.length) {
    const node = queue.shift(); order.push(node);
    for (const edge of graph.edges.filter((item) => item.from === node)) { incoming.set(edge.to, incoming.get(edge.to) - 1); if (incoming.get(edge.to) === 0) { queue.push(edge.to); queue.sort((a, b) => a - b); } }
  }
  if (order.length !== graph.nodes.length) { const cyclic = graph.nodes.filter((node) => !order.includes(node)); const error = new Error(`Bağımlılık grafiğinde döngü: ${cyclic.map((node) => `#${node}`).join(", ")}`); error.cycle = cyclic; throw error; }
  return order;
}

/** Bir PR'ın tüm üst zinciri (önce uygulanması gerekenler). */
export function ancestorsOf(graph, number) { const result = []; let frontier = [number]; while (frontier.length) { const next = graph.edges.filter((edge) => frontier.includes(edge.to)).map((edge) => edge.from); for (const item of next) if (!result.includes(item)) result.push(item); frontier = next; } return result; }

/** Uygulama sırası doğrulaması: bir PR, üst zincirindeki PR'lardan önce uygulanamaz. */
export function validateOrder(graph, sequence, includedInTarget = new Set()) {
  const problems = [];
  sequence.forEach((number, index) => { for (const ancestor of ancestorsOf(graph, number)) { const position = sequence.indexOf(ancestor); if (position > index) problems.push(`#${number}, bağımlı olduğu #${ancestor}'den önce uygulanıyor`); else if (position === -1 && !includedInTarget.has(ancestor)) problems.push(`#${number} için ön koşul #${ancestor} ne dizide ne hedef dalda`); } });
  return { ok: problems.length === 0, problems };
}

export function mermaid(graph, prs) {
  const label = (number) => { const pr = prs.find((item) => item.number === number); return `PR${number}["#${number} ${String(pr?.layer ?? "").replace(/"/g, "'")}"]`; };
  const lines = ["graph TD"]; for (const number of graph.nodes) lines.push(`  ${label(number)}`);
  for (const edge of graph.edges) lines.push(`  PR${edge.from} --> PR${edge.to}`);
  for (const pr of prs.filter((item) => item.inclusion?.status === "ancestor_included")) lines.push(`  class PR${pr.number} included`);
  lines.push("  classDef included fill:#e8f5e9,stroke:#2e7d32");
  return lines.join("\n");
}

/** Son baş SHA'ya ait kontrol koşularını iş akışı bazında özetler (eski SHA koşuları sayılmaz). */
export function summarizeChecks(checkRuns, headSha) {
  const relevant = checkRuns.filter((run) => !headSha || run.head_sha === headSha);
  const byName = {};
  for (const run of relevant) { const key = run.name; const state = run.status !== "completed" ? "pending" : (run.conclusion ?? "unknown"); const previous = byName[key]; if (!previous || (run.completed_at ?? "") > (previous.completedAt ?? "")) byName[key] = { state, completedAt: run.completed_at ?? null }; }
  const counts = { success: 0, failure: 0, pending: 0, cancelled: 0, skipped: 0, neutral: 0, other: 0 };
  for (const { state } of Object.values(byName)) counts[state in counts ? state : "other"] += 1;
  return { checks: Object.fromEntries(Object.entries(byName).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => [name, value.state])), counts };
}

/** PR manifest nesnesi; bilinmeyen alan tahminle doldurulmaz (null). */
export function manifestEntry(raw, detail, extra = {}) {
  return {
    number: raw.number, title: raw.title, state: raw.merged_at ? "merged" : raw.state, isDraft: Boolean(raw.draft), author: raw.user?.login ?? null,
    createdAt: raw.created_at ?? null, updatedAt: raw.updated_at ?? null, baseRef: raw.base?.ref ?? null, headRef: raw.head?.ref ?? null, baseSha: raw.base?.sha ?? null, headSha: raw.head?.sha ?? null,
    mergeable: detail?.mergeable === true ? "true" : detail?.mergeable === false ? "false" : "unknown", mergeableState: detail?.mergeable_state ?? null,
    commits: detail?.commits ?? null, changedFiles: detail?.changed_files ?? null, additions: detail?.additions ?? null, deletions: detail?.deletions ?? null,
    reviewStatus: detail?.requested_reviewers?.length ? "review_requested" : "no_review_recorded",
    checks: extra.checks ?? null, explicitDependencies: extra.explicitDependencies ?? [], discoveredDependencies: extra.discoveredDependencies ?? [],
    ancestryStatus: extra.inclusion?.status ?? "unknown", patchEquivalentStatus: extra.inclusion?.reason ?? null, inclusion: extra.inclusion ?? null,
    modules: extra.modules ?? [], riskCategory: extra.riskCategory ?? null, recommendedAction: extra.recommendedAction ?? null, blockers: extra.blockers ?? [],
    layer: null, lastCheckedAt: extra.lastCheckedAt ?? null,
  };
}

/** Açıklamadaki "#N" referansları yalnız YUMUŞAK kanıttır. */
export function referencedPrs(body, self) { return [...new Set([...String(body ?? "").matchAll(/(?:^|[^\w&])#(\d{1,4})\b/g)].map((match) => Number(match[1])).filter((number) => number !== self))].sort((a, b) => a - b); }
