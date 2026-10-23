/**
 * Arşiv doğrulama çekirdeği.
 *
 * Katmanlar:
 *  1. JSON Schema (yapısal sözleşme)
 *  2. İş kuralları (tarih tutarlılığı, yayın kapısı, alıntı kanıtı)
 *  3. Güvenlik (HTML/URL/prototip kirliliği/görsel dosyası)
 *  4. Denetim (tekrar, kategori, Unicode, kaynak-provenans ilişkisi)
 */

import { validateSchema } from "./json-schema.mjs";
import {
  assertSafeText,
  findPrototypePollutionKeys,
  validateExternalUrl,
  validateLocalImage,
} from "./security.mjs";
import { foldTr, normalizeTr } from "./text.mjs";

const STATUSES = ["draft", "reviewed", "published"];
const TYPES = ["photograph", "document", "speech", "event", "publication", "place"];
const PUBLISHABLE_RIGHTS = new Set([
  "public_domain",
  "open_license",
  "official_link_only",
  "institutional_terms",
]);
const PUBLISHABLE_INSTITUTIONS = new Set([
  "official",
  "institutional",
  "archive",
  "library",
  "academic",
]);
const HOSTABLE_RIGHTS = new Set(["public_domain", "open_license"]);

function issue(code, recordId, path, message) {
  return { code, recordId: recordId ?? null, path, message };
}

function walkStrings(value, path, callback) {
  if (typeof value === "string") {
    callback(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkStrings(item, `${path}[${index}]`, callback));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      walkStrings(child, `${path}.${key}`, callback);
    }
  }
}

function checkUrl(value, field, recordId, errors) {
  if (value == null) return;
  const result = validateExternalUrl(value, { field });
  if (!result.ok) {
    for (const message of result.errors) {
      errors.push(issue("GUVENLIK_URL", recordId, field, message));
    }
  }
}

function dateYear(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? Number(value.slice(0, 4))
    : null;
}

function checkDate(record, recordId, errors, warnings) {
  const date = record.date;
  if (!date) return;
  const startYear = dateYear(date.start);
  const endYear = dateYear(date.end);
  if (startYear !== null && (startYear < 1800 || startYear > 2100)) {
    errors.push(issue("TARIH_ARALIK", recordId, "$.date.start", "Tarih 1800-2100 aralığında olmalı."));
  }
  if (endYear !== null && (endYear < 1800 || endYear > 2100)) {
    errors.push(issue("TARIH_ARALIK", recordId, "$.date.end", "Tarih 1800-2100 aralığında olmalı."));
  }
  if (date.start && date.end && date.start > date.end) {
    errors.push(issue("TARIH_SIRA", recordId, "$.date", "Başlangıç tarihi bitiş tarihinden sonra olamaz."));
  }
  if (date.precision === "unknown") {
    if (date.start || date.end) {
      errors.push(issue("TARIH_BELIRSIZ", recordId, "$.date", "Belirsiz tarihte start/end boş olmalı."));
    }
    if (date.certainty !== "unknown") {
      errors.push(issue("TARIH_BELIRSIZ", recordId, "$.date", "Belirsiz tarihte certainty 'unknown' olmalı."));
    }
    warnings.push(issue("TARIH_EKSIK", recordId, "$.date", "Tarih bilinmiyor; yayın için ek doğrulama gerekir."));
    return;
  }
  if (!date.start) {
    errors.push(issue("TARIH_EKSIK", recordId, "$.date.start", "Tarih başlangıcı zorunlu."));
    return;
  }
  if (date.precision === "day") {
    if (date.end && date.end !== date.start) {
      errors.push(issue("TARIH_GUN", recordId, "$.date.end", "Gün hassasiyetinde bitiş, başlangıçla aynı olmalı."));
    }
    if (date.certainty === "unknown") {
      errors.push(issue("TARIH_GUN", recordId, "$.date.certainty", "Gün hassasiyetinde kesinlik 'unknown' olamaz."));
    }
  } else if (date.precision === "range") {
    if (!date.end) {
      errors.push(issue("TARIH_ARALIK", recordId, "$.date.end", "Aralık tarihinde bitiş zorunlu."));
    }
  } else if (date.precision === "month") {
    if (date.end && date.end.slice(0, 7) !== date.start.slice(0, 7)) {
      warnings.push(issue("TARIH_AY", recordId, "$.date", "Ay hassasiyetinde bitiş farklı aya düşüyor."));
    }
  } else if (date.precision === "year") {
    if (date.end && date.end.slice(0, 4) !== date.start.slice(0, 4)) {
      warnings.push(issue("TARIH_YIL", recordId, "$.date", "Yıl hassasiyetinde bitiş farklı yıla düşüyor."));
    }
  }
  if (date.certainty === "estimated") {
    warnings.push(issue("TARIH_TAHMINI", recordId, "$.date", "Tarih tahmini; yayın için kaynak teyidi gerekir."));
  }
}

