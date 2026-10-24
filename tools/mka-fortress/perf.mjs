#!/usr/bin/env node
// MKA FORTRESS — performans ölçümü (yalnız yerel sunucu). Tek ölçüm kesin sonuç değildir: her rota
// için medyan, p90 ve standart sapma raporlanır; karşılaştırma aynı makinede, aynı koşullarda yapılmalıdır.
//   node tools/mka-fortress/perf.mjs --base=http://127.0.0.1:4421 [--runs=30] [--pid=1234]
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { argument, REPO_ROOT } from "./lib/common.mjs";

export const ROUTES = ["/", "/ataturk", "/arsiv", "/arsiv?q=cumhuriyet", "/arsiv/anitkabir", "/kronoloji", "/yayinlar", "/tarihte-bugun", "/api/health", "/api/ready"];

export function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b); const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  const sd = Math.sqrt(sorted.reduce((sum, value) => sum + (value - mean) ** 2, 0) / sorted.length);
  return { median: +at(0.5).toFixed(1), p90: +at(0.9).toFixed(1), sd: +sd.toFixed(1), n: sorted.length };
}

function directorySize(directory) { if (!existsSync(directory)) return 0; return readdirSync(directory, { withFileTypes: true }).reduce((sum, entry) => sum + (entry.isDirectory() ? directorySize(path.join(directory, entry.name)) : statSync(path.join(directory, entry.name)).size), 0); }

function memoryMb(pid) {
  try {
    if (process.platform === "win32") return +(Number(execFileSync("powershell", ["-NoProfile", "-Command", `(Get-Process -Id ${Number(pid)}).WorkingSet64`], { encoding: "utf8" }).trim()) / 1048576).toFixed(1);
    return +(Number(execFileSync("ps", ["-o", "rss=", "-p", String(Number(pid))], { encoding: "utf8" }).trim()) / 1024).toFixed(1);
  } catch { return null; }
}

export async function main(argv) {
  const base = String(argument(argv, "base", "http://127.0.0.1:4421"));
  if (!["127.0.0.1", "localhost", "::1"].includes(new URL(base).hostname)) { console.error("Yalnız yerel sunucu ölçülebilir."); return 2; }
  const runs = Math.max(5, Number(argument(argv, "runs", "30")));
  const pid = argument(argv, "pid");
  const memoryBefore = typeof pid === "string" ? memoryMb(pid) : null;
  const routes = {};
  for (const route of ROUTES) { const warm = await fetch(base + route); await warm.arrayBuffer(); routes[route] = { samples: [], htmlBytes: 0, rscBytes: null, status: warm.status }; }
  // Rotalar sırayla değil iç içe ölçülür: makine yükündeki dalgalanma tek rotaya yığılmasın.
  for (let run = 0; run < runs; run += 1) for (const route of ROUTES) { const started = performance.now(); const response = await fetch(base + route); const body = await response.arrayBuffer(); routes[route].samples.push(performance.now() - started); routes[route].htmlBytes = body.byteLength; }
  for (const route of ROUTES.filter((item) => !item.startsWith("/api"))) { const response = await fetch(base + route, { headers: { RSC: "1" } }); routes[route].rscBytes = (await response.arrayBuffer()).byteLength; }
  const report = {
    base, runs, measuredAt: new Date().toISOString(), node: process.version, platform: `${process.platform}-${process.arch}`,
    routes: Object.fromEntries(Object.entries(routes).map(([route, value]) => [route, { status: value.status, htmlBytes: value.htmlBytes, rscBytes: value.rscBytes, latencyMs: stats(value.samples) }])),
    build: { clientChunksBytes: directorySize(path.join(REPO_ROOT, "web", ".next", "static", "chunks")), serverAppBytes: directorySize(path.join(REPO_ROOT, "web", ".next", "server", "app")) },
    serverMemoryMb: memoryBefore === null ? null : { before: memoryBefore, after: memoryMb(pid) },
    caveat: "Gecikme ve bellek koşudan koşuya değişir; yalnız aynı makinede, aynı yükte ve medyan/p90 ile karşılaştırın.",
  };
  console.log(JSON.stringify(report, null, 2));
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) process.exitCode = await main(process.argv.slice(2));
