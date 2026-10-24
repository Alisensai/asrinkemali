// Değişen dosya kümelenmesi, PR×PR kesişim matrisi ve semantik sözleşme riskleri.

export const CATEGORIES = [
  ["J", "test/derleme/CI", /^(\.github\/workflows\/|web\/playwright[^/]*\.ts$|web\/package(-lock)?\.json$|package(-lock)?\.json$|web\/next\.config\.ts$|web\/proxy\.ts$|web\/middleware\.ts$|web\/tsconfig\.json$|web\/eslint\.config)/],
  ["E", "yönetim/yetki", /^web\/(app\/(yonetim|admin)|lib\/(admin|auth|security)|lib\/admin-v08)/],
  ["D", "yayın motoru", /^(web\/(lib\/publishing|app\/(yayinlar|tarihte-bugun))|content\/publications|scripts\/publishing)/],
  ["F", "sergiler", /^web\/(app\/sergiler|components\/exhibitions|lib\/exhibitions?)/],
  ["G", "atlas", /^web\/(app\/atlas|lib\/atlas)/],
  ["H", "kanıt/kaynak güvenilirliği", /(historical-research|source-reliability|authority-registry|evidence)/i],
  ["I", "arşiv şeması/betikleri", /^(schemas\/|scripts\/archive\/|content\/archive\/|data\/archive\/)/],
  ["B", "arşiv uygulaması", /^web\/(app\/arsiv|lib\/archive)/],
  ["C", "Atatürk/kronoloji", /^web\/(app\/(ataturk|kronoloji)|components\/ataturk-experience|lib\/ataturk)/],
  ["A", "genel yerleşim/stil/ana sayfa", /^web\/(app\/(globals\.css|layout\.tsx|page\.tsx|not-found|error)|components\/(SiteHeader|Masthead|Navigation|Hero|Footer|home\/)|app\/[^/]+\.module\.css$)/],
  ["K", "belge/rapor", /^(docs\/|.*\.md$)/],
];
export function categorize(file) { for (const [code, , pattern] of CATEGORIES) if (pattern.test(file)) return code; return "other"; }
const BINARY_SCREENSHOT = /^docs\/screenshots\/.*\.(png|jpe?g|webp)$/i;

/** Kesişim matrisi: gerçek ortak dosya ile yalnız aynı kategori/dizin ayrı tutulur. */
export function collisionMatrix(filesByPr) {
  const numbers = Object.keys(filesByPr).map(Number).sort((a, b) => a - b); const pairs = [];
  for (let i = 0; i < numbers.length; i += 1) for (let j = i + 1; j < numbers.length; j += 1) {
    const a = new Set(filesByPr[numbers[i]]); const shared = filesByPr[numbers[j]].filter((file) => a.has(file)).sort();
    const dirs = (files) => new Set(files.map((file) => file.split("/").slice(0, -1).join("/")));
    const dirA = dirs(filesByPr[numbers[i]]); const sharedDirs = [...dirs(filesByPr[numbers[j]])].filter((dir) => dirA.has(dir) && dir);
    if (!shared.length && !sharedDirs.length) continue;
    pairs.push({ a: numbers[i], b: numbers[j], sharedFiles: shared, sharedCodeFiles: shared.filter((file) => !BINARY_SCREENSHOT.test(file) && categorize(file) !== "K"), sharedScreenshots: shared.filter((file) => BINARY_SCREENSHOT.test(file)), sameDirectoryOnly: shared.length === 0, sharedCategories: [...new Set(shared.map(categorize))].sort() });
  }
  return pairs;
}

/** Gerekçeli risk düzeyi: dosya sayısı tek belirleyici değildir. */
export function rateRisk(pair, textual) {
  const reasons = [];
  if (textual && textual.clean === false) reasons.push(`metin çakışması: ${textual.conflicts.slice(0, 5).join(", ")}`);
  const critical = pair.sharedCodeFiles.filter((file) => ["E", "I", "J", "D"].includes(categorize(file)));
  if (critical.length) reasons.push(`kritik alanda ortak dosya: ${critical.slice(0, 5).join(", ")}`);
  if (pair.sharedScreenshots.length) reasons.push(`${pair.sharedScreenshots.length} ortak ekran görüntüsü (yeniden üretim/üzerine yazma riski)`);
  let level = "low";
  if (pair.sharedCodeFiles.length || pair.sharedScreenshots.length) level = "medium";
  if (critical.length) level = "high";
  if (textual && textual.clean === false && textual.conflicts.some((file) => !BINARY_SCREENSHOT.test(file) && categorize(file) !== "K")) level = critical.length || textual.conflicts.some((file) => ["E", "I", "J", "D", "B"].includes(categorize(file))) ? "critical" : "high";
  if (pair.sameDirectoryOnly) reasons.push("yalnız aynı dizin (ortak dosya yok)");
  return { level, reasons };
}

/**
 * Semantik sözleşme kuralları: metin birleştirmesi temiz olsa bile birlikte çalışmayı bozabilecek durumlar.
 * Girdi: PR → değişen dosyalar ve isteğe bağlı eklenen satırlar (diff +satırları).
 */