function checkSource(record, recordId, errors, warnings) {
  const source = record.source;
  if (!source) return;
  checkUrl(source.url, "$.source.url", recordId, errors);
  checkUrl(source.institutionUrl, "$.source.institutionUrl", recordId, errors);
  if (record.schemaVersion === "1.1.0" && (typeof source.citation !== "string" || source.citation.trim().length < 10)) {
    errors.push(issue("KAYNAK_KUNYE", recordId, "$.source.citation", "1.1.0 kaydında kaynak künyesi zorunlu."));
  }
  const isPublished = record.verification?.status === "published";
  const isReviewed = record.verification?.status === "reviewed";
  if ((isPublished || isReviewed) && !PUBLISHABLE_INSTITUTIONS.has(source.institutionType)) {
    const message = "Yayın/inceleme için kaynak kurum türü resmî, kurumsal, arşiv, kütüphane veya akademik olmalı.";
    if (isPublished) errors.push(issue("KAYNAK_TUR", recordId, "$.source.institutionType", message));
    else warnings.push(issue("KAYNAK_TUR", recordId, "$.source.institutionType", message));
  }
  if (isPublished && typeof source.url === "string") {
    let pathname = "/";
    try {
      pathname = new URL(source.url).pathname;
    } catch {
      // URL güvenlik katmanında zaten hata üretir.
    }
    if (pathname === "/" || pathname === "") {
      errors.push(issue("KAYNAK_GENEL", recordId, "$.source.url", "Yayın için genel ana sayfa değil, belirli kaynak sayfası gerekli."));
    }
  }
  const provenanceUrls = (record.provenance ?? [])
    .map((item) => item.url)
    .filter((url) => typeof url === "string");
  if ((isPublished || isReviewed) && !provenanceUrls.includes(source.url)) {
    errors.push(issue("PROVENANS_URL", recordId, "$.provenance", "Kaynak URL'si provenans listesinde yer almalı."));
  }
  if (record.provenance?.[0] && record.provenance[0].institution !== source.institution) {
    warnings.push(issue("PROVENANS_KURUM", recordId, "$.provenance[0].institution", "İlk provenans kurumu kaynak kurumuyla aynı değil."));
  }
  if (source.institutionType === "other") {
    warnings.push(issue("KAYNAK_TUR", recordId, "$.source.institutionType", "Kaynak türü 'other'; yayın için yeterli değil."));
  }
}

function checkRights(record, recordId, errors, warnings) {
  const rights = record.rights;
  if (!rights) return;
  const status = record.verification?.status;
  if (status === "published" && !PUBLISHABLE_RIGHTS.has(rights.status)) {
    errors.push(issue("HAK_YAYIN", recordId, "$.rights.status", "Bu hak durumuyla kayıt yayımlanamaz."));
  }
  if (rights.status === "unknown") {
    warnings.push(issue("HAK_BELIRSIZ", recordId, "$.rights.status", "Hak/lisans durumu bilinmiyor; kayıt yayımlanmamalı."));
  }
  if (rights.status === "open_license" && (!rights.license || !rights.licenseUrl)) {
    errors.push(issue("HAK_LISANS", recordId, "$.rights", "Açık lisans için license ve licenseUrl zorunlu."));
  }
  if (rights.imageReuse === "permitted" && (!rights.licenseUrl || !rights.license)) {
    errors.push(issue("HAK_GORSEL", recordId, "$.rights", "Görsel yeniden kullanımı için lisans bilgisi zorunlu."));
  }
  checkUrl(rights.licenseUrl, "$.rights.licenseUrl", recordId, errors);
  checkUrl(rights.termsUrl, "$.rights.termsUrl", recordId, errors);
}

