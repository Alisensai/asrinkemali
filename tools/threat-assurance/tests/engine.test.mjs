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

test("ASVS source document references are pinned to the release commit", () => {
  const data = clone();
  data.standards.owaspAsvs.catalogDocuments[0].gitBlobSha = "0".repeat(40);
  assert.ok(issuesFor(data).some((issue) => /source document references do not match/.test(issue)));
});

test("every control has explicit STRIDE, ATT&CK, and ASVS crosswalk arrays", () => {
  assert.equal(assessment.controls.length, 99);
  for (const control of assessment.controls) {
    assert.ok(Array.isArray(control.strideIds), `control ${control.id} strideIds`);
    assert.ok(Array.isArray(control.mitreIds), `control ${control.id} mitreIds`);
    assert.ok(Array.isArray(control.asvsIds), `control ${control.id} asvsIds`);
    assert.ok(control.mappingNote.trim(), `control ${control.id} mappingNote`);
  }
});

test("empty control crosswalk arrays include an explicit scope note", () => {
  const control = assessment.controls.find((item) => item.strideIds.length === 0
    && item.mitreIds.length === 0 && item.asvsIds.length === 0);
  assert.ok(control);
  assert.match(control.mappingNote, /intentionally empty|intentionally empty|empty/i);
  const data = clone();
  data.controls[0].strideIds = ["S-99"];
  assert.ok(issuesFor(data).some((issue) => /strideIds references unknown id/.test(issue)));
});

test("control crosswalk fields reject missing arrays and duplicate references", () => {
  const missing = clone();
  delete missing.controls[0].mitreIds;
  assert.ok(issuesFor(missing).some((issue) => /mitreIds must be an array/.test(issue)));
  const duplicate = clone();
  duplicate.controls[0].strideIds = ["S-05", "S-05"];
  assert.ok(issuesFor(duplicate).some((issue) => /must not contain duplicate/.test(issue)));
});

test("control ids are ordered exactly from 1 through 99", () => {
  assert.deepEqual(assessment.controls.map(({ id }) => id), Array.from({ length: 99 }, (_, i) => i + 1));
});

test("ASVS ids are backed by pinned official v5.0.0 source documents", async () => {
  const catalog = JSON.parse(await readFile(resolve(repoRoot, "tools/threat-assurance/catalogs/official-catalogs.json"), "utf8"));
  assert.equal(assessment.standards.owaspAsvs.releaseCommit, catalog.owaspAsvs.releaseCommit);
  for (const requirement of assessment.asvs) {
    const official = catalog.owaspAsvs.requirements.find((item) => item.id === requirement.id);
    assert.ok(official, requirement.id);
    assert.equal(requirement.catalogSection, official.section);
    assert.equal(requirement.catalogUrl, official.sourceUrl);
    assert.equal(catalog.owaspAsvs.documents.find((doc) => doc.url === official.sourceUrl).gitBlobSha, official.sourceGitBlob);
  }
});

test("ASVS catalog references cannot be substituted with unrelated URLs or sections", () => {
  const data = clone();
  data.asvs[0].catalogUrl = "https://example.com/fake-asvs";
  data.asvs[0].catalogSection = "Invented section";
  assert.ok(issuesFor(data).some((issue) => /catalog section or URL does not match/.test(issue)));
});

test("control names and order match the recorded PR 71 source-list digest", () => {
  const data = clone();
  data.controls[15].name = "Altered control label";
  assert.ok(issuesFor(data).some((issue) => /source-list SHA-256/.test(issue)));
  assert.match(assessment.controlSource.sha256, /^[0-9a-f]{64}$/);
});

