import "server-only";

import { getAllArchiveRecords, getPublishedArchiveRecords } from "@/lib/archive";
import { getAllPublications } from "@/lib/publishing/repository";
import { planScheduledPublications } from "@/lib/publishing/scheduler";
import { errorFields, logEvent } from "./log";

export type ReadinessCheck = { name: string; ok: boolean };

/** Hazırlık denetimi: yalnız ad ve başarı durumu döner; ayrıntı sunucu günlüğüne (redakte) yazılır. */
export function readinessChecks(env: Record<string, string | undefined> = process.env): ReadinessCheck[] {
  const run = (name: string, check: () => boolean): ReadinessCheck => {
    try { return { name, ok: check() }; } catch (error) { logEvent("error", "readiness.check_failed", { check: name, ...errorFields(error) }); return { name, ok: false }; }
  };
  const deployEnv = env.ASRIN_DEPLOY_ENV;
  return [
    run("archive.loaded", () => getAllArchiveRecords().length > 0),
    run("archive.publication_gate", () => getPublishedArchiveRecords().every((record) => record.verification.status === "published")),
    run("publications.loaded", () => Array.isArray(getAllPublications())),
    // Yayın motoru yalnız dry-run planlar; plan üretilebiliyorsa motor sağlıklıdır (hiçbir şey yayımlanmaz).
    run("publishing.dry_run", () => planScheduledPublications(getAllPublications(), [], new Date().toISOString()).dryRun === true),
    run("config.site_url", () => deployEnv !== "production" || /^https:\/\//.test(env.NEXT_PUBLIC_SITE_URL ?? "")),
    run("config.preview_access", () => deployEnv !== "preview" || (Boolean(env.ASRIN_PREVIEW_USER) && /^[0-9a-f]{64}$/i.test(env.ASRIN_PREVIEW_PASSWORD_SHA256 ?? ""))),
    run("config.hsts_requires_https", () => env.ASRIN_ENABLE_HSTS !== "1" || /^https:\/\//.test(env.NEXT_PUBLIC_SITE_URL ?? "")),
  ];
}
