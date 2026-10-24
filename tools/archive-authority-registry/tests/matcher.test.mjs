import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveAliasToAuthorityId,
  matchCandidate,
  isHardNegativePair,
  enhanceEntitiesWithAliases,
} from "../src/matcher.mjs";

test("matcher - resolveAliasToAuthorityId bilinen takma adları çözer", () => {
  assert.equal(
    resolveAliasToAuthorityId("Gazi Mustafa Kemal Paşa", "person"),
    "mka:person:mustafa-kemal-ataturk"
  );
  assert.equal(
    resolveAliasToAuthorityId("İsmet Paşa", "person"),
    "mka:person:ismet-inonu"
  );
  assert.equal(
    resolveAliasToAuthorityId("TBMM", "institution"),
    "mka:institution:turkiye-buyuk-millet-meclisi"
  );
  assert.equal(
    resolveAliasToAuthorityId("Dersaadet", "place"),
    "mka:place:istanbul"
  );
});

test("matcher - isHardNegativePair adaş şahsiyetleri tespit eder", () => {
  const check1 = isHardNegativePair("mka:person:ali-riza-efendi", "mka:person:ali-riza-pasa");
  assert.equal(check1.isHardNegative, true);
  assert.ok(check1.reason.includes("Ali Rıza Efendi"));

  const check2 = isHardNegativePair("mka:person:ali-riza-pasa", "mka:person:ali-riza-efendi");
  assert.equal(check2.isHardNegative, true);

  const checkNeutral = isHardNegativePair("mka:person:mustafa-kemal-ataturk", "mka:person:ismet-inonu");
  assert.equal(checkNeutral.isHardNegative, false);
});

test("matcher - matchCandidate tam, normalize ve aday puanlarını hesaplar", () => {
  const targetEntity = {
    authorityId: "mka:person:mustafa-kemal-ataturk",
    kind: "person",
    preferredLabel: "Mustafa Kemal Atatürk",
    aliases: ["Gazi Mustafa Kemal", "Atatürk"],
  };

  // Tam eşleşme
  const match1 = matchCandidate("Mustafa Kemal Atatürk", targetEntity);
  assert.equal(match1.score, 100);
  assert.equal(match1.requiresHumanReview, false);

  // Normalize eşleşme
  const match2 = matchCandidate("mustafa kemal ataturk", targetEntity);
  assert.equal(match2.score, 95);

  // Alias eşleşmesi
  const match3 = matchCandidate("Gazi Mustafa Kemal", targetEntity);
  assert.equal(match3.score, 90);

  // Hard negative engeli
  const aliRizaPasa = {
    authorityId: "mka:person:ali-riza-pasa",
    kind: "person",
    preferredLabel: "Ali Rıza Paşa",
  };
  const matchHN = matchCandidate("Ali Rıza Efendi", aliRizaPasa);
  assert.equal(matchHN.isHardNegative, true);
  assert.equal(matchHN.score, 0);
  assert.ok(matchHN.reasonCodes.includes("HARD_NEGATIVE_DISTINCT_ENTITY"));
});

test("matcher - enhanceEntitiesWithAliases varlıklara alias ekler", () => {
  const entities = [
    {
      authorityId: "mka:person:mustafa-kemal-ataturk",
      preferredLabel: "Mustafa Kemal Atatürk",
      aliases: [],
    },
  ];
  enhanceEntitiesWithAliases(entities);
  assert.ok(entities[0].aliases.includes("Gazi Mustafa Kemal"));
  assert.ok(entities[0].aliases.includes("Mustafa Kemal Paşa"));
});
