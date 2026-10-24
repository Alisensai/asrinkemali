# Tehdit istihbaratı ve güvenlik güvencesi

- **Tarih:** 2026-10-24
- **Depo / taban:** `Alisensai/asrinkemali` · `integration/asrinkemali-v11-fortress-x` @ `532c6519e3f46cd0f3d4be4a51a8c0753fce4789`
- **Kapsam:** Entegre uygulama kodu ve doğrulanabilir depo/GitHub kanıtı; üretim ortamı doğrulanmadı.
- **Uygunluk:** Bu rapor ASVS doğrulaması veya sertifikasyon iddiası değildir.

## Özet

99 kontrol: NOT_VERIFIED: 38 · TEMPLATE: 13 · NOT_APPLICABLE: 22 · PARTIAL: 23 · MISSING: 1 · ACTIVE: 2.

ASVS durumları: PARTIAL: 4 · NOT_VERIFIED: 2 · NOT_APPLICABLE: 7 · FAIL: 1.

ATT&CK, ASVS ve OWASP Top 10 eşlemeleri yalnız ilgili saldırı yüzeylerine uygulanır; katalog eşlemesi saldırı bulgusu veya uygunluk sertifikası değildir.

## Mimari durum

| Katman | Durum | Kanıt yorumu |
|---|---|---|
| Visitor | ACTIVE | Public read-only Next.js pages and a small set of GET routes are integrated. |
| CDN/WAF | TEMPLATE | Provider/WAF files are PR-only or unverified; no active edge deployment is confirmed. |
| Application | ACTIVE | Next.js App Router is integrated; admin paths fail closed and app routes are primarily read-only. |
| Infrastructure | TEMPLATE | Host, firewall, monitoring, and recovery configurations are proposed in open PR #73, not verified as deployed. |
| Identity | MISSING | No registered IdP; no live admin identity or session system. |
| Data integrity | PARTIAL | Repository integrity and backup tools exist; independent immutable anchoring is absent/unverified. |
| Monitoring | PARTIAL | Local logging/CI exist; centralized SIEM, WORM retention, and alert ownership are unverified. |
| BLACKOUT | TEMPLATE | Implementation is in open PR #71 only; no integrated or durable production state. |
| Backup/recovery | PARTIAL | Local backup tooling exists; immutable offline copies, independent recovery, and production drills are unverified. |

## STRIDE

### Spoofing (Kimliğe bürünme)

- **Varlık:** Future privileged/editorial identities; none are currently authenticated by this app.
- **Giriş noktası:** Future admin/editor routes and any future identity-provider callback.
- **Güven sınırı:** Visitor/browser to Next.js proxy and the unconfigured identity provider boundary.
- **Tehdit davranışı:** An attacker could impersonate an editor if a future identity integration accepts untrusted identity or session data.
- **Mevcut kontrol:** Admin paths fail closed while the provider is null; the session helpers are contracts only.
- **Eksik kontrol:** No registered IdP, live session issuer, or provider-backed MFA.
- **Etki / olasılık / risk:** High publication-integrity impact if privileged access is later enabled. / LOW / MODERATE (risk kaydı: R-TECH-04)
- **Doğrulama:** Confirmed null provider in access-contract.ts and editorial-trust configuration; no live auth flow was found.
- **Sorumlu:** Application owner

### Tampering (Veri değişikliği)

- **Varlık:** Historical records, publication metadata, and source-controlled application code.
- **Giriş noktası:** Contributor/maintainer commits, pull requests, and CI dependency inputs.
- **Güven sınırı:** GitHub contributor/agent boundary to protected repository and build pipeline.
- **Tehdit davranışı:** A write-authorized actor or compromised dependency could alter records or code and affect public content.
- **Mevcut kontrol:** Repository integrity and supply-chain tools exist; review/branch protection status is not verified.
- **Eksik kontrol:** Independent immutable anchor, verified branch rules, and complete signed build provenance.
- **Etki / olasılık / risk:** HIGH / NOT_ESTIMATED / UNASSESSED (risk kaydı: R-TECH-01)
- **Doğrulama:** Inspected existing fortress tools and queried branch protection; API returned 404, so protection is unknown.
- **Sorumlu:** Repository maintainer

### Repudiation (İnkâr edilebilirlik)

- **Varlık:** Security and editorial decision records.
- **Giriş noktası:** Application log helpers and local hash-chain audit helpers.
- **Güven sınırı:** Application process/local repository to any future centralized evidence sink.
- **Tehdit davranışı:** A privileged writer could rewrite local logs and recompute a hash chain, weakening attribution or dispute resolution.
- **Mevcut kontrol:** Hash-chain verification and structured/redacted logging helpers are present.
- **Eksik kontrol:** No external WORM sink, independently controlled retention, or verified actor identity.
- **Etki / olasılık / risk:** HIGH / LOW / MODERATE (risk kaydı: R-OPS-03)
- **Doğrulama:** Inspected access-contract.ts and server log helper; no deployed immutable sink evidence was available.
- **Sorumlu:** Security operations owner

### Information Disclosure (Bilgi ifşası)

- **Varlık:** Public historical content and operational endpoint responses.
- **Giriş noktası:** Public Next.js pages and GET API routes, including the development-gated research export.
- **Güven sınırı:** Untrusted browser request to application route/data loaders.
- **Tehdit davranışı:** Unexpected private data could be returned if future draft/private data is exposed through a public route.
- **Mevcut kontrol:** The reviewed data model is public/read-only; research export returns 404 when disabled and no database/user store is evidenced.
- **Eksik kontrol:** No runtime deployment observation or complete route-by-route data classification was available.
- **Etki / olasılık / risk:** MEDIUM / NOT_ESTIMATED / UNASSESSED (risk kaydı: R-TECH-05)
- **Doğrulama:** Inspected the threat model and export route; did not probe a deployed service.
- **Sorumlu:** Application owner

### Denial of Service (Hizmet engelleme)

- **Varlık:** Public site availability and hosting capacity.
- **Giriş noktası:** Public page and GET API request volume.
- **Güven sınırı:** Internet/edge provider to application origin.
- **Tehdit davranışı:** High-rate requests could consume edge, compute, or bandwidth resources.
- **Mevcut kontrol:** No app write API is evidenced; health routes are simple and no active distributed limiter is confirmed.
- **Eksik kontrol:** Deployed WAF, anti-DDoS, CDN, origin protection, and shared rate-limit configuration are unverified.
- **Etki / olasılık / risk:** MEDIUM / NOT_ESTIMATED / UNASSESSED (risk kaydı: R-TECH-02)
- **Doğrulama:** Reviewed integrated routes and PR #73 status only; no traffic generation or active scan was performed.
- **Sorumlu:** Hosting operator

