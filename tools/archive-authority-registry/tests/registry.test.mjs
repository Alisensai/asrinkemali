import test from "node:test";
import assert from "node:assert/strict";
import { AuthorityRegistry } from "../src/registry.mjs";

const dummyRecords = [
  {
    id: "rec-test-1",
    title: "Mustafa Kemal Paşa TBMM Konuşması",
    type: "event",
    people: [{ name: "Mustafa Kemal Paşa", role: "speaker" }],
    locations: [{ name: "Ankara", city: "Ankara" }],
    source: { institution: "TBMM", title: "TBMM Ceridesi" },
  },
  {
    id: "rec-test-2",
    title: "Cumhuriyet İlanı",
    type: "event",
    people: [
      { name: "Mustafa Kemal Atatürk", role: "official" },
      { name: "İsmet İnönü", role: "official" },
    ],
    locations: [{ name: "Ankara", city: "Ankara" }],
    source: { institution: "TBMM", title: "Zabıt Ceridesi" },
  },
];

test("registry - AuthorityRegistry initSync ve arama işlemleri", () => {
  const reg = new AuthorityRegistry();
  reg.initSync(dummyRecords);

  assert.equal(reg.initialized, true);
  const summary = reg.getSummary();
  assert.ok(summary.totalEntities >= 3);
  assert.ok(summary.totalObservations >= 5);

  // resolve alias
  const resolved = reg.resolve("Gazi Paşa", "person");
  assert.ok(resolved);
  assert.equal(resolved.authorityId, "mka:person:mustafa-kemal-ataturk");

  // search
  const searchResults = reg.search("İsmet");
  assert.ok(searchResults.length >= 1);
  assert.ok(searchResults[0].entity.preferredLabel.includes("İsmet"));

  // validation
  const val = reg.validate();
  assert.equal(val.valid, true);
});

test("registry - graph ve döngü denetimi", () => {
  const reg = new AuthorityRegistry();
  reg.initSync(dummyRecords);

  assert.ok(reg.graph);
  assert.ok(reg.graph.nodes.size > 0);
  assert.ok(reg.graph.edges.length > 0);
  assert.equal(reg.graph.hasCycle("part_of"), false);
});