export const SEMANTIC_RULES = [
  { id: "schema-version", owner: "Prompt 05/06 (OpenCode) + 15", test: ({ files }) => files.some((file) => /^schemas\//.test(file)), message: "Arşiv/yayın şeması değişiyor; ArchiveRecord 1.0.0/1.1.0 uyumluluğu ve tüm okuyucular doğrulanmalı." },
  { id: "archive-data", owner: "Prompt 05/06 (OpenCode)", test: ({ files }) => files.some((file) => /^(content|data)\/archive\//.test(file)), message: "Arşiv kayıtları değişiyor; mka-fortress integrity diff ile kaynak URL/onay değişikliği incelenmeli." },
  { id: "admin-vs-failclosed-proxy", owner: "Prompt 14 (Control Center) + Claude Fortress", test: ({ files }) => files.some((file) => /^web\/app\/(yonetim|admin)\//.test(file)), message: "Yönetim rotası ekleniyor; PR #28 proxy'si kayıtlı kimlik sağlayıcı yokken /yonetim ve /admin'i 404 yapar (bilinçli kapalı-başarısız). Panel ancak gerçek AuthenticationProvider ile açılmalı." },
  { id: "proxy-or-middleware", owner: "Claude Fortress", test: ({ files }) => files.some((file) => /^web\/(proxy|middleware)\.ts$/.test(file)), message: "İstek katmanı (proxy/middleware) değişiyor; tek dosya olabilir, birden çok PR aynı dosyayı yazıyorsa elle birleştirilmeli." },
  { id: "next-config-headers", owner: "Claude Fortress", test: ({ files }) => files.includes("web/next.config.ts"), message: "next.config.ts değişiyor; CSP/güvenlik başlıkları ve dev/prod farkı korunmalı." },
  { id: "lockfile", owner: "Prompt 15", test: ({ files }) => files.some((file) => /package-lock\.json$/.test(file)), message: "Kilit dosyası değişiyor; tek doğru kilit yeniden üretilmeli, iki tarafın kilidi birleştirilmemeli." },
  { id: "published-is-not-approval", owner: "Prompt 04", test: ({ added }) => /status\s*===?\s*["']published["'][^\n]*(approved|onay)|isApproved\s*=\s*[^\n]*published/i.test(added), message: "Teknik 'published' durumu insan onayı gibi kullanılıyor olabilir; onay yalnız insan olaylarından okunmalı." },
  { id: "id-vs-slug", owner: "Prompt 15", test: ({ added }) => /getPublishedArchiveRecord\(\s*[^)]*\.id\b|relatedIds?[^\n]*getPublishedArchiveRecord\(/i.test(added), message: "Kimlik değeri slug araması ile çözülüyor olabilir (id==slug tesadüfüne dayanma)." },
  { id: "wrong-archive-route", owner: "Antigravity", test: ({ added }) => /["'`]\/archive\//.test(added), message: "/arsiv yerine /archive rotası kullanılıyor olabilir." },
  { id: "autopublish-fail-open", owner: "Prompt 03/04", test: ({ added }) => /(cron|setInterval|schedule)[^\n]*(publish|yayınla)/i.test(added), message: "Otomatik yayın/zamanlayıcı ekleniyor olabilir; dry-run ve insan onayı kapısı korunmalı." },
  { id: "use-client-server-only", owner: "Prompt 15", test: ({ added }) => /^\+?\s*["']use client["'][\s\S]*from\s+["']@\/lib\/archive["']/m.test(added), message: "İstemci bileşeni sunucuya özel arşiv modülünü içe aktarıyor olabilir." },
  { id: "screenshots", owner: "Prompt 02/30", test: ({ files }) => files.filter((file) => BINARY_SCREENSHOT.test(file)).length >= 10, message: "Çok sayıda ekran görüntüsü commitleniyor; testler bunları yeniden üretir ve PR'lar arasında üzerine yazma riski doğar." },
];

export function semanticRisks(prNumber, files, added = "") {
  return SEMANTIC_RULES.filter((rule) => { try { return rule.test({ files, added }); } catch { return false; } }).map((rule) => ({ pr: prNumber, rule: rule.id, owner: rule.owner, message: rule.message, evidence: rule.id === "screenshots" ? `${files.filter((file) => BINARY_SCREENSHOT.test(file)).length} ekran görüntüsü` : files.filter((file) => rule.test({ files: [file], added: "" })).slice(0, 5) }));
}

/** Aynı semantik kuralı tetikleyen PR'lar birlikte riskli: çakışma adayı. */
export function crossPrSemanticConflicts(risksByPr) {
  const byRule = {};
  for (const risk of risksByPr.flat()) (byRule[risk.rule] ??= new Set()).add(risk.pr);
  const conflicts = Object.entries(byRule).filter(([, prs]) => prs.size > 1).map(([rule, prs]) => ({ rule, prs: [...prs].sort((a, b) => a - b) }));
  // Farklı kurallar arası bilinen etkileşim: yönetim rotası ekleyen PR × istek katmanını (proxy) değiştiren PR.
  for (const admin of byRule["admin-vs-failclosed-proxy"] ?? []) for (const proxy of byRule["proxy-or-middleware"] ?? []) if (admin !== proxy) conflicts.push({ rule: "admin-route-intercepted-by-proxy", prs: [admin, proxy].sort((a, b) => a - b), note: "Proxy yönetim rotasını uygulamaya ulaşmadan yanıtlayabilir; panelin kendi erişim reddi sayfası ve testleri etkilenir." });
  return conflicts.sort((a, b) => a.rule.localeCompare(b.rule) || a.prs[0] - b.prs[0]);
}
