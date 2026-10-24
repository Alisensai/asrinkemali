import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { resolveSourceTrust, sourceBadgeText } from "../lib/exhibitions/source-trust.ts";
import { isSafeHref } from "../lib/security/safe-url.ts";

// V1.0 arayüz güvenlik düzeltmesi — sahte güven rozeti ve TextLink URL kontrolü.
const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exhibitionsDir = path.join(webRoot, "components", "exhibitions");
const read = (...parts) => readFileSync(path.join(webRoot, ...parts), "utf8");

test("[V10-FE-01] Sentetik ve staging sergi kaynakları hiçbir koşulda doğrulanmış sayılmaz", () => {
  for (const verifiedApproval of [false, true]) {
    for (const trustConfigured of [false, true]) {
      assert.equal(resolveSourceTrust({ isSyntheticPreview: true, isStagingDraft: true, verifiedApproval, trustConfigured }).state, "synthetic_preview");
      assert.equal(resolveSourceTrust({ isSyntheticPreview: false, isStagingDraft: true, verifiedApproval, trustConfigured }).state, "staging_draft");
    }
  }
  assert.match(resolveSourceTrust({ isSyntheticPreview: true, isStagingDraft: false }).label, /SENTETİK/);
  assert.match(resolveSourceTrust({ isSyntheticPreview: false, isStagingDraft: true }).label, /STAGING/);
});

test("[V10-FE-02] Doğrulanmış rozet yalnız güven katmanı + doğrulanmış onay ile verilir; bugün yapılandırma yok", () => {
  const base = { isSyntheticPreview: false, isStagingDraft: false };
  assert.equal(resolveSourceTrust(base).state, "pending_review");
  // Yapılandırma yokken onay iddiası tek başına yetmez (repo varsayılanı).
  assert.equal(resolveSourceTrust({ ...base, verifiedApproval: true }).state, "pending_review");
  assert.equal(resolveSourceTrust({ ...base, trustConfigured: true, verifiedApproval: false }).state, "pending_review");
  const verified = resolveSourceTrust({ ...base, trustConfigured: true, verifiedApproval: true });
  assert.equal(verified.state, "verified");
  assert.equal(verified.label, "DOĞRULANMIŞ KAYNAK");
});

test("[V10-FE-03] Sergi verisindeki serbest metin rozet yalnız doğrulanmış durumda gösterilir", () => {
  const pending = resolveSourceTrust({ isSyntheticPreview: true, isStagingDraft: true });
  assert.equal(sourceBadgeText("Doğrulanmış Kurumsal Kaynak", pending), pending.label);
  assert.doesNotMatch(sourceBadgeText("Doğrulanmış Kurumsal Kaynak", pending), /DOĞRULANMIŞ KAYNAK|Doğrulanmış/);
  const verified = resolveSourceTrust({ isSyntheticPreview: false, isStagingDraft: false, trustConfigured: true, verifiedApproval: true });
  assert.equal(sourceBadgeText("Resmî Kurumsal Arşiv", verified), "Resmî Kurumsal Arşiv");
});

test("[V10-FE-04] Sergi bileşenlerinde sabit isVerified veya ham verificationBadge rozeti kalmadı", () => {
  const files = readdirSync(exhibitionsDir).filter((f) => f.endsWith(".tsx"));
  for (const file of files) {
    const src = readFileSync(path.join(exhibitionsDir, file), "utf8");
    assert.doesNotMatch(src, /isVerified\s*:\s*true/, file);
    assert.doesNotMatch(src, /\{\s*src\.verificationBadge\s*\}/, file);
    // Kaynak bağlantıları FORTRESS izin listesinden geçer.
    assert.doesNotMatch(src, /href=\{\s*(src|source)\.sourceUrl\s*\}/, file);
  }
  const view = read("components", "exhibitions", "ExhibitionView.tsx");
  assert.match(view, /resolveSourceTrust\(/);
  assert.doesNotMatch(view, /reviewStatus=\{exhibition\.editorialReview\.status\}/);
  for (const file of ["VirtualGalleryRoom.tsx", "ExhibitionSectionRenderer.tsx"]) {
    assert.match(read("components", "exhibitions", file), /sourceBadgeText\(src\.verificationBadge, trust\)/, file);
  }
});

test("[V10-FE-05] TextLink yasak listesi yerine safe-url izin listesini kullanır", () => {
  const src = read("components", "design-system", "TextLink.tsx");
  assert.match(src, /from "@\/lib\/security\/safe-url"/);
  assert.doesNotMatch(src, /startsWith\("javascript:"\)/);
  assert.doesNotMatch(src, /:\s*"#"/, "güvensiz adres işlevsiz # bağlantısına dönmemeli");

  const TAB = String.fromCharCode(9);
  const LF = String.fromCharCode(10);
  const SOH = String.fromCharCode(1);
  const NUL = String.fromCharCode(0);
  const bypasses = [
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    `java${TAB}script:alert(1)`,
    `java${LF}script:alert(1)`,
    `${SOH}javascript:alert(1)`,
    `${NUL} javascript:alert(1)`,
    " data:text/html,<script>alert(1)</script>",
    `da${TAB}ta:text/html,x`,
    "vbscript:msgbox(1)",
    "//evil.example/x",
    `/${String.fromCharCode(92)}evil.example`,
    "https://user:pass@example.org/",
    "file:///etc/passwd",
    "",
  ];
  for (const bad of bypasses) assert.equal(isSafeHref(bad), false, JSON.stringify(bad));
  for (const good of ["/arsiv", "/kronoloji?yil=1923", "https://www.tbmm.gov.tr"]) assert.equal(isSafeHref(good), true, good);
});

test("[V10-FE-06] Sergi bileşenlerinin kullandığı her CSS modül sınıfı tanımlı (stilsiz sergi gövdesi kalmaz)", () => {
  const css = readFileSync(path.join(exhibitionsDir, "exhibitions.module.css"), "utf8");
  const defined = new Set([...css.matchAll(/\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]));
  const missing = [];
  for (const file of readdirSync(exhibitionsDir).filter((f) => f.endsWith(".tsx"))) {
    const src = readFileSync(path.join(exhibitionsDir, file), "utf8");
    for (const [, name] of src.matchAll(/styles\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
      if (!defined.has(name)) missing.push(`${file}:${name}`);
    }
  }
  assert.deepEqual([...new Set(missing)], []);
});
