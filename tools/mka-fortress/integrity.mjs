#!/usr/bin/env node
// MKA FORTRESS — arşiv bütünlüğü ve değişiklik tespiti (salt-okunur).
//
//   node tools/mka-fortress/integrity.mjs check                       veri bütünlüğü denetimi
//   node tools/mka-fortress/integrity.mjs manifest [--out=dosya]      içerik özeti manifesti
//   node tools/mka-fortress/integrity.mjs diff --base=git:REF|dosya   başlangıca göre değişiklik raporu
//        [--allow=izinler.json] [--ledger=onaylar.jsonl] [--mass-threshold=0.1]
//
// ÖNEMLİ: Bu araç değişikliği ÖNLEMEZ; TESPİT ve DENETİM içindir. Yazma yetkisi olan biri hem
// kaydı hem başlangıç manifestini değiştirebilir. Başlangıç, korumalı dal veya imzalı etiket gibi
// güvenilir bir Git referansından alınmalıdır (--base=git:REF).
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { approvedRecordIds, argument, gitHead, hostOf, isSafeHttpsUrl, loadArchive, recordHash, REPO_ROOT } from "./lib/common.mjs";

const SLUG = /^[a-z0-9-]{1,120}$/;

export function buildManifest({ records }, { ledgerIds = new Set(), head = null } = {}) {
  const entries = {};
  for (const { file, record } of records) entries[record.id] = { file, sha256: recordHash(record), sourceUrl: record.source?.url ?? null, status: record.verification?.status ?? null, humanApproved: ledgerIds.has(record.id) };
  return { schema: "mka-fortress/archive-manifest@1", gitHead: head, recordCount: records.length, records: entries };
}

/** Veri bütünlüğü denetimi: hata (yayını engelleyen) ve bilgi (editoryal) ayrı raporlanır. */
export function checkIntegrity({ records, parseErrors }, { ledgerIds = new Set() } = {}) {
  const errors = parseErrors.map((item) => ({ code: "JSON_PARSE", file: item.file, message: item.error }));
  const warnings = []; const info = {};
  const byId = new Map(); const bySlug = new Map();
  for (const { file, record } of records) {
    const id = record.id;
    if (byId.has(id)) errors.push({ code: "DUPLICATE_ID", file, id }); else byId.set(id, record);
    if (bySlug.has(record.slug)) errors.push({ code: "DUPLICATE_SLUG", file, id }); else bySlug.set(record.slug, record);
    if (!SLUG.test(record.slug ?? "")) errors.push({ code: "UNSAFE_SLUG", file, id });
    if (path.posix.basename(file) !== `${record.slug}.json`) errors.push({ code: "FILE_SLUG_MISMATCH", file, id });
    if (!isSafeHttpsUrl(record.source?.url)) errors.push({ code: "UNSAFE_SOURCE_URL", file, id });
    if (record.image?.url && !isSafeHttpsUrl(record.image.url)) errors.push({ code: "UNSAFE_IMAGE_URL", file, id });
    const status = record.verification?.status;
    if (!["draft", "reviewed", "published"].includes(status)) errors.push({ code: "UNKNOWN_STATUS", file, id });
    if (status !== "draft" && !(record.provenance ?? []).some((item) => item.url === record.source?.url)) errors.push({ code: "PROVENANCE_MISSING_SOURCE", file, id });
    const date = record.date ?? {};
    if (date.start && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(date.start)) errors.push({ code: "BAD_DATE_FORMAT", file, id });
    if (date.precision === "unknown" && date.start) warnings.push({ code: "DATE_PRECISION_INCONSISTENT", id });
    if (date.precision === "day" && date.start && date.start.length !== 10) warnings.push({ code: "DATE_PRECISION_INCONSISTENT", id });
    if (date.certainty === "estimated") warnings.push({ code: "DATE_ESTIMATED", id });
    if (["unknown", "permission_required"].includes(record.rights?.status)) warnings.push({ code: "RIGHTS_UNCERTAIN", id });
    // Yalnız bağlantı verilebilen görselde kaynak, kurumun bağlam/kredi sayfası olmalı; ham medya dosyası değil.
    if (record.rights?.imageReuse === "link_only" && /\.(jpe?g|png|webp|gif|tiff?)(\?|$)/i.test(record.source?.url ?? "")) warnings.push({ code: "LINK_ONLY_SOURCE_IS_MEDIA_FILE", id, status, suggestion: record.image?.sourcePageUrl ?? null });
  }
  for (const { record } of records) for (const related of record.relatedIds ?? []) {
    if (!byId.has(related)) errors.push({ code: "DANGLING_RELATION", id: record.id, related });
    else if (record.verification?.status === "published" && byId.get(related).verification?.status !== "published") errors.push({ code: "PUBLISHED_RELATES_TO_UNPUBLISHED", id: record.id, related });
  }
  const published = records.filter(({ record }) => record.verification?.status === "published");
  info.total = records.length;
  info.byStatus = Object.fromEntries(["published", "reviewed", "draft"].map((status) => [status, records.filter(({ record }) => record.verification?.status === status).length]));
  // Teknik "published" insan onayı DEĞİLDİR: onay yalnız defterdeki insan olaylarından okunur.
  info.publishedWithoutHumanApproval = published.filter(({ record }) => !ledgerIds.has(record.id)).length;
  info.humanApproved = records.filter(({ record }) => ledgerIds.has(record.id)).length;
  return { ok: errors.length === 0, errors, warnings, info };
}

