import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  ARCHITECTURE_STATES,
  ASVS_STATUSES,
  CONTROL_STATES,
  buildReport,
  deriveRisk,
  renderArchitecture,
  renderMarkdown,
  validateAssessment,
  validateReportShape,
} from "../engine.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../");
const assessment = JSON.parse(await readFile(resolve(repoRoot, "tools/threat-assurance/assessment.json"), "utf8"));
const schema = JSON.parse(await readFile(resolve(repoRoot, "tools/threat-assurance/schema.json"), "utf8"));
const clone = () => structuredClone(assessment);
const issuesFor = (candidate) => validateAssessment(candidate, { repoRoot });

test("the reviewed source control list is complete and contains 99 controls", () => {
  assert.equal(assessment.controls.length, 99);
  assert.deepEqual(issuesFor(assessment), []);
});

test("control ids are ordered exactly from 1 through 99", () => {
  assert.deepEqual(assessment.controls.map(({ id }) => id), Array.from({ length: 99 }, (_, i) => i + 1));
});

test("control names and order match the recorded PR 71 source-list digest", () => {
  const data = clone();
  data.controls[15].name = "Altered control label";
  assert.ok(issuesFor(data).some((issue) => /source-list SHA-256/.test(issue)));
  assert.match(assessment.controlSource.sha256, /^[0-9a-f]{64}$/);
});

test("the first numbered control is NGFW, not the unnumbered Firewall heading", () => {
  assert.equal(assessment.controls[0].name, "Next-Generation Firewall (NGFW)");
});

test("the final source control is PROJECT BLACKOUT", () => {
  assert.equal(assessment.controls.at(-1).id, 99);
  assert.match(assessment.controls.at(-1).name, /^PROJECT BLACKOUT/);
});

test("control state counts sum to 99 and all statuses are recognized", () => {
  const total = assessment.controls.reduce((count, item) => count + CONTROL_STATES.has(item.state), 0);
  assert.equal(total, 99);
  assert.equal(Object.values(buildReport(assessment).summary.controlStates).reduce((a, b) => a + b, 0), 99);
});

test("each control has a present-state note, gap, and remediation", () => {
  for (const item of assessment.controls) {
    assert.ok(item.currentControl.trim(), `control ${item.id}`);
    assert.ok(item.gap.trim(), `control ${item.id}`);
    assert.ok(item.remediation.trim(), `control ${item.id}`);
  }
});

test("source mapping does not use unsupported production status labels", () => {
  for (const item of assessment.controls) assert.ok(CONTROL_STATES.has(item.state));
});

test("duplicate control identifiers are rejected", () => {
  const data = clone();
  data.controls[1].id = 1;
  assert.ok(issuesFor(data).some((issue) => /Duplicate control id/.test(issue)));
});

test("missing controls are rejected", () => {
  const data = clone();
  data.controls.pop();
  assert.ok(issuesFor(data).some((issue) => /exactly 99/.test(issue)));
});

test("reordered controls are rejected", () => {
  const data = clone();
  [data.controls[1], data.controls[2]] = [data.controls[2], data.controls[1]];
  assert.ok(issuesFor(data).some((issue) => /source order/.test(issue)));
});

test("unknown evidence references are rejected", () => {
  const data = clone();
  data.controls[0].evidenceIds = ["does-not-exist"];
  assert.ok(issuesFor(data).some((issue) => /unknown evidence id/.test(issue)));
});

test("missing evidence files are rejected", () => {
  const data = clone();
  data.evidence.find((item) => item.id === "threat-model").path = "docs/security/not-present.md";
  assert.ok(issuesFor(data).some((issue) => /references missing file/.test(issue)));
});

test("evidence paths escaping the repository are rejected", () => {
  const data = clone();
  data.evidence.find((item) => item.id === "threat-model").path = "..\\outside.md";
  assert.ok(issuesFor(data).some((issue) => /escapes the repository root/.test(issue)));
});

