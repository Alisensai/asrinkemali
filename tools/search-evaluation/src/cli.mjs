#!/usr/bin/env node
/**
 * ASRIN KEMALİ — Arama Değerlendirme CLI
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LocalLexicalRanker } from "./ranker/local-lexical.mjs";
import { evaluateRanker } from "./evaluator.mjs";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "..", "..", "..");

function assertSafePath(targetPath) {
  const resolved = path.resolve(targetPath);
  const forbiddenDirs = [
    path.resolve(REPO_ROOT, "data", "archive"),
    path.resolve(REPO_ROOT, "content", "archive"),
    path.resolve(REPO_ROOT, ".git"),
  ];
  for (const f of forbiddenDirs) {
    if (resolved === f || resolved.startsWith(f + path.sep)) {
      throw new Error(`GÜVENLİK ENGELİ: Bu dizine yazma izni yoktur: ${resolved}`);
    }
  }
  return resolved;
}

export function escapeCsvCell(value) {
  const text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text) || /^\s/.test(text)) {
    return `'${text.replace(/"/g, '""')}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

async function loadArchiveRecords() {
  const loadScriptPath = path.join(REPO_ROOT, "scripts", "archive", "lib", "load.mjs");
  if (fs.existsSync(loadScriptPath)) {
    try {
      const { loadArchive } = await import(loadScriptPath);
      const archive = await loadArchive(REPO_ROOT);
      if (archive && Array.isArray(archive.records)) {
        return archive.records;
      }
    } catch {
      // Fallback
    }
  }

  // Fallback: doğrudan catalog ve records dizinlerini tara
  const dirs = [
    path.join(REPO_ROOT, "content", "archive", "records"),
    path.join(REPO_ROOT, "data", "archive", "catalog"),
  ];
  const records = [];
  for (const d of dirs) {
    if (fs.existsSync(d)) {
      for (const f of fs.readdirSync(d)) {
        if (f.endsWith(".json")) {
          try {
            const content = JSON.parse(fs.readFileSync(path.join(d, f), "utf8"));
            if (Array.isArray(content)) records.push(...content);
            else records.push(content);
          } catch {}
        }
      }
    }
  }
  return records;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "report";

  const records = await loadArchiveRecords();
  const ranker = new LocalLexicalRanker(records);
  const report = evaluateRanker(ranker);

  if (command === "report" || command === "evaluate") {
    console.log("=== ASRIN KEMALİ ARAMA KALİTESİ BENCHMARK RAPORU ===");
    console.log(`Değerlendirilen Kayıt Sayısı: ${records.length}`);
    console.log(`Toplam Sorgu Sayısı:          ${report.totalQueries}`);
    console.log(`Yargılanan Sorgu Sayısı:      ${report.judgedQueriesCount}`);
    console.log(`Negatif Sorgu Doğruluğu:      %${(report.negativeQueryAccuracy * 100).toFixed(0)}`);
    console.log("----------------------------------------------------");
    console.log(`MRR (Mean Reciprocal Rank):   ${report.mrr}`);
    console.log(`Precision@1:                  ${report.precisionAtK[1]}`);
    console.log(`Precision@3:                  ${report.precisionAtK[3]}`);
    console.log(`Precision@5:                  ${report.precisionAtK[5]}`);
    console.log(`nDCG@3:                       ${report.ndcgAtK[3]}`);
    console.log(`nDCG@5:                       ${report.ndcgAtK[5]}`);
    console.log(`Recall@3:                     ${report.recallAtK[3]}`);
    console.log(`Recall@5:                     ${report.recallAtK[5]}`);
    console.log("====================================================");

    if (args.includes("--write")) {
      const outIndex = args.indexOf("--out");
      const outPath = outIndex !== -1 ? args[outIndex + 1] : "reports/search-benchmark-report.json";
      const safeOut = assertSafePath(path.resolve(MODULE_DIR, "..", outPath));
      const dir = path.dirname(safeOut);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(safeOut, JSON.stringify(report, null, 2), "utf8");
      console.log(`Rapor başarıyla kaydedildi: ${safeOut}`);
    }
  } else {
    console.log("Kullanım: node src/cli.mjs [evaluate|report] [--write] [--out <dosya>]");
  }
}

main().catch((err) => {
  console.error("CLI Hatası:", err.message);
  process.exit(1);
});
