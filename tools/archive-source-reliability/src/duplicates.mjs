/**
 * Aynı resmî kaynağa bağlı birden fazla kaydı bulur.
 *
 * Dört katman:
 *  1. Birebir aynı `source.url`
 *  2. URL normalizasyonundan sonra aynı kaynak
 *  3. Aynı kurum + arşiv kimliği (ör. AYK-878)
 *  4. Aynı provenans kurumu + kimliği
 */

import {
  canonicalizeUrl,
  countBy,
  foldTr,
  normalizeSourceIdentifier,
  normalizeWhitespace,
  sortBy,
} from "./util.mjs";

function recordSummary(record) {
  return {
    recordId: record.id ?? null,
    title: record.title ?? null,
    type: record.type ?? null,
    status: record.verification?.status ?? null,
    dateStart: record.date?.start ?? null,
    dateEnd: record.date?.end ?? null,
    sourceUrl: record.source?.url ?? null,
    institution: record.source?.institution ?? null,
    institutionType: record.source?.institutionType ?? null,
    archiveIdentifier: record.source?.archiveIdentifier ?? null,
  };
}

function rawCluster(kind, key, records, extra = {}) {
  const summaries = records.map(recordSummary);
  const titles = new Set(summaries.map((row) => foldTr(row.title ?? "")));
  const types = new Set(summaries.map((row) => row.type ?? ""));
  let severity = extra.severity ?? "medium";
  if ((kind === "exact_url" || kind === "canonical_url") && records.length > 1) severity = "high";
  if (kind === "institution_identifier" && titles.size === 1 && types.size === 1) severity = "high";
  return {
    kind,
    key,
    ...extra,
    severity,
    recordIds: summaries.map((row) => row.recordId).sort(),
    recordCount: summaries.length,
    records: summaries,
    sourceUrls: [...new Set(summaries.map((row) => row.sourceUrl).filter(Boolean))].sort(),
    institutions: [...new Set(summaries.map((row) => row.institution).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")),
    archiveIdentifiers: [...new Set(summaries.map((row) => row.archiveIdentifier).filter(Boolean))].sort(),
  };
}

function groupClusters(clusters) {
  const map = new Map();
  for (const cluster of clusters) {
    const key = cluster.recordIds.join("|");
    if (!map.has(key)) {
      map.set(key, {
        recordIds: cluster.recordIds,
        recordCount: cluster.recordCount,
        records: cluster.records,
        kinds: new Set(),
        keys: new Set(),
        sourceUrls: new Set(),
        institutions: new Set(),
        archiveIdentifiers: new Set(),
        severity: cluster.severity,
        notes: new Set(),
      });
    }
    const group = map.get(key);
    group.kinds.add(cluster.kind);
    group.keys.add(cluster.key);
    for (const url of cluster.sourceUrls) group.sourceUrls.add(url);
    for (const institution of cluster.institutions) group.institutions.add(institution);
    for (const identifier of cluster.archiveIdentifiers) group.archiveIdentifiers.add(identifier);
    if (cluster.severity === "high") group.severity = "high";
    group.notes.add(cluster.note);
  }
  return sortBy(
    [...map.values()].map((group) => ({
      groupKey: group.recordIds.join("|"),
      recordIds: group.recordIds,
      recordCount: group.recordCount,
      records: group.records,
      kinds: [...group.kinds].sort(),
      keys: [...group.keys].sort((a, b) => a.localeCompare(b, "tr")),
      sourceUrls: [...group.sourceUrls].sort(),
      institutions: [...group.institutions].sort((a, b) => a.localeCompare(b, "tr")),
      archiveIdentifiers: [...group.archiveIdentifiers].sort(),
      severity: group.severity,
      notes: [...group.notes].sort((a, b) => a.localeCompare(b, "tr")),
    })),
    (a, b) => (a.severity === b.severity ? a.recordIds.join("|").localeCompare(b.recordIds.join("|"), "tr") : a.severity === "high" ? -1 : 1)
  );
}

export function detectSharedSources(records) {
  const clusters = [];

  const byExactUrl = new Map();
  const byCanonicalUrl = new Map();
  const byInstitutionIdentifier = new Map();
  const byProvenanceIdentifier = new Map();

  for (const record of records) {
    const sourceUrl = record.source?.url;
    if (typeof sourceUrl === "string" && sourceUrl.trim() !== "") {
      if (!byExactUrl.has(sourceUrl)) byExactUrl.set(sourceUrl, []);
      byExactUrl.get(sourceUrl).push(record);
      const canonical = canonicalizeUrl(sourceUrl);
      if (!byCanonicalUrl.has(canonical)) byCanonicalUrl.set(canonical, []);
      byCanonicalUrl.get(canonical).push(record);
    }
    const institution = normalizeWhitespace(record.source?.institution);
    const identifier = normalizeSourceIdentifier(record.source?.archiveIdentifier);
    if (institution && identifier) {
      const key = `${foldTr(institution)}|${identifier}`;
      if (!byInstitutionIdentifier.has(key)) byInstitutionIdentifier.set(key, []);
      byInstitutionIdentifier.get(key).push(record);
    }
    for (const provenance of record.provenance ?? []) {
      const provenanceInstitution = normalizeWhitespace(provenance?.institution);
      const provenanceIdentifier = normalizeSourceIdentifier(provenance?.identifier);
      if (!provenanceInstitution || !provenanceIdentifier) continue;
      const key = `${foldTr(provenanceInstitution)}|${provenanceIdentifier}`;
      if (!byProvenanceIdentifier.has(key)) byProvenanceIdentifier.set(key, []);
      byProvenanceIdentifier.get(key).push(record);
    }
  }

  for (const [url, group] of byExactUrl) {
    if (group.length < 2) continue;
    clusters.push(
      rawCluster("exact_url", url, group, {
        note: "Aynı kaynak URL'si birden fazla kayıtta kullanılıyor. Kayıtların gerçekten ayrı olup olmadığı uzman tarafından değerlendirilmelidir.",
      })
    );
  }
  for (const [canonicalUrl, group] of byCanonicalUrl) {
    if (group.length < 2) continue;
    const allSameExact = new Set(group.map((record) => record.source?.url)).size === 1;
    if (allSameExact) continue;
    clusters.push(
      rawCluster("canonical_url", canonicalUrl, group, {
        note: "URL'ler farklı yazılmış olsa da normalizasyon sonrası aynı kaynağa işaret ediyor.",
      })
    );
  }
  for (const [key, group] of byInstitutionIdentifier) {
    if (group.length < 2) continue;
    clusters.push(
      rawCluster("institution_identifier", key, group, {
        note: "Aynı kurum ve arşiv kimliği birden fazla kayıtta kullanılıyor; kaynak URL'leri farklı biçimde yazılmış olabilir.",
      })
    );
  }
  for (const [key, group] of byProvenanceIdentifier) {
    if (group.length < 2) continue;
    clusters.push(
      rawCluster("provenance_identifier", key, group, {
        note: "Aynı provenans kurumu ve kimliği birden fazla kayıtta geçiyor.",
      })
    );
  }

  const groups = groupClusters(clusters);
  const officialGroups = groups.filter((group) =>
    group.records.some((record) => ["official", "institutional", "archive", "library", "academic"].includes(record.institutionType))
  );
  const sharedRecordIds = new Set(groups.flatMap((group) => group.recordIds));

  return {
    schemaVersion: "1.0.0",
    policy: {
      officialSourceDefinition:
        "Resmî/kurumsal kaynak: institutionType official, institutional, archive, library veya academic.",
      interpretation:
        "Aynı kaynağın birden fazla kayıtta kullanılması her zaman hata değildir; ancak kayıtların ayrı konuları mı yoksa tekrar mı olduğu uzman tarafından değerlendirilmelidir.",
    },
    summary: {
      exactUrlClusters: clusters.filter((cluster) => cluster.kind === "exact_url").length,
      canonicalUrlClusters: clusters.filter((cluster) => cluster.kind === "canonical_url").length,
      institutionIdentifierClusters: clusters.filter((cluster) => cluster.kind === "institution_identifier").length,
      provenanceIdentifierClusters: clusters.filter((cluster) => cluster.kind === "provenance_identifier").length,
      groupCount: groups.length,
      highSeverity: groups.filter((group) => group.severity === "high").length,
      mediumSeverity: groups.filter((group) => group.severity === "medium").length,
      sharedRecordCount: sharedRecordIds.size,
      sharedOfficialSourceGroups: officialGroups.length,
      byKind: [...countBy(clusters, (cluster) => cluster.kind).entries()]
        .map(([kind, count]) => ({ kind, count }))
        .sort((a, b) => a.kind.localeCompare(b.kind)),
    },
    clusters: sortBy(clusters, (a, b) => a.kind.localeCompare(b.kind) || a.key.localeCompare(b.key, "tr")),
    groups,
  };
}