function checkHolding(record, recordId, errors, warnings) {
  const holding = record.holding;
  if (record.schemaVersion === "1.1.0" && !holding) {
    errors.push(issue("KAYIT_BARINDIRMA", recordId, "$.holding", "1.1.0 kaydında barındırma bilgisi zorunlu."));
    return;
  }
  if (!holding) return;

  if (holding.mode === "external_link") {
    if (holding.filePath != null) {
      errors.push(issue("BARINDIRMA_DOSYA", recordId, "$.holding.filePath", "Dış bağlantı modunda dosya yolu boş olmalı."));
    }
    if (record.rights?.imageReuse === "permitted") {
      warnings.push(issue("BARINDIRMA_LINK", recordId, "$.holding.mode", "Dış bağlantı modunda görsel yeniden kullanımı 'permitted' olarak işaretlenmiş."));
    }
    return;
  }

  if (holding.mode === "hosted_file") {
    if (typeof holding.filePath !== "string" || holding.filePath.length === 0) {
      errors.push(issue("BARINDIRMA_DOSYA", recordId, "$.holding.filePath", "Barındırılan dosya için yol zorunlu."));
    } else {
      if (!holding.filePath.startsWith("data/archive/files/")) {
        errors.push(issue("BARINDIRMA_DOSYA", recordId, "$.holding.filePath", "Dosya data/archive/files/ altında olmalı."));
      }
      if (holding.filePath.includes("..") || pathIsAbsolute(holding.filePath)) {
        errors.push(issue("BARINDIRMA_DOSYA", recordId, "$.holding.filePath", "Dosya yolu dizin dışına çıkamaz."));
      }
    }
    if (!HOSTABLE_RIGHTS.has(record.rights?.status)) {
      errors.push(issue("BARINDIRMA_HAK", recordId, "$.holding.mode", "Dosya barındırmak için kamu malı veya açık lisans gerekli."));
    }
    return;
  }

  if (holding.mode === "metadata_only") {
    if (holding.filePath != null) {
      errors.push(issue("BARINDIRMA_DOSYA", recordId, "$.holding.filePath", "Yalnızca metadata modunda dosya yolu boş olmalı."));
    }
  }
}

function pathIsAbsolute(value) {
  return /^[a-zA-Z]:[\\/]/.test(value) || value.startsWith("\\\\") || value.startsWith("/");
}

