import assert from "node:assert/strict";
import test from "node:test";
import { unavailableReadingListsRepository } from "../lib/reading-lists/repository.ts";
import { validateCollection } from "../lib/reading-lists/validation.ts";
import { createLocalReadingListsRepository } from "../lib/reading-lists/local-repository.ts";
const item = { recordId: "cumhuriyetin-ilani-1923", addedAt: "2026-10-24T00:00:00.000Z", readLater: true, note: "", snapshot: { recordId: "cumhuriyetin-ilani-1923", slug: "cumhuriyetin-ilani-1923", title: "Kayıt", dateDisplay: "1923", sourceInstitution: "ATAM", type: "event" } };
test("aynı arşiv kaydı koleksiyona iki kez eklenemez", () => assert.equal(validateCollection({ id:"reading-001",name:"Liste",description:"",createdAt:"x",updatedAt:"x",items:[item,item] }), false));
test("sunucu eşitlemesi sağlayıcı yokken kapalı kalır", () => { assert.equal(unavailableReadingListsRepository.mode,"unavailable"); assert.throws(() => unavailableReadingListsRepository.save({})); });
test("yerel repository yalnız doğrulanmış koleksiyonu tarayıcı alanında tutar", () => { const values = new Map(); const storage = { getItem:(key)=>values.get(key) ?? null, setItem:(key,value)=>values.set(key,value) }; const repo=createLocalReadingListsRepository(storage); const collection={ id:"reading-001",name:"Liste",description:"",createdAt:"x",updatedAt:"x",items:[item] }; repo.save(collection); assert.equal(repo.list()[0].items[0].snapshot.slug,"cumhuriyetin-ilani-1923"); });