test("open PR evidence cannot be represented as integrated", () => {
  const data = clone();
  data.evidence.find((item) => item.id === "pr73-infrastructure").evidenceState = "INTEGRATED";
  assert.ok(issuesFor(data).some((issue) => /must be PR_ONLY/.test(issue)));
});

test("PR-only evidence cannot support an ACTIVE control", () => {
  const data = clone();
  data.controls[1].state = "ACTIVE";
  assert.ok(issuesFor(data).some((issue) => /cannot be ACTIVE based on PR-only/.test(issue)));
});

test("TEMPLATE controls require explicit PR-only evidence", () => {
  const data = clone();
  data.controls[1].evidenceIds = ["headers"];
  assert.ok(issuesFor(data).some((issue) => /TEMPLATE requires explicit PR-only/.test(issue)));
});

test("not-applicable control status must agree with applicability", () => {
  const data = clone();
  data.controls[10].applicability = "CURRENT";
  assert.ok(issuesFor(data).some((issue) => /contradictory/.test(issue)));
});

test("unknown control states are rejected", () => {
  const data = clone();
  data.controls[0].state = "PRODUCTION";
  assert.ok(!CONTROL_STATES.has(data.controls[0].state));
  assert.ok(issuesFor(data).some((issue) => /unsupported state/.test(issue)));
});

test("ASVS PASS without test evidence is rejected", () => {
  const data = clone();
  data.asvs[0].status = "PASS";
  data.asvs[0].gap = "None identified";
  assert.ok(issuesFor(data).some((issue) => /PASS requires integrated deterministic test evidence/.test(issue)));
});

test("ASVS PASS based on PR-only test claims is rejected", () => {
  const data = clone();
  data.asvs[0].status = "PASS";
  data.asvs[0].gap = "None identified";
  data.asvs[0].evidenceIds = ["pr71-blackout"];
  assert.ok(issuesFor(data).some((issue) => /PASS requires integrated deterministic test evidence/.test(issue)));
});

test("unsupported ASVS requirement references are rejected", () => {
  const data = clone();
  data.asvs[0].id = "v5.0.0-99.99.99";
  assert.ok(issuesFor(data).some((issue) => /unverified ASVS/.test(issue)));
});

test("contradictory ASVS applicability and status are rejected", () => {
  const data = clone();
  data.asvs[0].status = "NOT_APPLICABLE";
  assert.ok(issuesFor(data).some((issue) => /contradictory NOT_APPLICABLE/.test(issue)));
});

test("ASVS status vocabulary matches the brief", () => {
  assert.deepEqual([...ASVS_STATUSES].sort(), ["FAIL", "NOT_APPLICABLE", "NOT_VERIFIED", "PARTIAL", "PASS"].sort());
  for (const item of assessment.asvs) assert.ok(ASVS_STATUSES.has(item.status));
});

test("only catalogued MITRE ATT&CK v20.0 techniques are accepted", () => {
  const data = clone();
  data.mitre[0].id = "T9999";
  assert.ok(issuesFor(data).some((issue) => /unverified MITRE/.test(issue)));
});

test("MITRE technique names must match the catalog", () => {
  const data = clone();
  data.mitre[0].name = "A made-up technique";
  assert.ok(issuesFor(data).some((issue) => /does not match the MITRE catalog/.test(issue)));
});

test("risk rating is derived consistently from qualitative impact and likelihood", () => {
  assert.equal(deriveRisk("CRITICAL", "LOW"), "HIGH");
  assert.equal(deriveRisk("HIGH", "MEDIUM"), "HIGH");
  assert.equal(deriveRisk("MEDIUM", "LOW"), "LOW");
  assert.equal(deriveRisk("HIGH", "NOT_ESTIMATED"), "UNASSESSED");
  const data = clone();
  data.risks[2].risk = "LOW";
  assert.ok(issuesFor(data).some((issue) => /risk rating contradicts/.test(issue)));
});