function checkImage(record, recordId, errors, warnings, root) {
  const image = record.image;
  const status = record.verification?.status;
  if (!image) {
    if (record.type === "photograph") {
      const message = "Fotoğraf kaydında image nesnesi zorunlu.";
      if (status === "published") errors.push(issue("GORSEL_EKSIK", recordId, "$.image", message));
      else warnings.push(issue("GORSEL_EKSIK", recordId, "$.image", message));
    }
    return;
  }
  if (image.kind === "none") {
    warnings.push(issue("GORSEL_YOK", recordId, "$.image.kind", "image.kind 'none' yerine image null kullanılmalı."));
  }
  checkUrl(image.url, "$.image.url", recordId, errors);
  checkUrl(image.sourcePageUrl, "$.image.sourcePageUrl", recordId, errors);
  if (image.kind === "ai_representative") {
    if (status === "published" || status === "reviewed") {
      errors.push(issue("AI_YAYIN", recordId, "$.image.kind", "AI/temsili görsel tarihsel arşiv kaydı olarak yayımlanamaz."));
    }
    if (record.rights?.status !== "ai_representative" || record.rights?.imageReuse !== "ai_representative") {
      errors.push(issue("AI_ETIKET", recordId, "$.rights", "AI görselde hak durumu ve imageReuse 'ai_representative' olmalı."));
    }
    if (!/(temsili|yapay zek|ai)/iu.test(image.alt)) {
      errors.push(issue("AI_ETIKET", recordId, "$.image.alt", "AI görselin alt metninde 'temsili' veya 'AI' etiketi olmalı."));
    }
    return;
  }
  if (image.kind === "digitized_original") {
    if (!image.sourcePageUrl) {
      errors.push(issue("GORSEL_KAYNAK", recordId, "$.image.sourcePageUrl", "Dijital görsel için kaynak sayfası zorunlu."));
    }
    if (record.rights?.imageReuse === "link_only" && image.url) {
      errors.push(issue("GORSEL_LINK", recordId, "$.image.url", "Link-only görselde doğrudan görsel URL'si verilemez; kaynak sayfaya bağlantı kurulmalı."));
    }
    if (record.rights?.imageReuse === "link_only" && image.displayPolicy !== "source_link_only") {
      errors.push(issue("GORSEL_POLITIKA", recordId, "$.image.displayPolicy", "Link-only görselde displayPolicy 'source_link_only' olmalı."));
    }
    if (image.displayPolicy === "embedded_allowed" && record.rights?.imageReuse !== "permitted") {
      errors.push(issue("GORSEL_POLITIKA", recordId, "$.image.displayPolicy", "Gömülü gösterim için yeniden kullanım izni gerekli."));
    }
  }
  if (image.localPath) {
    if (!root) {
      errors.push(issue("GORSEL_DOSYA", recordId, "$.image.localPath", "Yerel görsel denetimi için kök dizin gerekli."));
    } else {
      // Yerel görsel denetimi asenkron olduğu için çağıran tarafta toplanır.
    }
  }
}

async function checkLocalImages(record, recordId, errors, root) {
  const image = record.image;
  if (!image?.localPath) return;
  const result = await validateLocalImage(image.localPath, { root });
  for (const message of result.errors) {
    errors.push(issue("GORSEL_DOSYA", recordId, "$.image.localPath", message));
  }
  if (result.mimeType && image.mimeType && result.mimeType !== image.mimeType) {
    errors.push(issue("GORSEL_MIME", recordId, "$.image.mimeType", `Dosya imzası ${result.mimeType}, metadata ${image.mimeType}.`));
  }
}

function checkQuotation(record, recordId, errors, warnings) {
  const quotation = record.quotation;
  if (!quotation) {
    if (record.type === "speech") {
      warnings.push(issue("ALINTI_YOK", recordId, "$.quotation", "Konuşma kaydında doğrudan alıntı yok; bu bir eksiklik değilse yayın notunda belirtilmeli."));
    }
    return;
  }
  checkUrl(quotation.sourceUrl, "$.quotation.sourceUrl", recordId, errors);
  const excerpt = normalizeTr(quotation.evidence?.sourceExcerpt ?? "").replace(/\s+/g, " ").trim();
  const text = normalizeTr(quotation.text).replace(/\s+/g, " ").trim();
  if (!excerpt.includes(text)) {
    errors.push(issue("ALINTI_KANIT", recordId, "$.quotation.evidence.sourceExcerpt", "Alıntı metni kaynak pasajında birebir bulunamadı."));
  }
  if (record.date?.start && quotation.date !== record.date.start) {
    const message = "Alıntı tarihi kayıt tarihiyle aynı değil.";
    if (record.verification?.status === "published") errors.push(issue("ALINTI_TARIH", recordId, "$.quotation.date", message));
    else warnings.push(issue("ALINTI_TARIH", recordId, "$.quotation.date", message));
  }
  if (record.verification?.status === "published" && record.verification?.checks?.quoteVerified !== true) {
    errors.push(issue("ALINTI_DOGRULAMA", recordId, "$.verification.checks.quoteVerified", "Yayın için alıntı doğrulaması tamamlanmalı."));
  }
  const provenanceUrls = (record.provenance ?? []).map((item) => item.url).filter(Boolean);
  if (quotation.sourceUrl !== record.source?.url && !provenanceUrls.includes(quotation.sourceUrl)) {
    warnings.push(issue("ALINTI_KAYNAK", recordId, "$.quotation.sourceUrl", "Alıntı kaynağı provenans listesinde değil."));
  }
}

