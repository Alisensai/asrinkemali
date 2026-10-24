export * from "./contracts/types.ts";
export * from "./revision.ts";
export * from "./preflight/publication.ts";
export * from "./adapters/publishing-review-adapter.ts";
export * from "./health.ts";

export function formatPublishingReport(report: unknown, format: "json" | "markdown"): string {
  if (format === "json") return `${JSON.stringify(report, null, 2)}\n`;
  const input = report as { generatedAt?: string; ready?: readonly unknown[]; blocked?: readonly unknown[]; skipped?: readonly unknown[]; ledgerAudit?: { ok?: boolean; findings?: readonly { code: string; message: string }[] } };
  const lines = [
    "# Yayın entegrasyonu dry-run raporu",
    "",
    `- Oluşturulma: ${input.generatedAt ?? "bilinmiyor"}`,
    `- Hazır aday: ${input.ready?.length ?? 0}`,
    `- Preflight bloklu kayıt: ${input.blocked?.length ?? 0}`,
    `- Zamanlayıcı atlaması: ${input.skipped?.length ?? 0}`,
    `- Ledger denetimi: ${input.ledgerAudit?.ok ? "geçti" : "başarısız"}`,
  ];
  for (const item of input.ledgerAudit?.findings ?? []) lines.push(`- ${item.code}: ${item.message}`);
  return `${lines.join("\n")}\n`;
}
