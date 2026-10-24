import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { editorialTrustConfigured } from "../lib/editorial-trust/configuration.ts";
import { canExposePublicExhibition, isExhibitionPublishable } from "../lib/exhibitions/workflow.ts";
import { csvCell } from "../lib/research-evidence/csv.ts";

// V0.9 bağımsız güvenlik denetimi — regresyon testleri.
const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webRoot, "..");
const staging = JSON.parse(readFileSync(path.join(repoRoot, "content/exhibitions/staging/cumhuriyetin-ilani.json"), "utf8"));

/** Staging kaydını "yayındaymış gibi" gösteren, kendi beyanıyla onaylı kopya (saldırı senaryosu). */
const selfDeclared = { ...staging, editorialReview: { ...staging.editorialReview, status: "published", isSyntheticPreview: false, reviewedBy: "Asrın Kemali Araştırma ve Küratörlük Kurulu" } };

test("SEC-V09-01 kayıt içi 'published' + serbest metin reviewedBy sergiyi kamuya açmaz", () => {
  assert.equal(editorialTrustConfigured(), false, "repoda güvenilir kimlik sağlayıcısı/politika yok");
  assert.equal(canExposePublicExhibition(selfDeclared), false);
  assert.equal(isExhibitionPublishable(selfDeclared), false);
});

test("SEC-V09-01 güven katmanı yapılandırılsa bile doğrulanmış onay olmadan kapalı; ikisi birlikte gerekir", () => {
  assert.equal(canExposePublicExhibition(selfDeclared, { trustConfigured: true, verifiedApproval: false }), false);
  assert.equal(canExposePublicExhibition(selfDeclared, { trustConfigured: false, verifiedApproval: true }), false);
  // Sözleşme: ileride gerçek karar deposu doğrulanmış onay verdiğinde kapı açılabilir.
  assert.equal(canExposePublicExhibition(selfDeclared, { trustConfigured: true, verifiedApproval: true }), true);
  // Sentetik önizleme her koşulda kapalı.
  assert.equal(canExposePublicExhibition(staging, { trustConfigured: true, verifiedApproval: true }), false);
});

test("SEC-V09-02 CSV önekli hücre her zaman tırnaklanır; virgül satırı bölmez", () => {
  const row = ["e1", '=HYPERLINK("x"),y', "son"].map(csvCell).join(",");
  assert.equal(row, '"e1","\'=HYPERLINK(""x""),y","son"');
  const fields = row.match(/"(?:[^"]|"")*"/g);
  assert.equal(fields.length, 3);
  for (const dangerous of ["=1", "+cmd", "-10", "@x", "\tx", " x"]) assert.ok(csvCell(dangerous).startsWith(`"'`), dangerous);
  assert.equal(csvCell(null), '""');
});

test("SEC-V09-02 export route ortak csvCell'i kullanır ve production kapısını korur", () => {
  const route = readFileSync(path.join(webRoot, "app/api/arastirma-laboratuvari/export/route.ts"), "utf8");
  assert.match(route, /import \{ csvCell \} from "@\/lib\/research-evidence\/csv";/);
  assert.equal(/function csvCell/.test(route), false, "yerel kusurlu kopya kaldırıldı");
  assert.match(route, /"x-content-type-options": "nosniff"/);
  const guard = route.indexOf("if (!researchLabEnabled())");
  assert.ok(guard > 0 && guard < route.indexOf("loadWorkbench()"));
});

test("SEC-V09-03 FORTRESS: araştırma kapısı production'da bayraktan bağımsız kapalı", () => {
  const gate = readFileSync(path.join(webRoot, "lib/research-evidence/candidates.ts"), "utf8");
  const body = /export function researchLabEnabled\(\): boolean \{([\s\S]*?)\n\}/.exec(gate)?.[1];
  const enabled = (env) => new Function("process", body)({ env });
  assert.equal(enabled({ NODE_ENV: "production", MKA_RESEARCH_LAB: "1" }), false);
  assert.equal(enabled({ NODE_ENV: "development" }), false);
});