function checkPublicationGate(record, recordId, errors) {
  const status = record.verification?.status;
  if (status !== "published") return;
  const verification = record.verification;
  if (!verification.reviewedBy) {
    errors.push(issue("YAYIN_INCELEME", recordId, "$.verification.reviewedBy", "Yayın için inceleyen kişi/kurum zorunlu."));
  }
  if (!verification.reviewedAt) {
    errors.push(issue("YAYIN_INCELEME", recordId, "$.verification.reviewedAt", "Yayın için inceleme tarihi zorunlu."));
  }
  for (const [key, value] of Object.entries(verification.checks ?? {})) {
    // quoteVerified yalnızca doğrudan alıntı içeren kayıtlarda anlamlıdır.
    if (key === "quoteVerified" && !record.quotation) continue;
    if (value !== true) {
      errors.push(issue("YAYIN_KONTROL", recordId, `$.verification.checks.${key}`, `Yayın için ${key} true olmalı.`));
    }
  }
  if (!record.quotation && verification.checks?.quoteVerified === true) {
    errors.push(issue("YAYIN_ALINTI", recordId, "$.verification.checks.quoteVerified", "Alıntı yokken quoteVerified true olamaz."));
  }
  if (record.date?.certainty === "unknown") {
    errors.push(issue("YAYIN_TARIH", recordId, "$.date.certainty", "Tarihi bilinmeyen kayıt yayımlanamaz."));
  }
  if (record.type === "event" && (record.date?.precision !== "day" || record.date?.certainty !== "exact")) {
    errors.push(issue("YAYIN_OLAY_TARIH", recordId, "$.date", "Olay kaydı yayın için gün hassasiyetinde ve kesin tarihli olmalı."));
  }
  if (record.type === "place" && (!record.locations || record.locations.length === 0)) {
    errors.push(issue("YAYIN_MEKAN", recordId, "$.locations", "Mekân kaydında en az bir konum zorunlu."));
  }
  if (record.type === "photograph" && !record.image) {
    errors.push(issue("YAYIN_FOTOGRAF", recordId, "$.image", "Fotoğraf kaydı yayın için image nesnesi zorunlu."));
  }
}

function checkTaxonomy(record, recordId, taxonomy, errors, warnings) {
  if (!taxonomy) return;
  const categoryIds = new Set((taxonomy.categories ?? []).map((item) => item.id));
  const typeIds = new Set((taxonomy.types ?? []).map((item) => item.id));
  const rightsIds = new Set((taxonomy.rightsStatuses ?? []).map((item) => item.id));
  const verificationIds = new Set((taxonomy.verificationStatuses ?? []).map((item) => item.id));
  const institutionIds = new Set((taxonomy.institutionTypes ?? []).map((item) => item.id));
  for (const category of record.categories ?? []) {
    if (!categoryIds.has(category)) {
      errors.push(issue("TAKSONOMI_KATEGORI", recordId, "$.categories", `Bilinmeyen kategori: ${category}`));
    }
  }
  if (!typeIds.has(record.type)) {
    errors.push(issue("TAKSONOMI_TUR", recordId, "$.type", `Bilinmeyen tür: ${record.type}`));
  }
  if (!rightsIds.has(record.rights?.status)) {
    errors.push(issue("TAKSONOMI_HAK", recordId, "$.rights.status", `Bilinmeyen hak durumu: ${record.rights?.status}`));
  }
  if (!verificationIds.has(record.verification?.status)) {
    errors.push(issue("TAKSONOMI_DOGRULAMA", recordId, "$.verification.status", `Bilinmeyen doğrulama durumu: ${record.verification?.status}`));
  }
  if (!institutionIds.has(record.source?.institutionType)) {
    errors.push(issue("TAKSONOMI_KURUM", recordId, "$.source.institutionType", `Bilinmeyen kurum türü: ${record.source?.institutionType}`));
  }
  if ((record.categories ?? []).length === 0) {
    warnings.push(issue("KATEGORI_EKSIK", recordId, "$.categories", "Kategori yok."));
  }
}