test("Markdown renders all 99 framework crosswalks and ATT&CK family coverage", () => {
  const markdown = renderMarkdown(buildReport(assessment));
  assert.match(markdown, /\| # \| Kontrol \| Durum \| Uygulanabilirlik \| STRIDE \| ATT&CK \| ASVS \| Eşleme notu \|/);
  assert.match(markdown, /\| Credential abuse \| T1110, T1078 \| FUTURE_ONLY \|/);
  assert.match(markdown, /T1562\.001.*revoked/i);
  assert.match(markdown, /enterprise-attack\/enterprise-attack\.json/i);
  assert.match(markdown, /OWASP\/ASVS\/[0-9a-f]{40}\/5\.0\/en/);
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
  assert.ok(issuesFor(data).some((issue) => /unverified or revoked MITRE/.test(issue)));
});

test("MITRE technique names must match the catalog", () => {
  const data = clone();
  data.mitre[0].name = "A made-up technique";
  assert.ok(issuesFor(data).some((issue) => /does not match the official MITRE catalog/.test(issue)));
});

test("MITRE technique ids and names are grounded in the pinned official v20.0 catalog", async () => {
  const catalog = JSON.parse(await readFile(resolve(repoRoot, "tools/threat-assurance/catalogs/official-catalogs.json"), "utf8"));
  assert.equal(assessment.standards.mitreAttack.releaseCommit, catalog.mitreAttack.releaseCommit);
  assert.equal(assessment.standards.mitreAttack.sourceSha256, catalog.mitreAttack.sourceSha256);
  assert.ok(catalog.mitreAttack.sourceUrl.includes(catalog.mitreAttack.releaseCommit));
  assert.match(catalog.mitreAttack.sourceUrl, /enterprise-attack\/enterprise-attack\.json$/);
  assert.equal(assessment.mitre.length, 17);
  assert.ok(catalog.mitreAttack.entries.every((item) => item.revoked === false && item.deprecated === false));
  assert.deepEqual(catalog.mitreAttack.excludedEntries.map((item) => item.id).sort(), ["T1562", "T1562.001"]);
  assert.ok(catalog.mitreAttack.excludedEntries.every((item) => item.revoked === true));
  for (const technique of assessment.mitre) {
    const official = catalog.mitreAttack.entries.find((item) => item.id === technique.id);
    assert.ok(official, technique.id);
    assert.equal(technique.name, official.name);
    assert.deepEqual(technique.phases, official.phases);
    assert.equal(technique.url, official.url);
  }
});

test("revoked ATT&CK techniques are rejected even if their IDs have the expected shape", () => {
  const data = clone();
  data.mitre[0].id = "T1562.001";
  assert.ok(issuesFor(data).some((issue) => /unverified or revoked MITRE/.test(issue)));
});

test("MITRE applicability includes rationales and future-only mappings do not imply active controls", () => {
  const data = clone();
  const future = data.mitre.find((item) => item.applicability === "FUTURE_ONLY");
  future.controlState = "ACTIVE";
  assert.ok(issuesFor(data).some((issue) => /future-only applicability cannot claim an active control state/.test(issue)));
  const missingRationale = clone();
  missingRationale.mitre[0].applicabilityRationale = "";
  assert.ok(issuesFor(missingRationale).some((issue) => /applicability rationale/.test(issue)));
});

test("requested ATT&CK behavior families are covered and technique references validate", () => {
  const families = new Set(assessment.mitreCoverage.map((item) => item.family));
  for (const family of [
    "Credential abuse", "Privilege escalation", "Persistence", "Defense evasion", "Credential access",
    "Discovery", "Lateral movement", "Collection", "Exfiltration", "Resource manipulation",
  ]) assert.ok(families.has(family), family);
  const data = clone();
  data.mitreCoverage[0].techniqueIds = ["T9999"];
  assert.ok(issuesFor(data).some((issue) => /references unknown technique T9999/.test(issue)));
  assert.ok(assessment.mitreExclusions.some((item) => /revoked/.test(item)));
});

test("ATT&CK source snapshot is mandatory and pinned to official data", () => {
  const data = clone();
  data.standards.mitreAttack.sourceSha256 = "0".repeat(64);
  assert.ok(issuesFor(data).some((issue) => /does not match the pinned official catalog snapshot/.test(issue)));
  const missingCatalog = validateAssessment(data, { repoRoot: resolve(repoRoot, "tools") });
  assert.ok(missingCatalog.some((issue) => /Cannot read official catalog snapshot/.test(issue)));
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
  assert.equal(report.mitreCoverage.length, 10);
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
