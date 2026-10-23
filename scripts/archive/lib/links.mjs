/**
 * Kaynak bağlantısı denetimi.
 *
 * Ağ erişimi isteğe bağlıdır (`--links`). Varsayılan doğrulama tamamen çevrimdışı
 * çalışır; böylece CI ortamında ağ dalgalanması veri denetimini kilitlemez.
 *
 * Güvenlik notları:
 *  - Yalnızca doğrulama katmanından geçen https URL'leri denetlenir.
 *  - Yönlendirmeler elle izlenir; her yeni konak yeniden allowlist'e karşı sınanır.
 *  - Gövde okunmaz; yanıt hemen iptal edilir.
 */

import { validateExternalUrl } from "./security.mjs";

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_CONCURRENCY = 4;
const MAX_REDIRECTS = 5;
const USER_AGENT = "AsrinKemaliArchiveValidator/1.0 (+https://github.com/Alisensai/asrinkemali)";

export function collectRecordUrls(records) {
  if (!Array.isArray(records)) throw new TypeError("collectRecordUrls: kayıt dizisi gerekli.");
  const entries = [];
  const add = (url, recordId, field) => {
    if (typeof url === "string" && url.length > 0) {
      entries.push({ url, recordId: recordId ?? null, field });
    }
  };
  for (const record of records) {
    if (!record || typeof record !== "object") continue;
    add(record.source?.url, record.id, "$.source.url");
    add(record.source?.institutionUrl, record.id, "$.source.institutionUrl");
    for (const item of record.provenance ?? []) add(item?.url, record.id, "$.provenance.url");
    add(record.quotation?.sourceUrl, record.id, "$.quotation.sourceUrl");
    add(record.image?.url, record.id, "$.image.url");
    add(record.image?.sourcePageUrl, record.id, "$.image.sourcePageUrl");
    add(record.rights?.licenseUrl, record.id, "$.rights.licenseUrl");
    add(record.rights?.termsUrl, record.id, "$.rights.termsUrl");
  }
  return entries;
}

async function requestOnce(url, { timeoutMs, fetchImpl }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
      headers: { "user-agent": USER_AGENT, accept: "text/html,*/*;q=0.8" },
    });
    await response.body?.cancel();
    if (response.status === 405 || response.status === 403 || response.status === 501) {
      const getController = new AbortController();
      const getTimer = setTimeout(() => getController.abort(), timeoutMs);
      try {
        const getResponse = await fetchImpl(url, {
          method: "GET",
          redirect: "manual",
          signal: getController.signal,
          headers: {
            "user-agent": USER_AGENT,
            accept: "text/html,*/*;q=0.8",
            range: "bytes=0-0",
          },
        });
        await getResponse.body?.cancel();
        return getResponse;
      } finally {
        clearTimeout(getTimer);
      }
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function checkOne(entry, { timeoutMs, fetchImpl }) {
  const initial = validateExternalUrl(entry.url, { field: entry.field });
  if (!initial.ok) {
    return {
      ...entry,
      ok: false,
      status: null,
      finalUrl: null,
      error: initial.errors.join(" "),
    };
  }
  let current = entry.url;
  let response;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      response = await requestOnce(current, { timeoutMs, fetchImpl });
      const location = response.headers?.get?.("location");
      if (![301, 302, 303, 307, 308].includes(response.status) || !location) break;
      if (hop === MAX_REDIRECTS) {
        return {
          ...entry,
          ok: false,
          status: response.status,
          finalUrl: current,
          error: `Çok fazla yönlendirme (${MAX_REDIRECTS}).`,
        };
      }
      const next = new URL(location, current).href;
      const safe = validateExternalUrl(next, { field: `${entry.field} yönlendirme` });
      if (!safe.ok) {
        return {
          ...entry,
          ok: false,
          status: response.status,
          finalUrl: next,
          error: `Güvenli olmayan yönlendirme: ${safe.errors.join(" ")}`,
        };
      }
      current = next;
    }
  } catch (error) {
    const reason = error?.name === "AbortError" ? `zaman aşımı (${timeoutMs} ms)` : error.message;
    return { ...entry, ok: false, status: null, finalUrl: current, error: reason };
  }
  const ok = response.status >= 200 && response.status < 300;
  return {
    ...entry,
    ok,
    status: response.status,
    finalUrl: current,
    error: ok ? null : `HTTP ${response.status}`,
  };
}

export async function checkUrls(urls, options = {}) {
  const list = Array.isArray(urls) ? urls : [urls];
  const entries = list
    .map((item) =>
      typeof item === "string"
        ? { url: item, recordId: null, field: "url" }
        : item
    )
    .filter((item) => item && typeof item.url === "string");
  const uniqueEntries = [];
  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.url)) continue;
    seen.add(entry.url);
    uniqueEntries.push(entry);
  }
  const timeoutMs = Number.isInteger(options.timeoutMs) && options.timeoutMs > 0
    ? options.timeoutMs
    : DEFAULT_TIMEOUT_MS;
  const concurrency = Number.isInteger(options.concurrency) && options.concurrency > 0
    ? options.concurrency
    : DEFAULT_CONCURRENCY;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new TypeError("checkUrls: fetch bulunamadı; Node 18+ gerekir.");
  }

  const results = new Array(uniqueEntries.length);
  let cursor = 0;
  async function worker() {
    while (cursor < uniqueEntries.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await checkOne(uniqueEntries[index], { timeoutMs, fetchImpl });
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, uniqueEntries.length) }, worker));

  const failures = results.filter((result) => !result.ok);
  return {
    checked: results.length,
    ok: failures.length === 0,
    failures,
    results,
  };
}

export async function checkArchiveLinks(records, options = {}) {
  const entries = collectRecordUrls(records);
  const byUrl = new Map();
  for (const entry of entries) {
    if (!byUrl.has(entry.url)) byUrl.set(entry.url, []);
    byUrl.get(entry.url).push({ recordId: entry.recordId, field: entry.field });
  }
  const result = await checkUrls(entries, options);
  return {
    ...result,
    failures: result.failures.map((failure) => ({
      ...failure,
      references: byUrl.get(failure.url) ?? [],
    })),
  };
}