function checkReviewGate(record, recordId, errors, warnings) {
  const status = record.verification?.status;
  if (status !== "reviewed") return;
  if (!record.verification.reviewedBy) {
    errors.push(issue("INCELEME_KAYIT", recordId, "$.verification.reviewedBy", "İncelenmiş kayıt için inceleyen zorunlu."));
  }
  if (!record.verification.reviewedAt) {
    errors.push(issue("INCELEME_KAYIT", recordId, "$.verification.reviewedAt", "İncelenmiş kayıt için inceleme tarihi zorunlu."));
  }
  if (record.verification.checks?.sourceReachable !== true) {
    errors.push(issue("INCELEME_KAYNAK", recordId, "$.verification.checks.sourceReachable", "İncelenmiş kayıt için kaynak erişimi doğrulanmalı."));
  }
  if (record.verification.checks?.dateVerified !== true) {
    errors.push(issue("INCELEME_TARIH", recordId, "$.verification.checks.dateVerified", "İncelenmiş kayıt için tarih doğrulanmalı."));
  }
  if (record.verification.checks?.duplicateChecked !== true) {
    warnings.push(issue("INCELEME_TEKRAR", recordId, "$.verification.checks.duplicateChecked", "Tekrar kontrolü tamamlanmamış."));
  }
  if (record.rights?.status === "unknown") {
    warnings.push(issue("INCELEME_HAK", recordId, "$.rights.status", "İncelenmiş kayıtta hak durumu hâlâ bilinmiyor; yayın kapısı kapalı."));
  }
}

function checkDuplicates(records, errors, warnings) {
  const ids = new Map();
  const slugs = new Map();
  const titleKeys = new Map();
  const compositeKeys = new Map();
  records.forEach((record, index) => {
    const recordId = record?.id ?? null;
    const idKey = typeof record?.id === "string" ? record.id : `#${index}`;
    if (ids.has(idKey)) {
      errors.push(issue("TEKRAR_ID", recordId, "$.id", `Yinelenen id: ${idKey}`));
    } else {
      ids.set(idKey, index);
    }
    if (typeof record?.slug === "string") {
      if (slugs.has(record.slug)) {
        errors.push(issue("TEKRAR_SLUG", recordId, "$.slug", `Yinelenen slug: ${record.slug}`));
      } else {
        slugs.set(record.slug, index);
      }
    }
    if (typeof record?.title === "string") {
      const titleKey = foldTr(record.title);
      if (titleKeys.has(titleKey)) {
        warnings.push(issue("TEKRAR_BASLIK", recordId, "$.title", `Benzer başlık: ${record.title}`));
      } else {
        titleKeys.set(titleKey, index);
      }
      const composite = `${titleKey}|${record.type ?? ""}|${record.date?.start ?? ""}`;
      if (compositeKeys.has(composite)) {
        errors.push(issue("TEKRAR_KAYIT", recordId, "$", `Aynı başlık/tür/tarih: ${record.title}`));
      } else {
        compositeKeys.set(composite, index);
      }
    }
  });
}

function emptyStats() {
  const byStatus = Object.fromEntries(STATUSES.map((status) => [status, 0]));
  const byType = Object.fromEntries(TYPES.map((type) => [type, 0]));
  return {
    total: 0,
    byStatus,
    byType,
    withQuotation: 0,
    withImage: 0,
    unknownDates: 0,
    linkOnly: 0,
    hostedFiles: 0,
    metadataOnly: 0,
  };
}

