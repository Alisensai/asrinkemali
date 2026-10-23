/**
 * ASRIN KEMALİ arşiv çekirdeği için ortak giriş noktası.
 *
 * Kullanım:
 *   import { loadArchive, validateArchive, searchRecords } from "./scripts/archive/lib/index.mjs";
 *
 * Modüller bilinçli olarak birbirinden bağımsızdır; bu dosya yalnızca yeniden
 * dışa aktarım yapar. Böylece web katmanı yalnızca ihtiyaç duyduğu modülü
 * yükleyebilir, testler ise tek giriş noktasından beslenebilir.
 */

export {
  REPO_ROOT,
  resolveRoot,
  readJsonFile,
  loadTaxonomy,
  loadSchema,
  loadRecords,
  loadArchive,
} from "./load.mjs";

export { validateArchive } from "./validate.mjs";

export {
  searchRecords,
  parseSearchQuery,
  getRecordById,
  getRecordYearRange,
} from "./search.mjs";

export { todayInHistory, NO_RECORDS_MESSAGE } from "./today.mjs";

export {
  normalizeTr,
  foldTr,
  tokenize,
  includesText,
  countOccurrences,
  makeSnippet,
  isValidCalendarDate,
  toCalendarDate,
} from "./text.mjs";

export {
  MAX_JSON_BYTES,
  MAX_IMAGE_BYTES,
  MAX_RECORDS,
  ALLOWED_HOSTS,
  isAllowedHost,
  isPrivateHostname,
  validateExternalUrl,
  assertSafeText,
  escapeHtml,
  findPrototypePollutionKeys,
  assertFileSize,
  validateLocalImage,
} from "./security.mjs";

export {
  checkArchiveLinks,
  checkUrls,
  collectRecordUrls,
} from "./links.mjs";
