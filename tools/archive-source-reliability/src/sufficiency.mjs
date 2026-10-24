/**
 * Kaynak yeterliliği denetimi.
 *
 * Her kayıt için kaynak URL'si, künye, kurum kimliği, provenans, tarih ve hak
 * doğrulaması ile türe özgü kanıtları puanlar. Bu bir editöryel kalite
 * göstergesidir; tarihsel doğruluk garantisi değildir.
 */

import { canonicalizeUrl, countBy, parseIsoDate, round, sortBy, toSortedEntries } from "./util.mjs";

const CHECKS = Object.freeze([
  { key: "sourceUrl", label: "Kaynak URL'si var", weight: 20 },
  { key: "citation", label: "Kaynak künyesi var", weight: 15 },
  { key: "identifier", label: "Kurum/arşiv kimliği var", weight: 10 },
  { key: "provenanceMatch", label: "Provenans kaynakla eşleşiyor", weight: 10 },
  { key: "dateVerified", label: "Tarih doğrulaması işaretli", weight: 15 },
  { key: "sourceReachable", label: "Kaynak erişimi doğrulaması işaretli", weight: 10 },
  { key: "rightsKnown", label: "Hak durumu bilinir", weight: 10 },
  { key: "typeEvidence", label: "Türe özgü kanıt tam", weight: 10 },
]);

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function typeEvidence(record) {
  const image = record.image;
  const source = record.source ?? {};
  const date = record.date ?? {};
  switch (record.type) {
    case "photograph":
      return {
        passed:
          Boolean(image) &&
          image.kind === "digitized_original" &&
          hasText(image.sourcePageUrl) &&
          hasText(image.displayPolicy),
        detail: "Fotoğraf için görsel nesnesi, kaynak sayfası ve gösterim politikası gerekir.",
      };
    case "document":
      return {
        passed: hasText(source.archiveIdentifier) || hasText(source.citation),
        detail: "Belge için arşiv kimliği veya künye gerekir.",
      };
    case "publication":
      return {
        passed: hasText(source.citation) && (hasText(source.publishedAt) || hasText(source.archiveIdentifier)),
        detail: "Yayın için künye ve yayın tarihi/arşiv kimliği gerekir.",
      };
    case "speech":
      return {
        passed: record.quotation?.verified === true || (hasText(source.citation) && hasText(record.description)),
        detail: "Konuşma için doğrulanmış alıntı veya künye + açıklama gerekir.",
      };
    case "event":
      return {
        passed: Boolean(parseIsoDate(date.start)) && ["day", "range"].includes(date.precision),
        detail: "Olay için gün veya aralık hassasiyetinde tarih gerekir.",
      };
    case "place":
      return {
        passed: Array.isArray(record.locations) && record.locations.length > 0,
        detail: "Mekân için en az bir konum kaydı gerekir.",
      };
    default:
      return { passed: hasText(source.citation), detail: "Bilinmeyen tür için künye aranır." };
  }
}

function provenanceMatchesSource(record) {
  const sourceUrl = canonicalizeUrl(record.source?.url);
  const sourceIdentifier = String(record.source?.archiveIdentifier ?? "").toLowerCase();
  if (!sourceUrl) return false;
  return (record.provenance ?? []).some((item) => {
    if (canonicalizeUrl(item?.url) === sourceUrl) return true;
    const identifier = String(item?.identifier ?? "").toLowerCase();
    return Boolean(sourceIdentifier && identifier && sourceIdentifier === identifier);
  });
}

