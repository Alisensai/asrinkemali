// 30 görevlik entegrasyon sözleşmesi: makine okunur görev manifesti ve durum modeli.

export const TASK_STATUSES = ["PLANNED", "IN_PROGRESS", "PR_OPEN", "CI_PENDING", "CI_FAILED", "TECHNICALLY_VALIDATED", "HUMAN_REVIEW_REQUIRED", "INTEGRATION_READY", "INTEGRATED_IN_REHEARSAL", "MERGED_WITH_APPROVAL", "BLOCKED"];
/** İzinli geçişler. INTEGRATED_IN_REHEARSAL gerçek birleştirme değildir; MERGED_WITH_APPROVAL yalnız insan onayıyla. */
export const TRANSITIONS = {
  PLANNED: ["IN_PROGRESS", "BLOCKED"], IN_PROGRESS: ["PR_OPEN", "BLOCKED"], PR_OPEN: ["CI_PENDING", "BLOCKED"],
  CI_PENDING: ["CI_FAILED", "TECHNICALLY_VALIDATED"], CI_FAILED: ["CI_PENDING", "BLOCKED"],
  TECHNICALLY_VALIDATED: ["HUMAN_REVIEW_REQUIRED", "INTEGRATION_READY", "CI_PENDING"], HUMAN_REVIEW_REQUIRED: ["INTEGRATION_READY", "BLOCKED"],
  INTEGRATION_READY: ["INTEGRATED_IN_REHEARSAL", "BLOCKED"], INTEGRATED_IN_REHEARSAL: ["MERGED_WITH_APPROVAL", "BLOCKED", "INTEGRATION_READY"],
  MERGED_WITH_APPROVAL: [], BLOCKED: ["PLANNED", "IN_PROGRESS"],
};
export const canTransition = (from, to) => (TRANSITIONS[from] ?? []).includes(to);

const FIELDS = ["id", "number", "assignedAgent", "title", "plannedBranch", "baseBranch", "targetPrBranch", "dependencyPrs", "dependencyPrompts", "ownedPaths", "forbiddenPaths", "acceptanceTests", "status", "resultingPr", "resultingSha", "reportPath", "blockers", "lastUpdatedAt", "sourceEvidence"];
const V06 = "integration/asrinkemali-v06-release-candidate";
const COMMON_FORBIDDEN = ["content/archive/", "data/archive/", "tools/release-check/", "tools/editorial-review/forms/"];

// [no, ajan, başlık, sahip olunan yollar, bağımlı PR'lar, bağımlı promptlar]
const SEED = [
  [1, "CLAUDE", "PR denetimi ve entegrasyon kontrol düzlemi", ["tools/integration-control/", "docs/integration-control/"], [22, 25, 28], []],
  [2, "COPILOT", "Kilo QA modernizasyonu", ["qa/", "web/e2e/kilo-v06/"], [13], [1]],
  [3, "COPILOT", "Codex yayın motoru entegrasyonu", ["web/lib/publishing/", "scripts/publishing/"], [21, 25], [1]],
  [4, "CLAUDE", "Uzman/editör insan onayı ve yayın kapıları", ["tools/approval-gates/", "web/lib/approval/"], [12, 15, 26], [1]],
  [5, "COPILOT", "OpenCode kaynak güvenilirliği", ["tools/source-reliability/"], [20, 14], [1]],
  [6, "COPILOT", "OpenCode Authority Registry", ["tools/authority-registry/"], [20], [5]],
  [7, "CLAUDE", "Perplexity Evidence Engine", ["tools/historical-research/", "web/lib/evidence/"], [19, 14], [5, 6]],
  [8, "CLAUDE", "Perplexity Evidence Workbench", ["tools/evidence-workbench/"], [24, 19], [7]],
  [9, "COPILOT", "Google AI Studio kaynak içe aktarma", ["tools/source-import/"], [], [5]],
  [10, "COPILOT", "DeepSeek Türkçe arama V2", ["web/lib/search/"], [], [1]],
  [11, "COPILOT", "Qwen kayıt önerileri", ["web/lib/recommendations/"], [], [10]],
  [12, "COPILOT", "Cohere arama değerlendirme", ["tools/search-eval/"], [], [10]],
  [13, "COPILOT", "Meta koleksiyon backend'i", ["web/lib/collections/"], [], [1]],
  [14, "COPILOT", "V0.8 Control Center tamamlamaları", ["web/app/yonetim/", "web/lib/admin-v08/"], [26, 28], [4]],
  [15, "CLAUDE", "Backend sürüm adayı entegrasyonu", ["docs/integration/"], [], [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]],
  [16, "ANTIGRAVITY", "Tasarım sistemi", ["web/app/globals.css", "web/components/ui/"], [23], [1]],
  [17, "ANTIGRAVITY", "Ana sayfa ve global navigasyon", ["web/components/home/", "web/components/Navigation.tsx"], [23], [16]],
  [18, "ANTIGRAVITY", "Arşiv vitrini ve müze deneyimi", ["web/app/arsiv/"], [23, 27], [16]],
  [19, "ANTIGRAVITY", "Atatürk yaşam deneyimi", ["web/components/ataturk-experience/"], [17, 25], [16]],
  [20, "ANTIGRAVITY", "Kimi tarihî dönemler", ["web/app/donemler/"], [], [16]],
  [21, "ANTIGRAVITY", "Gemini Atlas ZIP/patch inceleme", ["docs/atlas/"], [], [1]],
  [22, "ANTIGRAVITY", "Gemini Atlas uygulama entegrasyonu", ["web/app/atlas/", "web/lib/atlas/"], [], [21]],
  [23, "ANTIGRAVITY", "Mistral belge karşılaştırma", ["web/app/karsilastir/"], [], [16]],
  [24, "ANTIGRAVITY", "Meta koleksiyon arayüzü", ["web/app/koleksiyonlar/"], [], [13, 16]],
  [25, "ANTIGRAVITY", "AnyCoder sergi prototipi değerlendirme", ["docs/exhibitions/"], [27], [16]],
  [26, "ANTIGRAVITY", "Immersive Museum PR #27 geliştirme", ["web/app/sergiler/", "web/components/exhibitions/"], [27, 23], [16]],
  [27, "ANTIGRAVITY", "Yayınlar/Tarihte Bugün premium deneyim", ["web/app/yayinlar/", "web/app/tarihte-bugun/"], [21], [3, 16]],
  [28, "ANTIGRAVITY", "Perplexity araştırma paneli", ["web/app/arastirma/"], [24], [8, 16]],
  [29, "ANTIGRAVITY", "Qwen Keşfet ekranı", ["web/app/kesfet/"], [], [11, 16]],
  [30, "ANTIGRAVITY", "Görsel E2E/erişilebilirlik finali", ["web/e2e/visual/"], [], [16, 17, 18, 19, 26, 27, 28, 29]],
];