### Elevation of Privilege (Yetki yükseltme)

- **Varlık:** Future administrative and editorial actions.
- **Giriş noktası:** Future privileged endpoints and authorization service layer.
- **Güven sınırı:** Authenticated subject to application authorization and protected data.
- **Tehdit davranışı:** A future role/ownership check implemented only in the client could permit unauthorized edits or approvals.
- **Mevcut kontrol:** No live admin service exists; access contract denies absent sessions and models role/MFA rules.
- **Eksik kontrol:** Provider-backed identity and server-side authorization on any future mutation route.
- **Etki / olasılık / risk:** CRITICAL / LOW / HIGH (risk kaydı: R-TECH-04)
- **Doğrulama:** Read access-contract.ts; confirmed REGISTERED_PROVIDER is null and admin paths fail closed.
- **Sorumlu:** Application owner

## MITRE ATT&CK v20.0

Resmî sürüm kaynağı: https://attack.mitre.org/resources/versions/. Eşleme teknikleri uygulama kapsamına göre seçilmiştir; katalog kaydı tek başına saldırı bulgusu değildir.

| Teknik | Uygulanabilirlik | Kontrol durumu | Kanıt | Boşluk | Düzeltme |
|---|---|---|---|---|---|
| [T1190 Exploit Public-Facing Application](https://attack.mitre.org/techniques/T1190/) | CURRENT_RELEVANT | PARTIAL | threat-model, headers, research-export | Public web routes are active; no deployed WAF or live production verification is evidenced. This mapping is not a claim that a vulnerability was found. | Maintain code-level validation and verify edge controls in the authorized production configuration. |
| [T1195 Supply Chain Compromise](https://attack.mitre.org/techniques/T1195/) | CURRENT_RELEVANT | PARTIAL | supply-chain-tool, security-workflow | Repository checks exist; full signed provenance, action pinning, and release attestations are not established by this review. | Close build provenance gaps and retain verifiable dependency/build evidence. |
| [T1565 Data Manipulation](https://attack.mitre.org/techniques/T1565/) | CURRENT_RELEVANT | PARTIAL | integrity-tool, threat-model | Local integrity checking does not prevent a write-authorized actor from changing both content and its expected manifest. | Anchor trusted content manifests outside the same write authority and require reviewed changes. |
| [T1498 Network Denial of Service](https://attack.mitre.org/techniques/T1498/) | CURRENT_RELEVANT | NOT_VERIFIED | research-export, github-deployments, pr73-infrastructure | Network/edge mitigation, capacity, and distributed rate limits are not verified; PR #73 is open. | Obtain provider evidence and test limits only in an explicitly authorized non-production environment. |
| [T1078 Valid Accounts](https://attack.mitre.org/techniques/T1078/) | FUTURE_ONLY | NOT_APPLICABLE | access-contract, editorial-identity | No active application accounts, IdP, or session issuer exists to assess. | Reassess if accounts are introduced; require provider-backed MFA and lifecycle controls. |

## OWASP ASVS 5.0.0

Resmî sürüm kaynağı: https://github.com/OWASP/ASVS/tree/v5.0.0. Her durum yalnız listelenen kanıt kapsamıyla sınırlıdır; sertifikasyon iddiası yoktur.

| Gereksinim | Konu | Durum | Kanıt | Boşluk | Düzeltme |
|---|---|---|---|---|---|
| [v5.0.0-2.2.1](https://github.com/OWASP/ASVS/tree/v5.0.0) | Input validation | PARTIAL | research-export, threat-model | Some server-side allowlisting is visible, but this is not a complete input inventory or ASVS verification. | Inventory all inputs and test trusted-layer validation. |
| [v5.0.0-2.4.1](https://github.com/OWASP/ASVS/tree/v5.0.0) | Anti-automation | NOT_VERIFIED | research-export, github-deployments | No distributed limiter or deployed edge policy is evidenced. | Verify edge/shared rate limiting and abuse controls. |
| [v5.0.0-3.3.1](https://github.com/OWASP/ASVS/tree/v5.0.0) | Secure cookie attributes | NOT_APPLICABLE | access-contract | No active application session cookie is issued; helper code alone is not cookie deployment evidence. | Reassess when a real session issuer is introduced. |
| [v5.0.0-3.3.2](https://github.com/OWASP/ASVS/tree/v5.0.0) | Cookie SameSite policy | NOT_APPLICABLE | access-contract | No active application cookie is issued. | Reassess when a real session issuer is introduced. |
| [v5.0.0-3.3.3](https://github.com/OWASP/ASVS/tree/v5.0.0) | Host-prefixed cookies | NOT_APPLICABLE | access-contract | No active application cookie is issued. | Reassess when a real session issuer is introduced. |
| [v5.0.0-3.3.4](https://github.com/OWASP/ASVS/tree/v5.0.0) | HttpOnly session cookies | NOT_APPLICABLE | access-contract | No active application session cookie is issued. | Reassess when a real session issuer is introduced. |
| [v5.0.0-3.4.1](https://github.com/OWASP/ASVS/tree/v5.0.0) | HSTS | NOT_VERIFIED | headers, github-deployments | HSTS is opt-in in app configuration and deployed edge behavior is unknown. | Verify all production responses over HTTPS and enable the approved HSTS policy. |
| [v5.0.0-3.4.3](https://github.com/OWASP/ASVS/tree/v5.0.0) | Content Security Policy | PARTIAL | headers, header-tests, pr72-csp | CSP is enforced in source but permits unsafe-inline; deployment behavior is not verified. | Move to nonce-compatible strict CSP and verify deployed responses. |
| [v5.0.0-3.4.4](https://github.com/OWASP/ASVS/tree/v5.0.0) | X-Content-Type-Options | PARTIAL | headers, header-tests | Code and helper tests exist; all deployed responses were not observed. | Verify the header on deployed pages and API responses. |
| [v5.0.0-3.4.7](https://github.com/OWASP/ASVS/tree/v5.0.0) | CSP violation reporting | FAIL | headers | The integrated policy has no report receiver or report directive. | Design a privacy-reviewed report endpoint and add it only after operational ownership is defined. |
| [v5.0.0-3.5.1](https://github.com/OWASP/ASVS/tree/v5.0.0) | Cross-origin request protection | NOT_APPLICABLE | access-contract, research-export | No state-changing sensitive route is evidenced in the integrated app. | Reassess and enforce origin/token checks before adding mutations. |
| [v5.0.0-5.2.2](https://github.com/OWASP/ASVS/tree/v5.0.0) | File upload validation | NOT_APPLICABLE | research-export | No server-side upload endpoint is evidenced. | Reassess before accepting untrusted files. |
| [v5.0.0-6.1.1](https://github.com/OWASP/ASVS/tree/v5.0.0) | Authentication abuse controls | NOT_APPLICABLE | access-contract | No application authentication flow exists; this is a future requirement. | Document abuse/rate controls before introducing authentication. |
| [v5.0.0-8.3.1](https://github.com/OWASP/ASVS/tree/v5.0.0) | Trusted-layer authorization | PARTIAL | access-contract, access-tests | Authorization helpers are tested but not integrated with a live identity provider or protected service. | Enforce authorization at each future trusted service boundary. |

## OWASP Top 10:2025

Resmî kaynak: https://owasp.org/Top10/2025/.

| Kategori | Durum | Kanıtla sınırlı değerlendirme |
|---|---|---|
| A01:2025 Broken Access Control | PARTIAL | Admin access is currently closed; future authorization contracts are not a live identity integration. |
| A02:2025 Security Misconfiguration | PARTIAL | App header configuration exists; edge/hosting configuration and production drift are unverified. |
| A03:2025 Software Supply Chain Failures | PARTIAL | Repository checks exist; complete signed provenance is not evidenced. |
| A04:2025 Cryptographic Failures | NOT_VERIFIED | App key custody is limited; deployed TLS and external storage encryption are not verified. |
| A05:2025 Injection | PARTIAL | Some server-side allowlisting and browser controls are visible; no complete sink/input audit was conducted. |
| A06:2025 Insecure Design | PARTIAL | An older threat model and fail-closed future contracts exist; identity, edge controls, and response persistence remain gaps. |
| A07:2025 Authentication Failures | NOT_APPLICABLE | There is no active account/authentication system; requirements become applicable before one is added. |
| A08:2025 Software or Data Integrity Failures | PARTIAL | Integrity tooling exists but lacks an independent immutable trust anchor and complete provenance. |
| A09:2025 Security Logging and Alerting Failures | PARTIAL | Structured/redacted and hash-chain helpers exist; central immutable retention/alerting is unverified. |
| A10:2025 Mishandling of Exceptional Conditions | NOT_VERIFIED | No complete error-path or deployed resilience review was performed. |

## Bağımsız 99 kontrol eşlemesi

Kaynak adları ve sırası [PR #71 özgün listesi](https://github.com/Alisensai/asrinkemali/pull/71) ile doğrulanır (SHA-256: `b6fc4843aca397ce487faefa4082b751c08880cb58cd4782da49d353329b0c65`); aşağıdaki durum/kanıt değerlendirmesi bağımsızdır. `ACTIVE`, entegre kaynak kodunda gözlenen kontrolü ifade eder; üretimde etkin olduğu anlamına gelmez.

| # | Kontrol | Durum | Uygulanabilirlik | Mevcut kanıt | Boşluk | Sonraki adım |
|---:|---|---|---|---|---|---|
| 1 | Next-Generation Firewall (NGFW) | NOT_VERIFIED | CURRENT | Doğrulanmış kanıt yok | Hosting/network firewall posture is unknown. | Obtain deployment-provider evidence before claiming an NGFW. |
| 2 | Web Application Firewall (WAF) | TEMPLATE | CURRENT | infra/fortress-x-v11/waf/cloudflare-ruleset.tf | No integrated or deployed WAF evidence. | Integrate, configure, and independently verify the chosen edge WAF. |
| 3 | Intrusion Detection System (IDS) | NOT_VERIFIED | CURRENT | Doğrulanmış kanıt yok | Sensor deployment and alert routing are unknown. | Verify sensors and alert ownership with the hosting operator. |
| 4 | Intrusion Prevention System (IPS) | NOT_VERIFIED | CURRENT | Doğrulanmış kanıt yok | Network enforcement is outside the integrated application code. | Verify the deployed network controls; do not infer them from application code. |
| 5 | Anti-DDoS Protection | TEMPLATE | CURRENT | infra/fortress-x-v11/waf/cloudflare-ruleset.tf | No active provider protection or capacity evidence. | Confirm contracted edge protection and operational limits. |
| 6 | Security Information and Event Management (SIEM) | TEMPLATE | CURRENT | infra/fortress-x-v11/waf/cloudflare-ruleset.tf, web/lib/server/log.ts | No centralized ingestion, correlation, retention, or alert proof. | Integrate and test a managed log pipeline with an accountable operator. |
| 7 | Endpoint Detection and Response (EDR) | NOT_VERIFIED | CURRENT | Doğrulanmış kanıt yok | Endpoint coverage is unknown. | Verify endpoint coverage and response ownership. |
| 8 | Extended Detection and Response (XDR) | NOT_VERIFIED | CURRENT | Doğrulanmış kanıt yok | XDR operations are unverified. | Verify an operational telemetry and response service. |
| 9 | Security Operations Center (SOC) | NOT_VERIFIED | CURRENT | Doğrulanmış kanıt yok | Coverage and escalation ownership are unknown. | Document monitoring responsibility and escalation coverage. |
| 10 | Siber Olaylara Müdahale Ekibi (SOME) | NOT_VERIFIED | CURRENT | docs/security/THREAT-MODEL.md | Contacts, response authority, and exercise evidence are absent. | Assign incident owners and test a response plan. |
| 11 | Network Access Control (NAC) | NOT_APPLICABLE | NOT_APPLICABLE | docs/security/THREAT-MODEL.md | Reassess if managed office/network assets are introduced. | Reassess applicability when the operating environment changes. |
| 12 | Virtual Private Network (VPN) | NOT_VERIFIED | FUTURE | web/lib/security/access-contract.ts | A future administrative surface would need a verified access path. | Choose and verify a private access path before enabling administration. |
| 13 | SSL/TLS Encryption | NOT_VERIFIED | CURRENT | web/lib/security/headers.ts, https://api.github.com/repos/Alisensai/asrinkemali/deployments | Live TLS configuration and certificate state were not verified. | Verify TLS at the deployed edge and enable HSTS only for the confirmed HTTPS domain. |
| 14 | Malware Sandbox | NOT_APPLICABLE | NOT_APPLICABLE | web/app/api/arastirma-laboratuvari/export/route.ts | Reassess if untrusted uploads are introduced. | Add isolated scanning before enabling uploads. |
| 15 | Secure Email Gateway | NOT_APPLICABLE | NOT_APPLICABLE | docs/security/THREAT-MODEL.md | Project email infrastructure is not part of the current app. | Reassess if the project operates email. |
| 16 | Endpoint Protection Platform (EPP) | NOT_VERIFIED | CURRENT | Doğrulanmış kanıt yok | Endpoint product and policy are unknown. | Verify endpoint protections with the relevant operators. |
| 17 | Vulnerability Management | PARTIAL | CURRENT | tools/mka-fortress/supply-chain.mjs, .github/workflows/security.yml | No complete asset-level vulnerability program or remediation SLA is evidenced. | Document owners, scope, cadence, and remediation tracking. |
| 18 | Penetration Testing | NOT_VERIFIED | CURRENT | tools/security-lab/engine.mjs | No authorized human penetration-test report was verified. | Commission a scoped, authorized assessment before claiming penetration testing. |
| 19 | Identity and Access Management (IAM) | MISSING | FUTURE | web/lib/security/access-contract.ts, web/lib/editorial-trust/configuration.ts | No live IdP, user lifecycle, or administrative session service exists. | Require a tested IdP and access lifecycle before adding protected features. |
| 20 | Load Balancer | NOT_VERIFIED | CURRENT | https://api.github.com/repos/Alisensai/asrinkemali/deployments | Hosting topology is unknown. | Obtain deployment architecture evidence. |
| 21 | Centralized Syslog / EventLog | PARTIAL | CURRENT | web/lib/server/log.ts | Central collection, retention, and alerting are not evidenced. | Connect logs to a managed sink and verify retention/alert paths. |
| 22 | MITRE ATT&CK Framework | PARTIAL | CURRENT | docs/security/THREAT-MODEL.md | No continuously maintained threat-intelligence feed or ATT&CK-driven response is evidenced. | Review mappings when the threat model or ATT&CK catalog changes. |
| 23 | OWASP Security Standards | PARTIAL | CURRENT | docs/security/THREAT-MODEL.md, web/lib/security/headers.ts | This is not a complete ASVS verification or certification. | Commission a scoped verification against the required ASVS level. |
| 24 | ISO/IEC 27001 | NOT_VERIFIED | CURRENT | Doğrulanmış kanıt yok | Policies, audits, and certification status are unknown. | Do not claim certification; assess organizational requirements separately. |
| 25 | Disaster Recovery | PARTIAL | CURRENT | tools/mka-fortress/backup.mjs, infra/fortress-x-v11/waf/cloudflare-ruleset.tf | No tested production recovery plan, RTO/RPO, or independent recovery environment. | Define and exercise recovery objectives against the deployed platform. |
| 26 | Zero Trust Architecture | NOT_VERIFIED | CURRENT | web/lib/security/access-contract.ts | No end-to-end Zero Trust deployment evidence. | Assess the complete identity, device, and network path before claiming this control. |
| 27 | Network Segmentation | NOT_VERIFIED | CURRENT | Doğrulanmış kanıt yok | Segmentation cannot be inferred from repository code. | Verify hosting network boundaries. |
| 28 | Global CDN / Anycast | NOT_VERIFIED | CURRENT | https://api.github.com/repos/Alisensai/asrinkemali/deployments | Delivery topology is unknown. | Verify the deployed DNS/CDN configuration. |
| 29 | Enterprise Bot Management | NOT_VERIFIED | CURRENT | infra/fortress-x-v11/waf/cloudflare-ruleset.tf | No deployed bot detection or mitigation proof. | Verify edge controls without treating robots/noindex as a security control. |
| 30 | Adaptive Rate Limiting | NOT_VERIFIED | CURRENT | web/app/api/arastirma-laboratuvari/export/route.ts | Multi-instance rate-limit behavior and thresholds are unknown. | Set and test shared/edge limits before exposing costly or stateful endpoints. |
| 31 | Behavioral Threat Analysis | TEMPLATE | CURRENT | web/lib/security/blackout/state-machine.ts | No integrated telemetry or deployed behavioral analysis exists in the reviewed base. | Integrate with verified signals, thresholds, and human escalation. |
| 32 | IP Reputation Intelligence | NOT_VERIFIED | CURRENT | Doğrulanmış kanıt yok | Feed provider, freshness, and enforcement are unknown. | Verify an authorized feed and bounded enforcement policy. |
| 33 | Adaptive Security Challenges | NOT_VERIFIED | CURRENT | infra/fortress-x-v11/waf/cloudflare-ruleset.tf | Challenge behavior and accessibility are unknown. | Assess an edge challenge only if abuse evidence justifies it. |
| 34 | Origin Server Protection | NOT_VERIFIED | CURRENT | infra/fortress-x-v11/waf/cloudflare-ruleset.tf | Origin exposure and edge-only access are not verified. | Verify origin restrictions in the actual hosting environment. |
| 35 | Server Hardening | TEMPLATE | CURRENT | infra/fortress-x-v11/waf/cloudflare-ruleset.tf | No hardened production host is evidenced. | Integrate, deploy, and verify the applicable host baseline. |
| 36 | Runtime Threat Detection | TEMPLATE | CURRENT | infra/fortress-x-v11/waf/cloudflare-ruleset.tf | No deployed runtime sensor or alert path is verified. | Validate runtime telemetry and response ownership after deployment. |
| 37 | Outbound Traffic Filtering | PARTIAL | CURRENT | web/lib/security/headers.ts, docs/security/THREAT-MODEL.md | No host/network egress policy is verified. | Verify infrastructure egress controls independently of browser CSP. |
| 38 | Hardware Security Keys | NOT_APPLICABLE | FUTURE | web/lib/security/access-contract.ts | Hardware-key enforcement becomes relevant if authentication is introduced. | Require phishing-resistant authentication for future privileged access. |
| 39 | FIDO2 / Passkeys | NOT_APPLICABLE | FUTURE | web/lib/security/access-contract.ts | No passkey enrollment/verification path exists. | Select a verified identity provider before enabling accounts. |
| 40 | Privileged Access Management (PAM) | NOT_VERIFIED | FUTURE | web/lib/security/access-contract.ts | Privileged operational access is outside the codebase evidence. | Verify operator access controls before production administration. |
| 41 | Role-Based Access Control (RBAC) | PARTIAL | FUTURE | web/lib/security/access-contract.ts, web/tests/security-access.test.mjs | No live authenticated subject is authoritatively bound to those roles. | Integrate roles with a verified IdP and test authorization at the service boundary. |
| 42 | Just-in-Time Privileged Access | NOT_APPLICABLE | FUTURE | web/lib/security/access-contract.ts | Time-bounded elevation is not implemented. | Design JIT access before creating privileged accounts. |
| 43 | Device Trust Verification | NOT_VERIFIED | FUTURE | web/lib/security/access-contract.ts | Device posture cannot be checked by current app code. | Require verified device posture for future privileged workflows. |
| 44 | Session Hijacking Protection | PARTIAL | FUTURE | web/lib/security/access-contract.ts, web/tests/security-access.test.mjs | No live session rotation, revocation, or runtime cookie evidence. | Verify the complete session lifecycle before enabling authentication. |
| 45 | Continuous Authentication | NOT_APPLICABLE | FUTURE | web/lib/security/access-contract.ts | No IdP risk signals or continuous reauthentication flow. | Reassess if authenticated services are introduced. |
| 46 | SQL Injection Protection | NOT_APPLICABLE | NOT_APPLICABLE | docs/security/THREAT-MODEL.md | Reassess if a database/query interface is added. | Use parameterized queries and test authorization if SQL is introduced. |
| 47 | Cross-Site Scripting (XSS) Protection | PARTIAL | CURRENT | docs/security/THREAT-MODEL.md, web/lib/security/headers.ts | No complete sink-by-sink review or strict nonce CSP evidence. | Maintain output encoding and remove unsafe-inline when nonce support is verified. |
| 48 | Cross-Site Request Forgery (CSRF) Protection | NOT_APPLICABLE | NOT_APPLICABLE | web/lib/security/access-contract.ts, web/app/api/arastirma-laboratuvari/export/route.ts | Reassess before adding state-changing routes. | Require same-origin and anti-forgery validation before enabling mutations. |
| 49 | API Security Gateway | NOT_VERIFIED | CURRENT | web/app/api/arastirma-laboratuvari/export/route.ts, https://api.github.com/repos/Alisensai/asrinkemali/deployments | Gateway/WAF enforcement and deployed API inventory are unknown. | Verify gateway controls at the actual deployment boundary. |
| 50 | Object-Level Authorization | NOT_APPLICABLE | FUTURE | web/lib/security/access-contract.ts, web/app/api/arastirma-laboratuvari/export/route.ts | Object authorization must be implemented before user-scoped data is exposed. | Apply subject-to-object authorization at the trusted service layer for future private data. |
| 51 | Secrets Management | PARTIAL | CURRENT | tools/mka-fortress/secrets.mjs, .github/workflows/security.yml | Secret issuance, runtime delivery, rotation, and incident revocation are unverified. | Verify a least-privilege runtime secret-management process. |
| 52 | Database Encryption | NOT_APPLICABLE | NOT_APPLICABLE | docs/security/THREAT-MODEL.md | Reassess if a database is introduced. | Define encryption/key-management requirements before storing database data. |
| 53 | Secure File Upload Scanning | NOT_APPLICABLE | NOT_APPLICABLE | web/app/api/arastirma-laboratuvari/export/route.ts | Reassess before adding upload handling. | Validate, isolate, and scan uploads before processing. |
| 54 | Static Application Security Testing (SAST) | NOT_VERIFIED | CURRENT | .github/workflows/security.yml | No dedicated static security analyzer evidence. | Add and review an appropriate static analyzer before claiming SAST. |
| 55 | Dynamic Application Security Testing (DAST) | PARTIAL | CURRENT | .github/workflows/security.yml, web/tests/security-headers.test.mjs, tools/security-lab/engine.mjs | No verified production DAST run or authorized independent scanner result. | Run approved non-production DAST and retain the exact scope/results. |
| 56 | Software Composition Analysis (SCA) | PARTIAL | CURRENT | tools/mka-fortress/supply-chain.mjs, .github/workflows/security.yml | This evidence does not establish complete dependency provenance or production inventory. | Retain versioned audit output and establish remediation ownership. |
| 57 | Security Orchestration, Automation and Response (SOAR) | TEMPLATE | CURRENT | web/lib/security/blackout/state-machine.ts | No integrated orchestration platform or production adapters. | Treat as a prototype until integrations, persistence, and approval controls are deployed. |
| 58 | User and Entity Behavior Analytics (UEBA) | NOT_APPLICABLE | FUTURE | web/lib/editorial-trust/configuration.ts | No user/entity behavior dataset or analytics operation. | Reassess only after identity and telemetry exist. |
| 59 | Honeytokens / Deception Technology | NOT_VERIFIED | CURRENT | Doğrulanmış kanıt yok | No monitored deception signal or response procedure. | Do not add decoys without an owner and validated alert workflow. |
| 60 | Immutable Audit Logs | PARTIAL | CURRENT | web/lib/security/access-contract.ts, web/lib/server/log.ts | A writer can rewrite local state and recompute a chain. | Anchor audit records in independently administered immutable storage. |
| 61 | Automated Incident Isolation | TEMPLATE | FUTURE | web/lib/security/blackout/state-machine.ts | No integrated route/edge adapter or persisted incident state. | Require tested fail-safe adapters, durable state, and human approval before activation. |
| 62 | Immutable Offline Backups | PARTIAL | CURRENT | tools/mka-fortress/backup.mjs, infra/fortress-x-v11/waf/cloudflare-ruleset.tf | No independent retention lock or restore exercise is evidenced. | Verify offline immutable copies and perform a documented restore drill. |
| 63 | Automated Disaster Recovery | NOT_VERIFIED | CURRENT | tools/mka-fortress/backup.mjs, https://api.github.com/repos/Alisensai/asrinkemali/deployments | No verified failover, RTO/RPO, or recovery drill. | Document and test recovery against actual hosting services. |
| 64 | Cloud Security Posture Management (CSPM) | NOT_VERIFIED | CURRENT | https://api.github.com/repos/Alisensai/asrinkemali/deployments | Cloud posture is outside repository visibility. | Verify cloud account ownership and posture monitoring with the operator. |
| 65 | Container Runtime Security | TEMPLATE | FUTURE | infra/fortress-x-v11/waf/cloudflare-ruleset.tf | No integrated container deployment or runtime sensor is evidenced. | Reassess only for the selected deployed runtime. |
| 66 | Kubernetes Security Policies | TEMPLATE | FUTURE | infra/fortress-x-v11/waf/cloudflare-ruleset.tf | No integrated cluster or enforcement evidence. | Apply and validate policies against a real cluster before claiming enforcement. |
| 67 | Infrastructure as Code Security Scanning | NOT_VERIFIED | CURRENT | infra/fortress-x-v11/waf/cloudflare-ruleset.tf | No integrated IaC scanning gate or reviewed report. | Scan reviewed IaC in CI before infrastructure deployment. |
| 68 | Supply Chain Security | PARTIAL | CURRENT | tools/mka-fortress/supply-chain.mjs, .github/workflows/security.yml | No verified attestation, complete SBOM, or end-to-end provenance. | Close provenance gaps and retain verifiable build attestations. |
| 69 | Software Bill of Materials (SBOM) | PARTIAL | CURRENT | tools/mka-fortress/supply-chain.mjs | No verified signed CycloneDX/SPDX artifact for a release. | Generate and retain a format-compliant SBOM for each release. |
| 70 | DNSSEC | NOT_VERIFIED | CURRENT | https://api.github.com/repos/Alisensai/asrinkemali/deployments | DNSSEC status is unknown. | Verify DNSSEC at the authoritative DNS provider. |
| 71 | DNS Filtering | NOT_VERIFIED | CURRENT | Doğrulanmış kanıt yok | Filtering cannot be established from application code. | Verify the hosting/network resolver policy. |
| 72 | Certificate Transparency Monitoring | NOT_VERIFIED | CURRENT | https://api.github.com/repos/Alisensai/asrinkemali/deployments | Certificate monitoring and ownership are unknown. | Verify monitoring for every production hostname. |
| 73 | HTTP Security Headers | ACTIVE | CURRENT | web/next.config.ts, web/lib/security/headers.ts, web/tests/security-headers.test.mjs, https://github.com/Alisensai/asrinkemali/pull/72 | Live deployment/header behavior is unverified; HSTS is opt-in. | Verify headers on each deployed hostname and enable HSTS only after HTTPS confirmation. |
| 74 | Content Security Policy (CSP) | ACTIVE | CURRENT | web/lib/security/headers.ts, web/tests/security-headers.test.mjs, https://github.com/Alisensai/asrinkemali/pull/72 | No nonce-based strict policy, CSP report collection, or deployed-header evidence. | Plan nonce-compatible strict CSP and a privacy-reviewed reporting endpoint. |
| 75 | Subresource Integrity (SRI) | NOT_APPLICABLE | NOT_APPLICABLE | web/lib/security/headers.ts | Reassess if externally hosted scripts/styles are introduced. | Use SRI or self-host assets before introducing third-party executable resources. |
| 76 | Multi-Factor Authentication (MFA) | NOT_APPLICABLE | FUTURE | web/lib/security/access-contract.ts, web/lib/editorial-trust/configuration.ts | No authenticated privileged workflow to enforce MFA against. | Require provider-backed MFA before enabling privileged accounts. |
| 77 | Risk-Based Authentication | NOT_APPLICABLE | FUTURE | web/lib/editorial-trust/configuration.ts | No risk signals or adaptive authentication control. | Reassess if authenticated services are introduced. |
| 78 | Database Activity Monitoring | NOT_APPLICABLE | NOT_APPLICABLE | docs/security/THREAT-MODEL.md | Reassess if a database is introduced. | Add database monitoring with any future database. |
| 79 | Data Loss Prevention (DLP) | PARTIAL | CURRENT | tools/mka-fortress/secrets.mjs, web/lib/server/log.ts, docs/security/THREAT-MODEL.md | No endpoint/network DLP policy or deployed data inventory evidence. | Define data classes and verify controls at storage and egress boundaries. |
| 80 | Cloud Workload Protection (CWPP) | NOT_VERIFIED | CURRENT | https://api.github.com/repos/Alisensai/asrinkemali/deployments | Runtime workload posture is unknown. | Verify with the hosting/cloud operator. |
| 81 | Attack Surface Management (ASM) | PARTIAL | CURRENT | docs/security/THREAT-MODEL.md, web/app/api/arastirma-laboratuvari/export/route.ts | No continuously reconciled external asset inventory. | Maintain an owner-verified route/domain inventory and review changes. |
| 82 | External Attack Surface Monitoring (EASM) | NOT_VERIFIED | CURRENT | https://api.github.com/repos/Alisensai/asrinkemali/deployments | Public domains and cloud assets may not be fully enumerated. | Verify authorized external asset monitoring with the operator. |
| 83 | Threat Intelligence Platform (TIP) | NOT_VERIFIED | CURRENT | Doğrulanmış kanıt yok | No maintained feed, triage, or operational integration. | Do not describe framework mapping as an operational TIP. |
| 84 | Continuous Security Validation | PARTIAL | CURRENT | .github/workflows/security.yml, web/tests/security-headers.test.mjs, web/tests/security-access.test.mjs | No runtime validation evidence or end-to-end deployment assurance. | Keep CI checks and add authorized post-deployment verification. |
| 85 | Breach and Attack Simulation (BAS) | TEMPLATE | CURRENT | tools/security-lab/engine.mjs | No integrated BAS execution or authorized exercise result. | Require explicit scope/authorization and controlled test environment before any exercise. |
| 86 | Automated Vulnerability Patching | NOT_VERIFIED | CURRENT | .github/workflows/security.yml | Automation configuration and ownership are unknown. | Verify dependency update automation and remediation SLAs. |
| 87 | Secure CI/CD Pipeline | PARTIAL | CURRENT | .github/workflows/security.yml, .github/workflows/release-quality.yml, https://api.github.com/repos/Alisensai/asrinkemali/branches/main/protection | Required review, protected refs, provenance, and deployment approvals are not proven. | Verify repository rulesets and release permissions; retain editorial gates. |
| 88 | Runtime Application Self-Protection (RASP) | NOT_VERIFIED | CURRENT | https://api.github.com/repos/Alisensai/asrinkemali/deployments | Deployed runtime instrumentation is unknown. | Verify the selected host's runtime protection, if any. |
| 89 | File Integrity Monitoring (FIM) | PARTIAL | CURRENT | tools/mka-fortress/integrity.mjs, .github/workflows/security.yml | Local manifest integrity is not an immutable external anchor or host FIM. | Anchor manifests independently and verify production filesystem monitoring. |
| 90 | Cryptographic Key Rotation | NOT_APPLICABLE | FUTURE | web/lib/security/access-contract.ts | No managed keys currently exist in the reviewed app flow. | Define rotation and revocation before introducing managed keys. |
| 91 | Hardware Security Module (HSM) | NOT_APPLICABLE | FUTURE | web/lib/security/access-contract.ts | Would be required only if future signing/key custody warrants it. | Reassess key custody when signing or privileged identity is introduced. |
| 92 | Tamper Detection | PARTIAL | CURRENT | tools/mka-fortress/integrity.mjs, tools/mka-fortress/backup.mjs, web/lib/security/access-contract.ts | No external immutable anchor or WORM sink prevents privileged rewrite. | Anchor records outside the write authority and test tamper alerts. |
| 93 | Emergency Access Revocation | NOT_APPLICABLE | FUTURE | web/lib/security/access-contract.ts | No live revocation channel exists. | Implement and exercise revocation with any future IdP/session store. |
| 94 | Automated Credential Revocation | NOT_APPLICABLE | FUTURE | web/lib/editorial-trust/configuration.ts | No credential lifecycle integration. | Design provider-backed revocation before issuing application credentials. |
| 95 | Critical Database Read-Only Lockdown | NOT_APPLICABLE | NOT_APPLICABLE | docs/security/THREAT-MODEL.md, web/lib/security/blackout/state-machine.ts | Database lockdown is not a current feature and PR-only code is not active evidence. | Reassess if a database or integrated incident-control plane is introduced. |
| 96 | Emergency Network Quarantine | TEMPLATE | FUTURE | infra/fortress-x-v11/waf/cloudflare-ruleset.tf, web/lib/security/blackout/state-machine.ts | No deployed network quarantine control or persistent operational state. | Treat as a future design until provider adapters and recovery are tested. |
| 97 | Incident Evidence Preservation | PARTIAL | CURRENT | web/lib/security/access-contract.ts, web/lib/server/log.ts, web/lib/security/blackout/state-machine.ts | No independently administered WORM retention or legal-hold evidence. | Use an external immutable evidence sink and test access/retention. |
| 98 | Independent Recovery Environment | NOT_VERIFIED | CURRENT | tools/mka-fortress/backup.mjs, https://api.github.com/repos/Alisensai/asrinkemali/deployments | Independence and recovery readiness are unknown. | Verify a separately controlled recovery environment and restoration drill. |
| 99 | PROJECT BLACKOUT — Kritik ihlal doğrulandığında sistemi güvenli moda alma, saldırganın erişimini kesme ve verileri koruma. | TEMPLATE | FUTURE | web/lib/security/blackout/state-machine.ts | No durable active state, production adapter, or deployed recovery path is verified. | Do not claim active BLACKOUT; require review, durable state, safe adapters, and recovery exercises before integration. |

## Riskler

Teknik, operasyonel ve editoryal riskler ayrı başlıklarda tutulur. Teknik/operasyonel risk derecesi nitel etki-olasılık matrisiyle belirlenir; `UNASSESSED` olasılığın kanıtla tahmin edilemediğini gösterir.

### Teknik riskler

| Risk | Etki | Olasılık | Derece | Gerekçe | Azaltım |
|---|---|---|---|---|---|
| Repository protection cannot be verified | HIGH | NOT_ESTIMATED | UNASSESSED | The branch-protection API returned 404; the response cannot establish whether rules are absent or the current credential lacks access. | Verify rulesets, required review, and status checks with an authorized repository owner. |
| Public availability controls are unverified | MEDIUM | NOT_ESTIMATED | UNASSESSED | No deployed WAF, anti-DDoS, origin restriction, or shared rate-limit evidence is available; exposure and capacity are unknown. | Verify provider controls and limits; do not run active traffic tests without explicit authorization. |
| CSP still allows unsafe-inline | HIGH | LOW | MODERATE | The code enforces a restrictive CSP, but inline script allowance weakens XSS containment; existing rendering defenses lower likelihood but do not remove impact. | Adopt nonce-compatible CSP and verify behavior on the deployed app. |
| Future privileged features need a real identity boundary | CRITICAL | LOW | HIGH | Current admin routes are closed, so the scenario is conditional; enabling future accounts without a provider-backed authorization boundary could expose editorial integrity. | Keep routes closed until IdP, server-side authorization, MFA, and audit identity are tested. |
| Future non-public content could be exposed by a public route | MEDIUM | NOT_ESTIMATED | UNASSESSED | The current model is read-oriented and no private data store is evidenced, but production routing/data visibility was not observed and future draft content would change the impact. | Keep draft/private data out of public loaders and verify route-level visibility before introducing it. |

### Operasyonel riskler

| Risk | Etki | Olasılık | Derece | Gerekçe | Azaltım |
|---|---|---|---|---|---|
| BLACKOUT is not an integrated response capability | HIGH | MEDIUM | HIGH | The decision engine is in open PR #71 only; there is no integrated durable state or production adapter to rely on during an incident. | Do not claim the control is active; review persistence, adapter safety, approval, and recovery before integration. |
| Immutable evidence retention and recovery are unverified | HIGH | LOW | MODERATE | Local hashes and backup utilities help detect errors but do not establish WORM retention, independent custody, or successful production restore. | Use separately administered immutable storage and conduct a documented restore/evidence-retention exercise. |
| Development-to-production drift cannot be ruled out | HIGH | NOT_ESTIMATED | UNASSESSED | No production deployment or response-header observation was available; source configuration alone cannot prove deployed behavior. | Verify configuration and security headers on each authorized deployment. |

### Editoryal yayın kapısı (güvenlik açığı değildir)

| Risk | Etki | Olasılık | Derece | Gerekçe | Azaltım |
|---|---|---|---|---|---|
| Human-review publication gate remains blocked | PUBLICATION_GATE | CONFIRMED | RELEASE_BLOCKER | PR #71 reports 302 inherited human-review findings blocking release. These are editorial review findings, not 302 security vulnerabilities. | Preserve the existing human-review gate and resolve editorial findings through the approved review process. |

## GitHub PR ve CI durumu

| PR | Durum | Gözlem |
|---|---|---|
| [#71](https://github.com/Alisensai/asrinkemali/pull/71) | OPEN | Read-only source for the user's exact 99-control names/order; not integrated. Read-only review of Claude's control assertions; this independent mapping does not treat PR claims as integrated evidence. PROJECT BLACKOUT implementation remains in an open PR; no active application integration or persistent production state was verified. PR body reports 302 inherited human-review findings blocking release. The release-quality check failed; this is an editorial publication gate, not a technical vulnerability count. |
| [#72](https://github.com/Alisensai/asrinkemali/pull/72) | MERGED | Merged change keeps enforced CSP in production when report-only is requested. The observed release-quality check failed while the security-focused checks passed. |
| [#73](https://github.com/Alisensai/asrinkemali/pull/73) | OPEN | WAF, hardening, monitoring, and recovery artifacts are PR-only templates; no deployed WAF or infrastructure was verified. The observed release-quality checks failed; listed fortress/security/smoke checks passed. |
| [#74](https://github.com/Alisensai/asrinkemali/pull/74) | OPEN | Adversarial test-lab files and findings are PR-only; no active scan was run for this assessment. At query time one production-security-e2e run failed and another plus release-quality checks were pending. |

## Kanıt sınırlamaları

- Üretim dağıtımı veya canlı müdahale davranışı bağımsız doğrulanmadı; boş deployment sorgusu dağıtım olmadığı anlamına gelmez.
- GitHub dal koruması API'si 404 döndürdü; durum NOT_VERIFIED olarak bırakıldı, koruma yok denmedi.
- PR #71, #73 ve #74 açık; bunların uygulama/yapılandırma kanıtları PR_ONLY durumundadır ve etkin/üretim kontrolü sayılamaz.
- PR #72 birleştirildi ve CSP değişikliği entegre kaynakta bulunuyor; dağıtılmış yanıt gözlemlenmedi.
- PR #71'de bildirilen 302 insan incelemesi bulgusu editoryal yayın kapısıdır; güvenlik açığı sayısı değildir.
- Bu, sınırlı kanıt değerlendirmesidir; tam sızma testi, eksiksiz kod denetimi, ASVS doğrulaması veya sertifikasyon değildir.

### Kanıt envanteri

| Kimlik | Tür/durum | Kaynak | Not |
|---|---|---|---|
| threat-model | INTEGRATED | docs/security/THREAT-MODEL.md | Existing model is based on an earlier branch and contains stale CSP assertions; use alongside current code, not as current deployment proof. |
| next-config | INTEGRATED | web/next.config.ts | Applies configured security headers to app responses. |
| headers | INTEGRATED | web/lib/security/headers.ts | Production CSP is enforced; report-only adds a second policy; HSTS is opt-in; CSP allows unsafe-inline and has no report endpoint. |
| header-tests | INTEGRATED | web/tests/security-headers.test.mjs | Deterministic tests cover production off/report-only behavior and header construction, not a deployed endpoint. |
| access-contract | INTEGRATED | web/lib/security/access-contract.ts | Authentication provider is null; admin routes fail closed. Includes future-facing session, RBAC, CSRF, and hash-chain helpers. |
| access-tests | INTEGRATED | web/tests/security-access.test.mjs | Tests the security contract, not a live identity provider or session service. |
| research-export | INTEGRATED | web/app/api/arastirma-laboratuvari/export/route.ts | Development-gated read/export route returns 404 when disabled and does not write to the archive. |
| editorial-identity | INTEGRATED | web/lib/editorial-trust/configuration.ts | Trusted identity provider and active editorial policy are null. |
| fortress-tools | INTEGRATED | tools/mka-fortress/README.md | Describes existing repository integrity, backup, secrets, supply-chain, and CSP test tools; does not prove production operation. |
| integrity-tool | INTEGRATED | tools/mka-fortress/integrity.mjs | Local/repository content integrity checks; a trusted external anchor is still required. |
| backup-tool | INTEGRATED | tools/mka-fortress/backup.mjs | Repository backup utility; no evidence of deployed immutable offline storage or recovery exercise. |
| secrets-tool | INTEGRATED | tools/mka-fortress/secrets.mjs | Repository secret-pattern checks; not a centralized secrets-management service. |
| supply-chain-tool | INTEGRATED | tools/mka-fortress/supply-chain.mjs | Repository dependency and workflow checks; not proof of a complete signed provenance/SBOM pipeline. |
| server-log | INTEGRATED | web/lib/server/log.ts | Application logging/redaction helper; no centralized retention or WORM sink is evidenced. |
| security-workflow | INTEGRATED | .github/workflows/security.yml | Repository CI workflow; GitHub repository settings and deployed environment are outside this file. |
| release-workflow | INTEGRATED | .github/workflows/release-quality.yml | Release-quality gate; its editorial findings are not security vulnerability counts. |
| pr71-matrix | OPEN / PR_ONLY | docs/security/fortress-x-v11/SOURCE-CONTROL-LIST.md | Read-only source for the user's exact 99-control names/order; not integrated. |
| pr71-control-matrix | OPEN / PR_ONLY | docs/security/fortress-x-v11/CONTROL-MATRIX.md | Read-only review of Claude's control assertions; this independent mapping does not treat PR claims as integrated evidence. |
| pr71-blackout | OPEN / PR_ONLY | web/lib/security/blackout/state-machine.ts | PROJECT BLACKOUT implementation remains in an open PR; no active application integration or persistent production state was verified. |
| pr71-editorial | OPEN / PR_ONLY | https://github.com/Alisensai/asrinkemali/pull/71 | PR body reports 302 inherited human-review findings blocking release. The release-quality check failed; this is an editorial publication gate, not a technical vulnerability count. |
| pr72-csp | MERGED / INTEGRATED | https://github.com/Alisensai/asrinkemali/pull/72 | Merged change keeps enforced CSP in production when report-only is requested. The observed release-quality check failed while the security-focused checks passed. |
| pr73-infrastructure | OPEN / PR_ONLY | infra/fortress-x-v11/waf/cloudflare-ruleset.tf | WAF, hardening, monitoring, and recovery artifacts are PR-only templates; no deployed WAF or infrastructure was verified. The observed release-quality checks failed; listed fortress/security/smoke checks passed. |
| pr74-security-lab | OPEN / PR_ONLY | tools/security-lab/engine.mjs | Adversarial test-lab files and findings are PR-only; no active scan was run for this assessment. At query time one production-security-e2e run failed and another plus release-quality checks were pending. |
| github-branch-protection | NOT_VERIFIED | https://api.github.com/repos/Alisensai/asrinkemali/branches/main/protection | GitHub API returned 404. This does not distinguish absent protection from unavailable permission/evidence. |
| github-deployments | NOT_VERIFIED | https://api.github.com/repos/Alisensai/asrinkemali/deployments | The queried deployments endpoint returned no records; this is not proof that no external production deployment exists. |
