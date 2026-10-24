import test from "node:test";
import assert from "node:assert/strict";
import { extractEntitiesFromRecords } from "../src/extractor.mjs";

test("extractor - extractEntitiesFromRecords varlık ve gözlemleri doğru çıkarır", () => {
  const dummyRecords = [
    {
      id: "test-rec-1",
      title: "Nutuk Okunurken",
      type: "event",
      people: [
        { name: "Mustafa Kemal Atatürk", role: "speaker" },
        { name: "İsmet Paşa", role: "official" },
      ],
      locations: [
        { name: "Ankara", city: "Ankara", country: "Türkiye" },
        { name: "İstanbul", city: "İstanbul", country: "Türkiye" },
      ],
      source: {
        institution: "TBMM",
        institutionType: "archive",
        title: "Nutuk Tutanakları",
      },
      provenance: [
        { institution: "Millî Kütüphane" }
      ],
    },
    {
      id: "test-rec-2",
      title: "Samsun'a Çıkış",
      type: "event",
      people: [
        { name: "Mustafa Kemal Paşa", role: "official" },
      ],
      locations: [
        { name: "Samsun", city: "Samsun", country: "Türkiye" },
      ],
      source: {
        institution: "TBMM",
        title: "Askerî Rapor",
      },
    },
  ];

  const result = extractEntitiesFromRecords(dummyRecords);

  assert.equal(result.persons.length, 3); // Mustafa Kemal Atatürk, İsmet Paşa, Mustafa Kemal Paşa (provisional)
  assert.equal(result.places.length, 3); // Ankara, İstanbul, Samsun
  assert.equal(result.institutions.length, 2); // TBMM, Millî Kütüphane
  assert.equal(result.events.length, 2); // Nutuk Okunurken, Samsun'a Çıkış
  assert.equal(result.sourceWorks.length, 2); // Nutuk Tutanakları, Askerî Rapor
  assert.ok(result.observations.length >= 10);

  // Rol kontrolü
  const mka = result.persons.find((p) => p.preferredLabel === "Mustafa Kemal Atatürk");
  assert.ok(mka);
  assert.deepEqual(mka.roles, ["speaker"]);
  assert.equal(mka.recordRefs.length, 1);
  assert.equal(mka.recordRefs[0].recordId, "test-rec-1");
});
