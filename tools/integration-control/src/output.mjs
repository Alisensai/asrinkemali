// Deterministik çıktı: sıralı anahtarlar, kaçışlanmış Markdown, formül korumalı CSV, beyaz listeli yazma.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { csvCell, mdEscape, redact, safeOutputPath, tempRoot } from "./safety.mjs";

export const TOOL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const REPO_ROOT = path.resolve(TOOL_ROOT, "..", "..");
export const REPORT_DIR = path.join(REPO_ROOT, "docs", "integration-control", "reports");
export const ALLOWED_OUTPUT_ROOTS = [REPORT_DIR, tempRoot()];

export function stableStringify(value) {
  const sort = (item) => Array.isArray(item) ? item.map(sort) : item && typeof item === "object" ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, sort(item[key])])) : item;
  return `${JSON.stringify(sort(value), null, 2)}\n`;
}

export function markdownTable(headers, rows) {
  return [`| ${headers.map(mdEscape).join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows.map((row) => `| ${row.map(mdEscape).join(" | ")} |`)].join("\n");
}
export function csv(headers, rows) { return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n"; }

/** Yalnız rapor dizini veya geçici dizin altına yazar; içerik redakte edilir. */
export function writeOutput(target, content) {
  const resolved = safeOutputPath(target, ALLOWED_OUTPUT_ROOTS);
  mkdirSync(path.dirname(resolved), { recursive: true });
  writeFileSync(resolved, redact(content));
  return resolved;
}

export function inventoryMarkdown(inventory) {
  const rows = inventory.prs.map((pr) => [`#${pr.number}`, pr.title, `${pr.state}${pr.isDraft ? " (draft)" : ""}`, pr.layer, `${pr.baseRef} ← ${pr.headRef}`, pr.headSha?.slice(0, 7) ?? "?", pr.ancestryStatus, Object.entries(pr.checks?.checks ?? {}).map(([name, state]) => `${name}:${state}`).join(" "), pr.mergeable]);
  return [`# PR envanteri`, "", `- Kaynak: **${inventory.sourceMode}**, alınma: ${inventory.lastFetchedAt}${inventory.stale ? " — **ESKİ (stale)**" : ""}`, `- Hedef: \`${inventory.target.ref}\` @ \`${inventory.target.sha}\``, `- Toplam: ${inventory.prs.length} PR`, "", markdownTable(["PR", "Başlık", "Durum", "Katman", "Taban ← Baş", "Baş SHA", "V0.6 içerilme", "Son baş SHA CI", "mergeable"], rows), ""].join("\n");
}
