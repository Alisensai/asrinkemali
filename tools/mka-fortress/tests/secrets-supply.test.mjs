import assert from "node:assert/strict";
import test from "node:test";
import { fingerprint, scanText } from "../secrets.mjs";
import { auditLockfile, auditWorkflow, lockDiff, possiblyUnused } from "../supply-chain.mjs";

// Sahte sırlar çalışma anında birleştirilir; böylece bu test dosyası taramada kendini yakalamaz.
const join = (...parts) => parts.join("");

test("sır taraması gerçek desenleri yakalar ve değeri asla raporlamaz", () => {
  const github = join("gh", "p_", "Ab3".repeat(12));
  const aws = join("AK", "IA", "ABCDEFGHIJKLMNOP");
  const text = `const a = "${github}";\nkey=${aws}\n${join("-----BEGIN ", "RSA PRIVATE KEY-----")}\napi_key = "${join("Zq8", "xW2vPn7LmR4tYb")}"`;
  const findings = scanText(text, "ornek.js");
  assert.deepEqual(findings.map((item) => item.rule).sort(), ["assigned-secret", "aws-access-key", "github-token", "private-key-block"]);
  for (const finding of findings) { assert.ok(!JSON.stringify(finding).includes(github)); assert.ok(!JSON.stringify(finding).includes(aws)); }
  assert.equal(fingerprint(github), `ghp_…(${github.length})`);
});

test("yer tutucular ve düşük entropili örnekler yanlış alarm üretmez", () => {
  assert.deepEqual(scanText('password = "changeme-changeme"\napi_key = "aaaaaaaaaaaaaaaa"\ntoken: "<YOUR_TOKEN_HERE>"', "ornek.md"), []);
});

test("kilit dosyası: kayıt defteri dışı kaynak, zayıf bütünlük ve package.json uyumsuzluğu yakalanır", () => {
  const pkg = { dependencies: { next: "16.4.2" }, devDependencies: { eslint: "9.39.5" } };
  const lock = { lockfileVersion: 3, packages: { "": { dependencies: { next: "16.4.2" }, devDependencies: { eslint: "9.0.0" } }, "node_modules/next": { version: "16.4.2", resolved: "https://registry.npmjs.org/next/-/next-16.4.2.tgz", integrity: "sha512-abc" }, "node_modules/kotu": { version: "1.0.0", resolved: "http://ornek.invalid/kotu.tgz", integrity: "sha1-abc" } } };
  const codes = auditLockfile(pkg, lock).problems.map((problem) => problem.code);
  for (const code of ["LOCK_SPEC_MISMATCH", "LOCK_MISSING_PACKAGE", "NON_REGISTRY_SOURCE", "WEAK_OR_MISSING_INTEGRITY"]) assert.ok(codes.includes(code), code);
});

test("iş akışı denetimi: yazma yetkisi, SHA'sız eylem, pull_request_target ve güvenilmeyen girdi", () => {
  const findings = auditWorkflow("x.yml", "on: pull_request_target\npermissions:\n  contents: write\njobs:\n  a:\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020\n      - run: echo ${{ github.event.pull_request.title }}\n");
  const codes = findings.map((finding) => finding.code);
  for (const code of ["WRITE_PERMISSION", "PULL_REQUEST_TARGET", "ACTION_NOT_SHA_PINNED", "UNTRUSTED_INPUT_IN_EXPRESSION"]) assert.ok(codes.includes(code), code);
  assert.equal(findings.filter((finding) => finding.code === "ACTION_NOT_SHA_PINNED").length, 1, "SHA ile sabitlenen eylem kabul edilir");
  assert.ok(auditWorkflow("y.yml", "jobs: {}").some((finding) => finding.code === "NO_TOP_LEVEL_PERMISSIONS"));
});

test("kilit farkı ve olası kullanılmayan bağımlılık raporu", () => {
  const before = { packages: { "": {}, "node_modules/a": { version: "1.0.0" }, "node_modules/b": { version: "2.0.0" } } };
  const after = { packages: { "": {}, "node_modules/a": { version: "1.1.0" }, "node_modules/c": { version: "3.0.0" } } };
  assert.deepEqual(lockDiff(before, after).map((change) => `${change.location}:${change.change}`).sort(), ["node_modules/a:updated", "node_modules/b:removed", "node_modules/c:added"]);
  assert.deepEqual(possiblyUnused([{ name: "lodash" }, { name: "react" }, { name: "typescript" }], 'import React from "react";'), ["lodash"]);
});
