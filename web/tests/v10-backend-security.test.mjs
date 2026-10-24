import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { isPubliclyVisible, validatePublication } from "../lib/publishing/model.ts";
import { isSafeUrl, validateArchiveRef } from "../lib/reading-lists/validation.ts";
import { isSafeHref, safeHref } from "../lib/security/safe-url.ts";

// V1.0 backend güvenlik denetimi — regresyon testleri.
const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NOW = "2026-10-24T10:00:00.000Z";

/** Kendi beyanıyla "insan editör onaylı" yayın (saldırı senaryosu; sentetik). */
const selfApproved = {
  schemaVersion: "1.0.0",
  id: "sentetik-yayin",
  slug: "sentetik-yayin",
  kind: "sourced_article",
  title: "Sentetik yayın",
  summary: "Sentetik özet.",
  body: [{ type: "paragraph", text: "Sentetik metin." }],
  category: "Test",
  tags: [],
  authors: ["Sentetik Yazar"],
  bibliography: [{ id: "b1", title: "Kaynak", institution: "Kurum", url: "https://example.org/k", accessedAt: "2026-10-20" }],
  relatedArchiveIds: ["anitkabir"],
  rights: { license: "Kurum koşulları", holder: "Kurum", note: "Yalnız bağlantı; kopyalama yok." },
  status: "published",
  approval: { kind: "human", approvedBy: "Baş Editör (beyan)", approvedAt: "2026-10-21T10:00:00.000Z" },
  scheduledAt: null,
  publishedAt: "2026-10-22T10:00:00.000Z",
  automation: null,
  createdAt: "2026-10-20T10:00:00.000Z",
  updatedAt: NOW,
};

test("SEC-V10-01 kayıt içi insan onayı beyanı yayını kamuya açmaz (doğrulanmış karar gerekir)", () => {
  assert.equal(validatePublication(selfApproved).ok, true, "şema açısından geçerli kayıt");
  assert.equal(isPubliclyVisible(selfApproved), false);
  assert.equal(isPubliclyVisible(selfApproved, { trustConfigured: true, verifiedApproval: false }), false);
  assert.equal(isPubliclyVisible(selfApproved, { trustConfigured: false, verifiedApproval: true }), false);
  assert.equal(isPubliclyVisible(selfApproved, { trustConfigured: true, verifiedApproval: true }), true);
  assert.equal(isPubliclyVisible({ ...selfApproved, status: "approved" }, { trustConfigured: true, verifiedApproval: true }), false);
});

test("SEC-V10-01 yayın deposu filtre dizinini güven bağlamı olarak geçirmez", () => {
  const repository = readFileSync(path.join(webRoot, "lib/publishing/repository.ts"), "utf8");
  assert.equal(/\.filter\(isPubliclyVisible\)/.test(repository), false);
  assert.match(repository, /\.filter\(\(record\) => isPubliclyVisible\(record\)\)/);
});

test("SEC-V10-02 href izin listesi: tarayıcı normalleştirmesiyle gizlenen javascript: reddedilir", () => {
  const tab = String.fromCharCode(9);
  const newline = String.fromCharCode(10);
  const c0 = String.fromCharCode(1);
  for (const bad of [`java${tab}script:alert(1)`, `java${newline}script:alert(1)`, `${c0}javascript:alert(1)`, " JaVaScRiPt:alert(1)", "data:text/html,x", "vbscript:x", "file:///etc/passwd", "//evil.example.org/x", "/\\evil.example.org", "https://u:p@example.org/", "ftp://example.org/x", "arsiv/goreli"]) {
    assert.equal(isSafeHref(bad), false, JSON.stringify(bad));
    assert.equal(isSafeUrl(bad), false, JSON.stringify(bad));
  }
  assert.equal(safeHref("/arsiv/cumhuriyetin-ilani"), "/arsiv/cumhuriyetin-ilani");
  assert.equal(safeHref("https://tbmm.gov.tr/arsiv/123"), "https://tbmm.gov.tr/arsiv/123");
});

test("SEC-V10-02 okuma listesi içe aktarımı gizlenmiş javascript: URL'sini kabul etmez", () => {
  const result = validateArchiveRef({ id: "kayit-1", title: "Kayıt", url: `java${String.fromCharCode(9)}script:alert(1)` });
  assert.equal(result.valid, false);
  assert.equal(validateArchiveRef({ id: "kayit-1", title: "Kayıt" }).sanitized.url, "/arsiv/kayit-1");
});

test("SEC-V10-03 arşiv etiketleri teknik 'published' durumunu uzman onayı gibi göstermez", async () => {
  const source = readFileSync(path.join(webRoot, "lib/archive.ts"), "utf8");
  const body = /export function reviewLabel\(status: VerificationStatus\) \{([^\n]*)\}/.exec(source)?.[1];
  assert.ok(body, "reviewLabel bulunamadı");
  const reviewLabel = new Function("status", body);
  assert.match(reviewLabel("published"), /uzman onayı bekliyor/);
  for (const status of ["published", "reviewed", "draft"]) assert.equal(/onaylı|doğrulanmış/i.test(reviewLabel(status)), false, status);
});

test("SEC-V10-04 yönetim oturumu ve editoryal güven sağlayıcısı kayıtlı değil (fail-closed)", () => {
  const auth = readFileSync(path.join(webRoot, "lib/admin-v08/auth.ts"), "utf8");
  assert.match(auth, /REGISTERED_ADMIN_SESSION_PROVIDER: SessionProvider \| null = null;/);
  const configuration = readFileSync(path.join(webRoot, "lib/editorial-trust/configuration.ts"), "utf8");
  assert.match(configuration, /REGISTERED_IDENTITY_PROVIDER: TrustedIdentityProvider \| null = null;/);
  assert.match(configuration, /ACTIVE_EDITORIAL_POLICY: EditorialPolicy \| null = null;/);
});
