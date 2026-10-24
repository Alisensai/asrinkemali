/**
 * YALNIZ TEST. Bellek içi depolar ve sentetik kimlik sağlayıcısı.
 * Bu dosya web/ altında değildir, Next.js paketine girmez ve hiçbir route'a bağlanmaz.
 * Sentetik aktör kimlikleri gerçek kişi değildir ("synthetic-…").
 */
import { createActorResolver } from "../../../../web/lib/editorial-trust/identity.ts";

export const T0 = Date.parse("2026-10-24T10:00:00Z");

export function syntheticProvider(session, { testOnly = true, id = "synthetic-test-idp" } = {}) {
  return {
    id,
    testOnly,
    async getVerifiedSession() {
      return session === null ? null : { provider: id, sessionId: "synthetic-session", authenticatedAt: "2026-10-24T09:00:00Z", expiresAt: "2026-10-24T18:00:00Z", ...session };
    },
  };
}

export function resolverFor(session, options = {}) {
  return createActorResolver({ provider: syntheticProvider(session, options), environment: options.environment ?? "test", now: () => options.now ?? T0 });
}

/** Her çağrıda farklı oturum döndüren resolver (iki farklı aktörü sırayla simüle etmek için). */
export function switchableResolver(initial) {
  let session = initial;
  const provider = { id: "synthetic-test-idp", testOnly: true, async getVerifiedSession() { return session === null ? null : { provider: "synthetic-test-idp", sessionId: "s", authenticatedAt: "2026-10-24T09:00:00Z", expiresAt: "2026-10-24T18:00:00Z", ...session }; } };
  const resolver = createActorResolver({ provider, environment: "test", now: () => T0 });
  return { resolver, use(next) { session = next; } };
}

export function memoryStores({ failDecisionWrite = false } = {}) {
  const events = [];
  const decisions = new Map();
  const subjects = new Map();
  return {
    events,
    subjects: {
      put(subjectType, recordId, record, authorActorIds = []) {
        subjects.set(`${subjectType}:${recordId}`, { subjectType, recordId, record, authorActorIds });
      },
      async readSubject(subjectType, recordId) {
        return subjects.get(`${subjectType}:${recordId}`) ?? null;
      },
    },
    audit: {
      async last() {
        return events.at(-1) ?? null;
      },
      async findByIdempotencyKey(key) {
        return events.find((event) => event.idempotencyKey === key) ?? null;
      },
      async append(event, expectedPrevHash) {
        const tip = events.at(-1)?.hash ?? "0".repeat(64);
        if (tip !== expectedPrevHash || event.prevHash !== tip) return { ok: false, error: "revision_conflict" };
        events.push(event);
        return { ok: true };
      },
    },
    decisions: {
      failNext: failDecisionWrite,
      async listForSubject(subjectType, recordId) {
        return [...(decisions.get(`${subjectType}:${recordId}`) ?? [])];
      },
      async append(receipt, expectedCount) {
        if (this.failNext) {
          this.failNext = false;
          return { ok: false, error: "write_failed" };
        }
        const key = `${receipt.subjectType}:${receipt.recordId}`;
        const list = decisions.get(key) ?? [];
        if (list.length !== expectedCount) return { ok: false, error: "revision_conflict" };
        decisions.set(key, [...list, receipt]);
        return { ok: true };
      },
      async invalidate(decisionId, reason) {
        for (const [key, list] of decisions) {
          const index = list.findIndex((receipt) => receipt.decisionId === decisionId);
          if (index === -1) continue;
          if (list[index].invalidatedBy) return { ok: false, error: "already_invalidated" };
          const next = [...list];
          next[index] = Object.freeze({ ...list[index], invalidatedBy: reason });
          decisions.set(key, next);
          return { ok: true };
        }
        return { ok: false, error: "not_found" };
      },
    },
  };
}

export function syntheticArchiveRecord(overrides = {}) {
  return {
    schemaVersion: "1.0.0",
    id: "synthetic-record-0001",
    slug: "synthetic-record-0001",
    title: "Sentetik test kaydı",
    type: "document",
    date: { start: "1923-10-29", end: null, precision: "day", certainty: "exact", display: "29 Ekim 1923" },
    people: [],
    locations: [],
    categories: ["test"],
    summary: "Sentetik test kaydı; gerçek tarihî bilgi değildir.",
    description: "Sentetik.",
    source: { institution: "Sentetik Kurum", institutionType: "archive", institutionUrl: "https://example.org/", title: "Sentetik kaynak", url: "https://example.org/doc/1", accessedAt: "2026-10-01", publishedAt: null, archiveIdentifier: "SYN-1", note: "" },
    provenance: [{ institution: "Sentetik Kurum", collection: "Test", identifier: "SYN-1", url: "https://example.org/doc/1", accessedAt: "2026-10-01", note: "" }],
    rights: { status: "official_link_only", license: null, licenseUrl: null, termsUrl: null, credit: "Sentetik", imageReuse: "not_downloaded", note: "" },
    image: null,
    verification: { status: "draft", reviewedBy: null, reviewedAt: null, checks: {}, notes: "" },
    tags: [],
    relatedIds: [],
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

export const POLICY = Object.freeze({
  version: "test-policy-1",
  decisionRoles: Object.freeze({ historian_review: Object.freeze(["historian"]), publication_editor: Object.freeze(["chief_editor"]) }),
  approvalValidityMs: null,
});

export const ENV_CONFIGURED = Object.freeze({ policy: POLICY, identityConfigured: true, technicalTestsPassed: true, auditIntegrity: { valid: true, eventCount: 3 }, now: T0 });
export const ENV_UNCONFIGURED = Object.freeze({ policy: null, identityConfigured: false, technicalTestsPassed: true, auditIntegrity: null, now: T0 });
