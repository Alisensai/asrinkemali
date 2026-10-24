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

Unknown external state is reported as `NOT_VERIFIED`. In particular, a GitHub branch-protection API 404 and an empty deployments query are not treated as proof that controls or deployments do not exist. The 302 human-review findings reported by PR #71 are an editorial publication gate, not security vulnerability findings.
