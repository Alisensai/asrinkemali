import assert from "node:assert/strict";
import test from "node:test";

import { runScale } from "../bench/scale.mjs";

test("S500 sentetik ölçek: eşleşme, eksik ve stale sayıları doğru; hiçbiri yayına hazır değil", () => {
  const result = runScale(500);
  assert.equal(result.scanned, 500);
  assert.equal(result.missingForms, 5);
  assert.equal(result.matchedForms, 495);
  // Her 20. form stale (25), bunların 5'inin formu zaten yok (100'ün katları).
  assert.equal(result.stale, 20);
  assert.equal(result.rightsBlocked, 10);
  assert.equal(result.releaseReady, 0);
  assert.equal(result.unreadable, 0);
});
