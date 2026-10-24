import type { PublishingIntegrationHealth } from "./contracts/types.ts";

export function getPublishingIntegrationHealth(input: { repositoryAvailable: boolean; archiveAvailable: boolean; schedulerAvailable: boolean; authAvailable: boolean; auditAvailable: boolean }): PublishingIntegrationHealth {
  const dependencies = {
    repository: input.repositoryAvailable ? "available" : "blocked",
    archive: input.archiveAvailable ? "available" : "blocked",
    auth: input.authAvailable ? "available" : "blocked",
    audit: input.auditAvailable ? "available" : "blocked",
    scheduler: input.schedulerAvailable ? "available" : "unknown",
  } as const;
  const critical = [dependencies.repository, dependencies.archive, dependencies.auth, dependencies.audit];
  const overall = critical.includes("blocked") ? "blocked" : dependencies.scheduler === "available" ? "available" : "degraded";
  return { overall, dependencies, message: overall === "blocked" ? "İnsan onayı veya kalıcı denetim altyapısı yok; yayın mutasyonu kapalı." : "Salt-okunur yayın entegrasyonu kullanılabilir." };
}
