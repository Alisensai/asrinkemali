import test from "node:test";
import assert from "node:assert/strict";
import {
  foldTurkish,
  slugify,
  createAuthorityId,
  validateEntity,
  createObservation,
  ENTITY_KINDS,
} from "../src/model.mjs";

test("model - foldTurkish doğru çalışır", () => {
  assert.equal(foldTurkish("İstanbul"), "istanbul");
  assert.equal(foldTurkish("IŞIK"), "isik");
  assert.equal(foldTurkish("ÇANKAYA"), "cankaya");
  assert.equal(foldTurkish("Atatürk'ün"), "ataturkun");
  assert.equal(foldTurkish("ÖĞRETMEN"), "ogretmen");
});

test("model - slugify doğru slug üretir", () => {
  assert.equal(slugify("Mustafa Kemal Atatürk"), "mustafa-kemal-ataturk");
  assert.equal(slugify("TBMM 1. Birleşim"), "tbmm-1-birlesim");
  assert.equal(slugify("İzmir'in Kurtuluşu"), "izmirin-kurtulusu");
});

test("model - createAuthorityId deterministik ID üretir", () => {
  const id1 = createAuthorityId("person", "Mustafa Kemal Paşa");
  const id2 = createAuthorityId("person", "Mustafa Kemal Paşa");
  assert.equal(id1, id2);
  assert.equal(id1, "mka:person:mustafa-kemal-pasa");

  assert.throws(() => {
    createAuthorityId("invalid_kind", "Ali");
  }, /Geçersiz varlık türü/);

  assert.throws(() => {
    createAuthorityId("person", "");
  }, /Varlık kimliği oluşturulamadı/);
});

test("model - validateEntity geçerli ve geçersiz nesneleri ayırt eder", () => {
  const validEntity = {
    schemaVersion: "1.0.0",
    authorityId: "mka:person:mustafa-kemal-ataturk",
    kind: "person",
    preferredLabel: "Mustafa Kemal Atatürk",
    aliases: ["Gazi Mustafa Kemal"],
    sourceRecordReferences: [{ recordId: "nutuk-1927" }],
    recordRefs: [{ recordId: "nutuk-1927" }],
    status: "provisional",
    humanApproval: null,
  };
  const val = validateEntity(validEntity);
  assert.equal(val.valid, true);

  // Sahte onay denetimi: verifiedBy olmayan nesne reddedilmeli
  const invalidApproval = {
    ...validEntity,
    humanApproval: { verifiedBy: "", role: "expert_historian" },
  };
  const val2 = validateEntity(invalidApproval);
  assert.equal(val2.valid, false);

  // Geçersiz ID formatı
  const invalidId = {
    ...validEntity,
    authorityId: "random_id_without_prefix",
  };
  const val3 = validateEntity(invalidId);
  assert.equal(val3.valid, false);
});

test("model - createObservation gözlem nesnesi üretir", () => {
  const obs = createObservation({
    recordId: "nutuk-1927",
    sourcePath: "people[0]",
    observedText: "Mustafa Kemal Paşa",
    role: "author",
  });
  assert.equal(obs.recordId, "nutuk-1927");
  assert.equal(obs.sourcePath, "people[0]");
  assert.equal(obs.role, "author");
  assert.equal(obs.normalizedText, "mustafa kemal pasa");
  assert.ok(obs.observationId.startsWith("obs:nutuk-1927:"));
});
