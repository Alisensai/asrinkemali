/**
 * Kaynak bağlantısı denetimi.
 *
 * Çevrimdışı raporlama varsayılandır. `online: true` verilmediği sürece ağ
 * isteği yapılmaz. Çevrimiçi modda mevcut güvenli `checkUrls` yönlendirme
 * izleyicisi kullanılır; her yönlendirme yeniden allowlist'e karşı sınırlanır.
 */

import { checkUrls } from "../../../scripts/archive/lib/links.mjs";
import { canonicalizeUrl, countBy, sortBy, toSortedEntries } from "./util.mjs";

const CRITICAL_ROLES = new Set(["source", "provenance", "quotation", "image", "image_page"]);

function buildReferences(entries) {
  const map = new Map();
  for (const entry of entries) {
    if (!map.has(entry.url)) map.set(entry.url, []);
    map.get(entry.url).push({
      recordId: entry.recordId,
      title: entry.title,
      field: entry.field,
      role: entry.role,
      institution: entry.institution,
    });
  }
  return map;
}

function referencesFor(map, url) {
  return map.get(url) ?? [];
}

function rolesOf(references) {
  return [...new Set(references.map((reference) => reference.role))].sort();
}

function recordIdsOf(references) {
  return [...new Set(references.map((reference) => reference.recordId).filter(Boolean))].sort();
}

export async function checkSourceLinks(
  records,
  {
    online = false,
    fetchImpl = globalThis.fetch,
    timeoutMs = 15_000,
    concurrency = 1,
    candidateUrls = [],
    checkedAt = new Date().toISOString(),
  } = {}
) {
  const entries = [];
  for (const record of records) {
    const add = (url, field, role) => {
      if (typeof url === "string" && url.trim() !== "") {
        entries.push({
          url,
          recordId: record.id,
          title: record.title,
          field,
          role,
          institution: record.source?.institution ?? null,
        });
      }
    };
    add(record.source?.url, "$.source.url", "source");
    add(record.source?.institutionUrl, "$.source.institutionUrl", "institution");
    for (const [index, item] of (record.provenance ?? []).entries()) {
      add(item?.url, `$.provenance[${index}].url`, "provenance");
    }
    add(record.quotation?.sourceUrl, "$.quotation.sourceUrl", "quotation");
    add(record.image?.url, "$.image.url", "image");
    add(record.image?.sourcePageUrl, "$.image.sourcePageUrl", "image_page");
    add(record.rights?.licenseUrl, "$.rights.licenseUrl", "license");
    add(record.rights?.termsUrl, "$.rights.termsUrl", "terms");
  }
  for (const candidate of candidateUrls) {
    if (typeof candidate.url !== "string" || candidate.url.trim() === "") continue;
    entries.push({
      url: candidate.url,
      recordId: `candidate:${candidate.id ?? candidate.sourceId ?? "unknown"}`,
      title: candidate.title ?? null,
      field: "$.candidate.url",
      role: "candidate",
      institution: candidate.institution ?? null,
    });
  }
  const referencesByUrl = buildReferences(entries);

  if (!online) {
    return {
      schemaVersion: "1.0.0",
      mode: "not_run",
      checkedAt: null,
      scope: "source_and_evidence_urls",
      policy: {
        network: "Varsayılan olarak ağ isteği yapılmaz.",
        redirects: "Çevrimiçi modda yönlendirmeler izlenir ve her yeni konak allowlist'e karşı denetlenir.",
      },
      summary: {
        checked: 0,
        ok: 0,
        redirected: 0,
        broken: 0,
        sourceChecked: 0,
        sourceOk: 0,
        sourceRedirected: 0,
        sourceBroken: 0,
        criticalBroken: 0,
        candidateChecked: 0,
        candidateBroken: 0,
        byRole: [],
      },
      results: [],
      redirects: [],
      broken: [],
      note: "Çevrimdışı mod: bağlantı durumu ölçülmedi. Çevrimiçi denetim için --online kullanın.",
    };
  }

  if (typeof fetchImpl !== "function") {
    throw new TypeError("checkSourceLinks: çevrimiçi mod için fetch gerekli.");
  }
  const startedAt = Date.now();
  const result = await checkUrls(entries, { fetchImpl, timeoutMs, concurrency });
  const rows = sortBy(
    result.results.map((item) => {
      const references = referencesFor(referencesByUrl, item.url);
      const roles = rolesOf(references);
      const isRedirected = item.ok && item.finalUrl && canonicalizeUrl(item.finalUrl) !== canonicalizeUrl(item.url);
      return {
        url: item.url,
        finalUrl: item.finalUrl ?? item.url,
        status: item.status ?? null,
        ok: item.ok,
        error: item.error ?? null,
        redirected: Boolean(isRedirected),
        roles,
        recordIds: recordIdsOf(references),
        fields: [...new Set(references.map((reference) => reference.field))].sort(),
        institutions: [...new Set(references.map((reference) => reference.institution).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr")),
        references,
      };
    }),
    (a, b) => Number(a.ok) - Number(b.ok) || a.url.localeCompare(b.url, "tr")
  );
  const broken = rows.filter((row) => !row.ok);
  const redirects = rows.filter((row) => row.redirected);
  const sourceRows = rows.filter((row) => row.roles.includes("source"));
  const criticalRows = rows.filter((row) => row.roles.some((role) => CRITICAL_ROLES.has(role)));
  const candidateRows = rows.filter((row) => row.roles.includes("candidate"));
  const roleCounts = countBy(rows.flatMap((row) => row.roles.map((role) => ({ role }))), (item) => item.role);

  return {
    schemaVersion: "1.0.0",
    mode: "online",
    checkedAt,
    durationMs: Date.now() - startedAt,
    scope: "source_and_evidence_urls",
    policy: {
      network: "Yalnızca https ve allowlist'teki kurumsal alan adları denetlenir.",
      redirects: "Yönlendirmeler izlenir; son URL asıl URL'den farklıysa redirected olarak raporlanır.",
      pointInTime: "Sonuçlar denetim anının anlık görüntüsüdür; site davranışı sonradan değişebilir.",
    },
    summary: {
      checked: rows.length,
      ok: rows.filter((row) => row.ok).length,
      redirected: redirects.length,
      broken: broken.length,
      sourceChecked: sourceRows.length,
      sourceOk: sourceRows.filter((row) => row.ok).length,
      sourceRedirected: sourceRows.filter((row) => row.redirected).length,
      sourceBroken: sourceRows.filter((row) => !row.ok).length,
      criticalBroken: criticalRows.filter((row) => !row.ok).length,
      candidateChecked: candidateRows.length,
      candidateBroken: candidateRows.filter((row) => !row.ok).length,
      byRole: toSortedEntries(roleCounts),
    },
    results: rows,
    redirects,
    broken,
    note:
      broken.length === 0
        ? "Çevrimiçi denetimde kırık bağlantı bulunmadı."
        : `${broken.length} bağlantı başarısız; ayrıntılar 'broken' listesinde.`,
  };
}