export function auditRecordSufficiency(record) {
  const source = record.source ?? {};
  const checks = record.verification?.checks ?? {};
  const evidence = typeEvidence(record);
  const values = {
    sourceUrl: hasText(source.url),
    citation: hasText(source.citation),
    identifier: hasText(source.archiveIdentifier),
    provenanceMatch: provenanceMatchesSource(record),
    dateVerified: checks.dateVerified === true,
    sourceReachable: checks.sourceReachable === true,
    rightsKnown: ["public_domain", "open_license", "official_link_only", "institutional_terms", "ai_representative"].includes(
      record.rights?.status
    ),
    typeEvidence: evidence.passed,
  };
  const rows = CHECKS.map((check) => ({
    ...check,
    passed: Boolean(values[check.key]),
    earned: values[check.key] ? check.weight : 0,
    detail: check.key === "typeEvidence" ? evidence.detail : null,
  }));
  const score = rows.reduce((total, row) => total + row.earned, 0);
  const scoreLevel = score >= 85 ? "strong" : score >= 70 ? "adequate" : score >= 50 ? "partial" : "weak";
  const caps = [];
  const cap = (level, reason) => caps.push({ level, reason });
  if (!values.sourceUrl) cap("partial", "Kaynak URL'si yok.");
  if (!values.citation) cap("partial", "Kaynak künyesi yok.");
  if (!values.provenanceMatch) cap("adequate", "Provenans kaynakla eşleşmiyor.");
  if (!values.dateVerified) cap("adequate", "Tarih doğrulaması işaretli değil.");
  if (!values.sourceReachable) cap("adequate", "Kaynak erişimi doğrulaması işaretli değil.");
  if (!values.rightsKnown) cap("adequate", "Hak durumu bilinmiyor veya izin gerektiriyor.");
  if (!values.typeEvidence) cap("adequate", "Türe özgü kanıt eksik.");
  const LEVEL_RANK = { weak: 0, partial: 1, adequate: 2, strong: 3 };
  let level = scoreLevel;
  for (const item of caps) {
    if (LEVEL_RANK[item.level] < LEVEL_RANK[level]) level = item.level;
  }
  return {
    recordId: record.id ?? null,
    title: record.title ?? null,
    type: record.type ?? null,
    status: record.verification?.status ?? null,
    schemaVersion: record.schemaVersion ?? null,
    institution: source.institution ?? null,
    institutionType: source.institutionType ?? null,
    sourceUrl: source.url ?? null,
    citation: source.citation ?? null,
    archiveIdentifier: source.archiveIdentifier ?? null,
    score,
    scoreLevel,
    level,
    caps,
    checks: rows,
    deficits: rows.filter((row) => !row.passed).map((row) => ({ key: row.key, label: row.label, weight: row.weight, detail: row.detail })),
    flags: {
      officialInstitution: ["official", "institutional", "archive", "library", "academic"].includes(source.institutionType),
      duplicateChecked: checks.duplicateChecked === true,
      quoteVerified: checks.quoteVerified === true,
      rightsVerified: checks.rightsVerified === true,
      hasImage: Boolean(record.image),
    },
  };
}

export function auditSourceSufficiency(records) {
  const rows = sortBy(
    records.map((record) => auditRecordSufficiency(record)),
    (a, b) => a.score - b.score || String(a.recordId).localeCompare(String(b.recordId), "tr")
  );
  const averageScore = rows.length > 0 ? round(rows.reduce((total, row) => total + row.score, 0) / rows.length, 2) : null;
  const byLevel = toSortedEntries(countBy(rows, (row) => row.level));
  const byType = [...countBy(rows, (row) => row.type ?? "(bilinmiyor)").entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "tr"))
    .map(([type, count]) => {
      const typeRows = rows.filter((row) => (row.type ?? "(bilinmiyor)") === type);
      return {
        type,
        count,
        averageScore: typeRows.length > 0 ? round(typeRows.reduce((total, row) => total + row.score, 0) / typeRows.length, 2) : null,
      };
    });
  const deficitCounts = countBy(rows.flatMap((row) => row.deficits), (deficit) => deficit.key);

  return {
    schemaVersion: "1.0.0",
    rubric: {
      maxScore: 100,
      levels: {
        strong: "85-100 ve hiçbir kritik bileşen eksik değil: temel kaynak bileşenleri tam.",
        adequate: "70-84 veya kritik olmayan bir bileşen eksik: kullanılabilir; bazı bileşenler eksik.",
        partial: "50-69 veya kaynak URL'si/künyesi yok: uzman incelemesi ve kaynak tamamlama gerekir.",
        weak: "0-49: yayın için yetersiz kaynak riski.",
      },
      caps:
        "Kaynak URL'si veya künyesi yoksa düzey en fazla 'partial'; provenans, tarih/erişim doğrulaması, hak durumu veya türe özgü kanıt eksikse en fazla 'adequate' olur.",
      note: "Puan, tarihsel doğruluk veya uzman onayı değildir.",
    },
    summary: {
      totalRecords: rows.length,
      averageScore,
      byLevel,
      byType,
      strongRecords: rows.filter((row) => row.level === "strong").length,
      adequateRecords: rows.filter((row) => row.level === "adequate").length,
      partialRecords: rows.filter((row) => row.level === "partial").length,
      weakRecords: rows.filter((row) => row.level === "weak").length,
      belowAdequate: rows.filter((row) => row.level === "partial" || row.level === "weak").length,
      belowAdequateByScore: rows.filter((row) => row.score < 70).length,
      cappedRecords: rows.filter((row) => row.caps.length > 0).length,
      citationMissing: rows.filter((row) => !row.checks.find((check) => check.key === "citation")?.passed).length,
      sourceUrlMissing: rows.filter((row) => !row.checks.find((check) => check.key === "sourceUrl")?.passed).length,
      deficitCounts: toSortedEntries(deficitCounts),
    },
    records: rows,
  };
}