export function seedTasks(now = null) {
  return SEED.map(([number, agent, title, ownedPaths, dependencyPrs, dependencyPrompts]) => ({
    id: `MKA-${String(number).padStart(2, "0")}`, number, assignedAgent: agent, title,
    plannedBranch: number === 1 ? "feature/claude-v07-integration-control-plane" : null, baseBranch: V06, targetPrBranch: V06,
    dependencyPrs, dependencyPrompts, ownedPaths, forbiddenPaths: COMMON_FORBIDDEN, acceptanceTests: ["lint", "typecheck", "unit", "build", "production-e2e"],
    status: number === 1 ? "IN_PROGRESS" : "PLANNED", resultingPr: null, resultingSha: null, reportPath: null,
    blockers: number === 15 ? ["#03–#14 sonuçları PR ve testlerle doğrulanmadan başlamaz"] : [], lastUpdatedAt: now, sourceEvidence: "MKA Multi-Agent Delivery Plan v1.0 + GOREV_LISTESI.json",
  }));
}

/** Şema doğrulaması: zorunlu alanlar, durum, numara benzersizliği, bağımlılık döngüsü, yol sahipliği çakışması. */
export function validateTasks(tasks) {
  const errors = [];
  const numbers = new Set();
  for (const task of tasks) {
    for (const field of FIELDS) if (!(field in task)) errors.push(`${task.id ?? "?"}: ${field} eksik`);
    if (!TASK_STATUSES.includes(task.status)) errors.push(`${task.id}: geçersiz durum ${task.status}`);
    if (numbers.has(task.number)) errors.push(`${task.id}: yinelenen görev numarası`); numbers.add(task.number);
    for (const dependency of task.dependencyPrompts ?? []) if (dependency >= task.number && !(task.number === 15)) errors.push(`${task.id}: kendisinden sonraki görev #${dependency}'e bağımlı`);
    if (task.status === "MERGED_WITH_APPROVAL" && !task.resultingPr) errors.push(`${task.id}: birleşti diyor ama PR yok`);
  }
  // Yol sahipliği: bir görevin yolu, başka bir görevin yoluyla aynı veya onun alt/üst dizini olmamalı.
  const owners = [];
  for (const task of tasks) for (const owned of task.ownedPaths ?? []) {
    for (const previous of owners) if (previous.task !== task.id && (owned === previous.path || owned.startsWith(previous.path) || previous.path.startsWith(owned))) errors.push(`yol sahipliği örtüşmesi: ${task.id} (${owned}) ↔ ${previous.task} (${previous.path})`);
    owners.push({ task: task.id, path: owned });
  }
  return { ok: errors.length === 0, errors };
}