export async function validateArchive({
  records,
  taxonomy,
  recordSchema,
  taxonomySchema,
  root,
  strict = false,
} = {}) {
  const errors = [];
  const warnings = [];
  const stats = emptyStats();
  if (!Array.isArray(records)) {
    errors.push(issue("KOK", null, "$.records", "Kayıt dizisi yok."));
    return { ok: false, errors, warnings, stats };
  }
  if (!taxonomy) {
    errors.push(issue("KOK", null, "$.taxonomy", "Taksonomi yüklenemedi."));
  }
  if (!recordSchema) {
    errors.push(issue("KOK", null, "$.schema", "Kayıt şeması yüklenemedi."));
  }
  if (!taxonomySchema) {
    errors.push(issue("KOK", null, "$.taxonomySchema", "Taksonomi şeması yüklenemedi."));
  }

  if (taxonomy && taxonomySchema) {
    const result = validateSchema(taxonomy, taxonomySchema);
    for (const error of result.errors) {
      errors.push(issue("TAKSONOMI_SEMA", null, error.path, error.message));
    }
  }

  records.forEach((record, index) => {
    const recordId = typeof record?.id === "string" ? record.id : null;
    const basePath = `$.records[${index}]`;
    if (recordSchema) {
      const result = validateSchema(record, recordSchema);
      for (const error of result.errors) {
        errors.push(issue("SEMA", recordId, `${basePath}${error.path.slice(1)}`, error.message));
      }
    }
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      errors.push(issue("KAYIT_TUR", recordId, basePath, "Kayıt nesne olmalı."));
      return;
    }

    stats.total += 1;
    if (STATUSES.includes(record.verification?.status)) stats.byStatus[record.verification.status] += 1;
    if (TYPES.includes(record.type)) stats.byType[record.type] += 1;
    if (record.quotation) stats.withQuotation += 1;
    if (record.image) stats.withImage += 1;
    if (record.date?.certainty === "unknown" || !record.date?.start) stats.unknownDates += 1;
    if (record.holding?.mode === "external_link") stats.linkOnly += 1;
    if (record.holding?.mode === "hosted_file") stats.hostedFiles += 1;
    if (record.holding?.mode === "metadata_only") stats.metadataOnly += 1;

    const pollution = findPrototypePollutionKeys(record, basePath);
    for (const path of pollution) {
      errors.push(issue("GUVENLIK_PROTO", recordId, path, "Prototip kirliliği riski taşıyan anahtar."));
    }

    walkStrings(record, basePath, (value, path) => {
      const result = assertSafeText(value, { field: path });
      for (const message of result.errors) {
        errors.push(issue("GUVENLIK_METIN", recordId, path, message));
      }
    });

    checkDate(record, recordId, errors, warnings);
    checkSource(record, recordId, errors, warnings);
    checkRights(record, recordId, errors, warnings);
    checkHolding(record, recordId, errors, warnings);
    checkImage(record, recordId, errors, warnings, root);
    checkQuotation(record, recordId, errors, warnings);
    checkPublicationGate(record, recordId, errors);
    checkReviewGate(record, recordId, errors, warnings);
    checkTaxonomy(record, recordId, taxonomy, errors, warnings);

    for (const relatedId of record.relatedIds ?? []) {
      if (!records.some((candidate) => candidate?.id === relatedId)) {
        warnings.push(issue("ILISKI", recordId, "$.relatedIds", `İlişkili kayıt bulunamadı: ${relatedId}`));
      }
    }
  });

  checkDuplicates(records, errors, warnings);

  for (const record of records) {
    if (!record || typeof record !== "object") continue;
    await checkLocalImages(record, record.id ?? null, errors, root);
  }

  if (strict) {
    for (const warning of warnings) {
      errors.push(issue("SIKI_KIP", warning.recordId, warning.path, warning.message));
    }
  }

  return { ok: errors.length === 0, errors, warnings, stats };
}
