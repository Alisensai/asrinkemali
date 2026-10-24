# Threat assurance

This folder contains an evidence-bounded assessment of the integrated ASRIN KEMALI application as of 2026-10-24. The machine-readable source is `tools/threat-assurance/assessment.json`; the no-network Node.js engine validates references/status consistency and deterministically renders `REPORT.json`, `REPORT.md`, and `ARCHITECTURE.md`.

Run from the repository root:

```powershell
node tools/threat-assurance/run.mjs
node --test tools/threat-assurance/tests/engine.test.mjs
node tools/threat-assurance/run.mjs --check
```

The control list names/order were read from the source list in open PR #71 and independently hashed (`assessment.json` records its SHA-256). PR #71, #73, and #74 evidence remains `PR_ONLY`; an open proposal is not an integrated or production control. PR #72 is merged. `ACTIVE` means evidence exists in the integrated source tree and does not imply that a production deployment was inspected.

MITRE ATT&CK v20.0, OWASP ASVS 5.0.0, and OWASP Top 10:2025 are linked to their official catalogs. The ASVS mapping is selective and does not claim conformance, certification, or a verification level. No active attack, network scan, deployment, or production change is performed by the engine.

`tools/threat-assurance/catalogs/official-catalogs.json` records the MITRE Enterprise ATT&CK v20.0 STIX release commit and source-file SHA-256, plus the pinned official ASVS v5.0.0 requirement documents and Git blob IDs. The engine validates mapped MITRE IDs, exact catalog names, phases, and URLs against that source-backed inventory; ASVS IDs, source sections, and official URLs are checked against the pinned documents. Revoked ATT&CK records are preserved separately as exclusions, never as mapped techniques. The ASVS topic labels in the report are assessment summaries, not official requirement titles.

Every one of the 99 controls has `strideIds`, `mitreIds`, `asvsIds`, and a `mappingNote`. Empty arrays mean no direct, evidence-supported crosswalk for that framework; the note records the scope reason. ATT&CK coverage also accounts for credential abuse, privilege escalation, persistence, defense evasion/Stealth, credential access, discovery, lateral movement, collection, exfiltration, and resource manipulation. Techniques are selected only from non-revoked v20.0 Enterprise catalog entries. `T1562` and `T1562.001` are explicitly excluded because the pinned v20.0 catalog marks them revoked; no technique mapping asserts an observed adversary action.

Unknown external state is reported as `NOT_VERIFIED`. In particular, a GitHub branch-protection API 404 and an empty deployments query are not treated as proof that controls or deployments do not exist. The 302 human-review findings reported by PR #71 are an editorial publication gate, not security vulnerability findings.