/** Başlangıç ile güncel manifest arasındaki farkları sınıflandırır. */
export function diffManifests(base, current, { allow = {}, massThreshold = 0.1 } = {}) {
  const changes = [];
  for (const [id, now] of Object.entries(current.records)) {
    const before = base.records[id];
    if (!before) { changes.push({ id, kind: "added", file: now.file }); continue; }
    if (before.sha256 === now.sha256) continue;
    const change = { id, kind: "modified", file: now.file };
    if (before.sourceUrl !== now.sourceUrl) { change.sourceUrlChanged = true; change.sourceHostChanged = hostOf(before.sourceUrl) !== hostOf(now.sourceUrl); }
    if (before.status !== now.status) change.statusChanged = `${before.status} → ${now.status}`;
    if (before.humanApproved || now.humanApproved) change.reReviewRequired = true;
    changes.push(change);
  }
  for (const [id, before] of Object.entries(base.records)) if (!current.records[id]) changes.push({ id, kind: "removed", file: before.file, reReviewRequired: before.humanApproved || undefined });
  for (const change of changes) { const reason = allow[change.id]; change.authorized = typeof reason === "string" && reason.trim().length >= 8; if (change.authorized) change.authorization = reason; }
  const denominator = Math.max(1, Object.keys(base.records).length);
  const massChange = changes.length / denominator > massThreshold;
  const unexpected = changes.filter((change) => !change.authorized);
  return { baseHead: base.gitHead, currentHead: current.gitHead, total: changes.length, unexpected: unexpected.length, reReviewRequired: changes.filter((change) => change.reReviewRequired).length, sourceUrlChanges: changes.filter((change) => change.sourceUrlChanged).length, massChange, massThreshold, changes };
}

function loadBase(spec, ledgerIds) {
  if (typeof spec !== "string") throw new Error("--base=git:REF veya --base=manifest.json gerekli.");
  if (spec.startsWith("git:")) { const ref = spec.slice(4); return buildManifest(loadArchive({ ref }), { ledgerIds, head: ref }); }
  const manifest = JSON.parse(readFileSync(spec, "utf8"));
  if (manifest.schema !== "mka-fortress/archive-manifest@1") throw new Error("Tanınmayan manifest şeması.");
  return manifest;
}

export function main(argv) {
  const [command] = argv;
  const ledgerPath = argument(argv, "ledger");
  const ledgerIds = approvedRecordIds(typeof ledgerPath === "string" ? ledgerPath : null);
  const current = loadArchive();
  if (command === "check") { const result = checkIntegrity(current, { ledgerIds }); console.log(JSON.stringify(result, null, 2)); return result.ok ? 0 : 1; }
  if (command === "manifest") {
    const manifest = buildManifest(current, { ledgerIds, head: gitHead() });
    const out = argument(argv, "out");
    if (typeof out === "string") {
      const resolved = path.resolve(out);
      // Arşiv dizinlerine yazmayı reddet: araç kayıt dosyalarını asla değiştirmez.
      if (["content", "data"].some((directory) => resolved.startsWith(path.join(REPO_ROOT, directory) + path.sep))) throw new Error("Manifest arşiv veri dizinlerine yazılamaz.");
      writeFileSync(resolved, `${JSON.stringify(manifest, null, 2)}\n`);
      console.log(`Manifest yazıldı: ${resolved} (${manifest.recordCount} kayıt)`);
    } else console.log(JSON.stringify(manifest, null, 2));
    return 0;
  }
  if (command === "diff") {
    const base = loadBase(argument(argv, "base"), ledgerIds);
    const allowPath = argument(argv, "allow");
    const report = diffManifests(base, buildManifest(current, { ledgerIds, head: gitHead() }), { allow: typeof allowPath === "string" ? JSON.parse(readFileSync(allowPath, "utf8")) : {}, massThreshold: Number(argument(argv, "mass-threshold", "0.1")) });
    console.log(JSON.stringify(report, null, 2));
    return report.unexpected || report.reReviewRequired || report.massChange ? 1 : 0;
  }
  console.error("Kullanım: integrity.mjs check | manifest [--out=dosya] | diff --base=git:REF|manifest.json [--allow=dosya] [--ledger=dosya]");
  return 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) process.exitCode = main(process.argv.slice(2));
