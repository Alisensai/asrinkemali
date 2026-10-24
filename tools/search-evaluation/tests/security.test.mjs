import test from "node:test";
import assert from "node:assert/strict";
import { escapeCsvCell } from "../src/cli.mjs";

test("security - escapeCsvCell CSV formül enjeksiyonunu engeller", () => {
  // Formül başlatıcı karakterler: =, +, -, @, \t, \r
  assert.equal(escapeCsvCell("=SUM(A1:A10)"), "'=SUM(A1:A10)");
  assert.equal(escapeCsvCell("+12345"), "'+12345");
  assert.equal(escapeCsvCell("-CMD('calc')"), "'-CMD('calc')");
  assert.equal(escapeCsvCell("@IMPORT"), "'@IMPORT");
  assert.equal(escapeCsvCell("\tTABBED"), "'\tTABBED");
  assert.equal(escapeCsvCell("  LEADING_SPACE"), "'  LEADING_SPACE");

  // Normal metin çift tırnak içine alınır
  assert.equal(escapeCsvCell("Normal Metin"), '"Normal Metin"');
  assert.equal(escapeCsvCell('Metin "ile" tırnak'), '"Metin ""ile"" tırnak"');
});
