import assert from "node:assert/strict";
import test from "node:test";
import {
  getRegistrySummary,
  getAuthorityEntity,
  searchAuthorities,
  getAtlasPlaces,
  getChronologyEvents,
} from "../lib/authority-registry/index.ts";

test("Task 06 Web Bridge: getRegistrySummary salt-okunur otorite özetini döndürür", async () => {
  const summary = await getRegistrySummary();
  assert.ok(summary.totalEntities >= 2);
  assert.ok(summary.persons >= 1);
  assert.ok(summary.places >= 1);
  assert.ok(["active", "cached_fallback"].includes(summary.adapterStatus));
});

test("Task 06 Web Bridge: getAuthorityEntity Atatürk otoritesini ve takma adlarını döner", async () => {
  const entity = await getAuthorityEntity("mka:person:mustafa-kemal-ataturk");
  assert.ok(entity);
  assert.equal(entity.preferredLabel, "Mustafa Kemal Atatürk");
  assert.equal(entity.kind, "person");
  assert.ok(Array.isArray(entity.aliases));
  assert.ok(entity.aliases.includes("Gazi Mustafa Kemal"));
  assert.equal(entity.status, "provisional");
});

test("Task 06 Web Bridge: searchAuthorities ad veya takma ada göre arama yapar", async () => {
  const results = await searchAuthorities("Ankara", "place");
  assert.ok(results.length >= 1);
  assert.equal(results[0].preferredLabel, "Ankara");
});

test("Task 06 Web Bridge: getAtlasPlaces sahte koordinat uydurmaz (coords: null)", async () => {
  const places = await getAtlasPlaces();
  assert.ok(places.length >= 1);
  for (const place of places) {
    assert.equal(place.coords, null, "Kanıtsız koordinat uydurulmamalıdır");
    assert.equal(place.geoStatus, "unknown");
    assert.ok(Array.isArray(place.linkedArchiveRecordIds));
  }
});

test("Task 06 Web Bridge: getChronologyEvents tarihli olayları sunar", async () => {
  const events = await getChronologyEvents();
  assert.ok(Array.isArray(events));
});