test("risk rationale is required", () => {
  const data = clone();
  data.risks[0].riskRationale = "";
  assert.ok(issuesFor(data).some((issue) => /risk rationale/.test(issue)));
});

test("STRIDE rows require every requested field and a known risk reference", () => {
  const data = clone();
  data.stride[0].riskId = "unknown";
  data.stride[0].owner = "";
  const issues = issuesFor(data);
  assert.ok(issues.some((issue) => /missing owner/.test(issue)));
  assert.ok(issues.some((issue) => /unknown risk/.test(issue)));
});

test("architecture states use only the requested vocabulary", () => {
  assert.deepEqual([...ARCHITECTURE_STATES].sort(), ["ACTIVE", "MISSING", "NOT_VERIFIED", "PARTIAL", "TEMPLATE"].sort());
  for (const layer of assessment.architecture) assert.ok(ARCHITECTURE_STATES.has(layer.state));
});

test("a TEMPLATE architecture layer requires PR-only evidence", () => {
  const data = clone();
  data.architecture[1].evidenceIds = ["headers"];
  assert.ok(issuesFor(data).some((issue) => /TEMPLATE requires PR-only/.test(issue)));
});

test("OWASP Top 10 mapping contains the exact 2025 category names", () => {
  const data = clone();
  data.owaspTop10[0].name = "Unverified category";
  assert.ok(issuesFor(data).some((issue) => /not an official OWASP Top 10:2025/.test(issue)));
});

test("editorial release blocker is kept distinct from technical vulnerability severity", () => {
  const editorial = assessment.risks.find((risk) => risk.classification === "EDITORIAL");
  assert.equal(editorial.risk, "RELEASE_BLOCKER");
  assert.match(editorial.riskRationale, /not 302 security vulnerabilities/i);
  assert.equal(buildReport(assessment).summary.editorialBlockersAreVulnerabilities, false);
});

test("report JSON shape satisfies the committed schema constraints", () => {
  const report = buildReport(assessment);
  assert.deepEqual(validateReportShape(report, schema), []);
  assert.equal(report.controls.length, 99);
  assert.equal(schema.properties.controls.maxItems, 99);
});

test("report schema validation rejects missing properties and invalid states", () => {
  const report = buildReport(assessment);
  delete report.basis;
  report.controls[0].state = "PRODUCTION";
  const issues = validateReportShape(report, schema);
  assert.ok(issues.some((issue) => /missing required property basis/.test(issue)));
  assert.ok(issues.some((issue) => /invalid state/.test(issue)));
});

test("report renderer is deterministic", () => {
  const report = buildReport(assessment);
  assert.equal(renderMarkdown(report), renderMarkdown(buildReport(assessment)));
  assert.equal(renderArchitecture(report), renderArchitecture(buildReport(assessment)));
  assert.equal(JSON.stringify(report), JSON.stringify(buildReport(assessment)));
});

test("rendered architecture explicitly labels PR-only infrastructure and BLACKOUT", () => {
  const diagram = renderArchitecture(buildReport(assessment));
  assert.match(diagram, /CDN \/ WAF<br\/>TEMPLATE/);
  assert.match(diagram, /BLACKOUT<br\/>TEMPLATE/);
  assert.match(diagram, /entegre değil/);
});

test("Markdown separates technical, operational, and editorial risk sections", () => {
  const markdown = renderMarkdown(buildReport(assessment));
  assert.match(markdown, /### Teknik riskler/);
  assert.match(markdown, /### Operasyonel riskler/);
  assert.match(markdown, /### Editoryal yayın kapısı \(güvenlik açığı değildir\)/);
  assert.match(markdown, /302 inherited human-review findings/);
});

test("Markdown captures PR state and check limitations", () => {
  const markdown = renderMarkdown(buildReport(assessment));
  assert.match(markdown, /GitHub PR ve CI durumu/);
  assert.match(markdown, /\[#74\]/);
  assert.match(markdown, /production-security-e2e run failed/i);
});
