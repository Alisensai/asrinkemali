/**
 * Kaynak URL envanteri.
 *
 * Her kaydın `source.url` alanı esas alınır; ayrıca kurum ana sayfası,
 * provenans, alıntı, görsel ve lisans URL'leri ayrı rollere ayrılır.
 */

import { countBy, canonicalizeUrl, sortBy, toSortedEntries, uniqueBy } from "./util.mjs";

const URL_EXTRACTORS = Object.freeze([
  { field: "$.source.url", role: "source", extract: (record) => [record.source?.url] },
  { field: "$.source.institutionUrl", role: "institution", extract: (record) => [record.source?.institutionUrl] },
  {
    field: "$.provenance[i].url",
    role: "provenance",
    extract: (record) => (record.provenance ?? []).map((item) => item?.url),
  },
  { field: "$.quotation.sourceUrl", role: "quotation", extract: (record) => [record.quotation?.sourceUrl] },
  { field: "$.image.url", role: "image", extract: (record) => [record.image?.url] },
  { field: "$.image.sourcePageUrl", role: "image_page", extract: (record) => [record.image?.sourcePageUrl] },
  { field: "$.rights.licenseUrl", role: "license", extract: (record) => [record.rights?.licenseUrl] },
  { field: "$.rights.termsUrl", role: "terms", extract: (record) => [record.rights?.termsUrl] },
]);

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function collectUrlEntries(records) {
  const entries = [];
  for (const record of records) {
    for (const extractor of URL_EXTRACTORS) {
      const values = extractor.extract(record) ?? [];
      values.forEach((url, index) => {
        if (typeof url !== "string" || url.trim() === "") return;
        const field = extractor.field.includes("[i]")
          ? extractor.field.replace("[i]", `[${index}]`)
          : extractor.field;
        entries.push({
          url,
          canonicalUrl: canonicalizeUrl(url),
          host: hostOf(url),
          role: extractor.role,
          field,
          recordId: record.id ?? null,
          title: record.title ?? null,
          type: record.type ?? null,
          status: record.verification?.status ?? null,
          institution: record.source?.institution ?? null,
          institutionType: record.source?.institutionType ?? null,
        });
      });
    }
  }
  return entries;
}

function groupUrls(entries) {
  const map = new Map();
  for (const entry of entries) {
    if (!map.has(entry.url)) {
      map.set(entry.url, {
        url: entry.url,
        canonicalUrl: entry.canonicalUrl,
        host: entry.host,
        roles: new Set(),
        fields: new Set(),
        recordIds: new Set(),
        institutions: new Set(),
        sourceOfRecordIds: new Set(),
      });
    }
    const group = map.get(entry.url);
    group.roles.add(entry.role);
    group.fields.add(entry.field);
    group.recordIds.add(entry.recordId);
    if (entry.institution) group.institutions.add(entry.institution);
    if (entry.role === "source") group.sourceOfRecordIds.add(entry.recordId);
  }
  return sortBy(
    [...map.values()].map((group) => ({
      url: group.url,
      canonicalUrl: group.canonicalUrl,
      host: group.host,
      roles: [...group.roles].sort(),
      fields: [...group.fields].sort(),
      recordIds: [...group.recordIds].sort(),
      recordCount: group.recordIds.size,
      institutions: [...group.institutions].sort((a, b) => a.localeCompare(b, "tr")),
      sourceOfRecordIds: [...group.sourceOfRecordIds].sort(),
      isSourceUrl: group.roles.has("source"),
    })),
    (a, b) => a.url.localeCompare(b.url, "tr")
  );
}

