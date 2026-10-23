import test from "node:test";
import assert from "node:assert/strict";

import { auditImageRights, classifyImageRights } from "../src/rights.mjs";
import { makeImageRecord, makeRecord } from "./fixtures.mjs";

test("bağlantı-only görsel yeniden kullanım hakkı doğrulanmamış sayılır", () => {
  const result = classifyImageRights(makeImageRecord({ id: "link-only" }));
  assert.equal(result.classification, "link_only_unverified");
  assert.equal(result.evidence.reuseVerified, false);
  assert.ok(result.flags.includes("reuse_rights_not_verified"));
  assert.ok(result.flags.includes("missing_license_evidence"));
  assert.ok(result.flags.includes("link_only_display_policy"));
});

test("lisanslı kamu malı görsel doğrulanmış sayılır", () => {
  const result = classifyImageRights(
    makeImageRecord({
      id: "public-domain",
      rights: { status: "public_domain", license: "Public Domain", imageReuse: "permitted" },
    })
  );
  assert.equal(result.classification, "verified_reuse");
  assert.equal(result.evidence.reuseVerified, true);
  assert.equal(result.flags.includes("reuse_rights_not_verified"), false);
});

test("lisans kanıtı olmayan açık lisans iddiası doğrulanmış sayılmaz", () => {
  const result = classifyImageRights(
    makeImageRecord({
      id: "open-without-license",
      rights: { status: "open_license", license: null, imageReuse: "permitted" },
    })
  );
  assert.equal(result.classification, "claimed_open_without_license");
  assert.equal(result.evidence.reuseVerified, false);
});

test("bilinmeyen ve izin gereken hak durumları ayrı sınıflanır", () => {
  const unknown = classifyImageRights(makeImageRecord({ id: "unknown", rights: { status: "unknown" } }));
  assert.equal(unknown.classification, "unknown");
  assert.equal(unknown.reuseStatus, "unknown");
  const permission = classifyImageRights(makeImageRecord({ id: "permission", rights: { status: "permission_required" } }));
  assert.equal(permission.classification, "permission_required");
  assert.equal(permission.reuseStatus, "permission_required");
});

test("AI temsili görsel ve gösterilmeyen görsel işaretlenmez", () => {
  const ai = classifyImageRights(
    makeImageRecord({
      id: "ai",
      image: { kind: "ai_representative", displayPolicy: "not_displayed", sourcePageUrl: null },
      rights: { status: "ai_representative", imageReuse: "unknown" },
    })
  );
  assert.equal(ai.classification, "ai_representative");
  assert.equal(ai.evidence.reuseVerified, false);
  const notDisplayed = classifyImageRights(
    makeImageRecord({ id: "not-displayed", image: { displayPolicy: "not_displayed" } })
  );
  assert.equal(notDisplayed.classification, "not_displayed");
});

test("kaynak sayfası olmayan görsel işaretlenir", () => {
  const record = makeImageRecord({ id: "no-page" });
  record.image.sourcePageUrl = null;
  const result = classifyImageRights(record);
  assert.ok(result.flags.includes("missing_source_page_url"));
});

test("görsel hak denetimi özeti ve iş listesini üretir", () => {
  const records = [
    makeImageRecord({ id: "link-only" }),
    makeImageRecord({ id: "public-domain", rights: { status: "public_domain", license: "Public Domain", imageReuse: "permitted" } }),
    makeRecord({ id: "unknown-no-image", rights: { status: "unknown" } }),
  ];
  const result = auditImageRights(records);
  assert.equal(result.summary.totalImages, 2);
  assert.equal(result.summary.verifiedReuseImages, 1);
  assert.equal(result.summary.flaggedImages, 1);
  assert.equal(result.summary.recordsWithUnknownRights, 1);
  assert.equal(result.flagged[0].recordId, "link-only");
  assert.equal(result.unknownRightsRecords[0].recordId, "unknown-no-image");
});