export function buildSourceInventory(records, { historyIndex = new Map() } = {}) {
  const entries = collectUrlEntries(records);
  const urls = groupUrls(entries);
  const sourceEntries = entries.filter((entry) => entry.role === "source");
  const byUrl = new Map(urls.map((url) => [url.url, url]));

  const recordRows = sortBy(
    records.map((record) => {
      const recordEntries = entries.filter((entry) => entry.recordId === record.id);
      const sourceEntry = recordEntries.find((entry) => entry.role === "source");
      const history = historyIndex.get(record.id) ?? null;
      const currentUrl = record.source?.url ?? null;
      let historyStatus = "untracked";
      if (history) {
        historyStatus = history.currentUrl === currentUrl ? "tracked" : "drift";
      }
      return {
        recordId: record.id ?? null,
        title: record.title ?? null,
        type: record.type ?? null,
        status: record.verification?.status ?? null,
        date: {
          start: record.date?.start ?? null,
          end: record.date?.end ?? null,
          precision: record.date?.precision ?? null,
          certainty: record.date?.certainty ?? null,
        },
        institution: record.source?.institution ?? null,
        institutionType: record.source?.institutionType ?? null,
        sourceUrl: currentUrl,
        sourceUrlHost: sourceEntry ? byUrl.get(sourceEntry.url)?.host ?? null : null,
        sourceTitle: record.source?.title ?? null,
        archiveIdentifier: record.source?.archiveIdentifier ?? null,
        accessedAt: record.source?.accessedAt ?? null,
        publishedAt: record.source?.publishedAt ?? null,
        originalUrl: history?.originalUrl ?? currentUrl,
        historyStatus,
        urlCount: recordEntries.length,
        urls: sortBy(
          recordEntries.map((entry) => ({
            field: entry.field,
            role: entry.role,
            url: entry.url,
            canonicalUrl: entry.canonicalUrl,
            host: entry.host,
          })),
          (a, b) => a.role.localeCompare(b.role) || a.url.localeCompare(b.url, "tr")
        ),
      };
    }),
    (a, b) => String(a.recordId).localeCompare(String(b.recordId), "tr")
  );

  const recordsWithSourceUrl = recordRows.filter((row) => typeof row.sourceUrl === "string" && row.sourceUrl.length > 0);
  const uniqueSourceUrls = new Set(sourceEntries.map((entry) => entry.url));
  const uniqueCanonicalSourceUrls = new Set(sourceEntries.map((entry) => entry.canonicalUrl));
  const byHost = [...countBy(urls, (url) => url.host ?? "(geçersiz)").entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "tr"))
    .map(([host, count]) => {
      const hostUrls = urls.filter((url) => (url.host ?? "(geçersiz)") === host);
      return {
        host,
        urlCount: count,
        sourceUrlCount: hostUrls.filter((url) => url.isSourceUrl).length,
        recordCount: new Set(hostUrls.flatMap((url) => url.recordIds)).size,
      };
    });

  const byInstitution = [...countBy(recordRows, (row) => row.institution ?? "(bilinmiyor)").entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "tr"))
    .map(([key, count]) => ({ key, count }));
  const byInstitutionType = toSortedEntries(countBy(recordRows, (row) => row.institutionType ?? "(bilinmiyor)"));
  const byType = toSortedEntries(countBy(recordRows, (row) => row.type ?? "(bilinmiyor)"));
  const byField = toSortedEntries(countBy(entries, (entry) => entry.field));
  const byRole = toSortedEntries(countBy(entries, (entry) => entry.role));

  return {
    schemaVersion: "1.0.0",
    summary: {
      records: recordRows.length,
      recordsWithSourceUrl: recordsWithSourceUrl.length,
      recordsWithoutSourceUrl: recordRows.length - recordsWithSourceUrl.length,
      sourceUrlEntries: sourceEntries.length,
      uniqueSourceUrls: uniqueSourceUrls.size,
      uniqueCanonicalSourceUrls: uniqueCanonicalSourceUrls.size,
      allUrlEntries: entries.length,
      uniqueAllUrls: urls.length,
      uniqueHosts: byHost.length,
      byInstitution,
      byInstitutionType,
      byType,
      byField,
      byRole,
      byHost,
    },
    records: recordRows,
    urls,
  };
}
