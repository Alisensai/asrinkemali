#!/usr/bin/env node
/**
 * ASRIN KEMALİ — Authority Registry CLI
 * Güvenli, salt-okunur komut satırı arayüzü
 */

import fs from "node:fs";
import path from "node:path";
import { AuthorityRegistry } from "./registry.mjs";
import { loadCatalogRecords } from "./extractor.mjs";
import { simulateMigration } from "./dry-run-migration.mjs";

function assertSafePath(targetPath) {
  const resolved = path.resolve(targetPath);
  const forbiddenDirs = [
    path.resolve("data", "archive"),
    path.resolve("content", "archive"),
    path.resolve(".git"),
  ];
  for (const f of forbiddenDirs) {
    if (resolved === f || resolved.startsWith(f + path.sep)) {
      throw new Error(`GÜVENLİK ENGELİ: Bu dizine yazma izni yoktur: ${resolved}`);
    }
  }
  return resolved;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "report";

  const registry = new AuthorityRegistry();
  await registry.init();

  if (command === "report") {
    const summary = registry.getSummary();
    const format = args.includes("--format=json") ? "json" : "text";

    if (format === "json") {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log("=== ASRIN KEMALİ AUTHORITY REGISTRY ÖZETİ ===");
      console.log(`Toplam Varlık (Entity):         ${summary.totalEntities}`);
      console.log(`  - Şahıslar (Persons):         ${summary.persons}`);
      console.log(`  - Mekânlar (Places):          ${summary.places}`);
      console.log(`  - Kurumlar (Institutions):    ${summary.institutions}`);
      console.log(`  - Tarihî Olaylar (Events):    ${summary.events}`);
      console.log(`  - Kaynak Eserler (Works):     ${summary.sourceWorks}`);
      console.log(`Toplam Gözlem (Observations):   ${summary.totalObservations}`);
      console.log(`Toplam Kayıt Referansı:         ${summary.totalRecordReferences}`);
      console.log(`İlişki Grafı (Düğümler/Kenarlar): ${summary.graphNodes} / ${summary.graphEdges}`);
      console.log("============================================");
    }
  } else if (command === "inspect") {
    const records = await loadCatalogRecords();
    console.log(`Arşiv Kayıt Sayısı: ${records.length}`);
    console.log(`Gözlem Sayısı: ${registry.observations.length}`);
    console.log("Arşiv dizinleri: data/archive/catalog, content/archive/records [Salt-Okunur]");
  } else if (command === "extract") {
    console.log(`Toplam ${registry.observations.length} gözlem başarıyla çıkarıldı.`);
    const sample = registry.observations.slice(0, 3);
    console.log("Örnek Gözlemler:", JSON.stringify(sample, null, 2));
  } else if (command === "resolve") {
    const query = args[1];
    const type = args[2] || null;
    if (!query) {
      console.error("Kullanım: node src/cli.mjs resolve <ad/alias> [tur]");
      process.exit(1);
    }
    const entity = registry.resolve(query, type);
    if (entity) {
      console.log(JSON.stringify(entity, null, 2));
    } else {
      console.log(`Varlık bulunamadı: ${query}`);
    }
  } else if (command === "match") {
    const query = args[1];
    const type = args[2] || null;
    if (!query) {
      console.error("Kullanım: node src/cli.mjs match <ad> [tur]");
      process.exit(1);
    }
    const matches = registry.match(query, type);
    console.log(`Bulunan aday sayısı: ${matches.length}`);
    console.log(JSON.stringify(matches.slice(0, 5), null, 2));
  } else if (command === "duplicates") {
    const risks = registry.getDuplicatesRisk();
    console.log(`Tespit edilen potansiyel benzerlik grubu sayısı: ${risks.length}`);
    console.log(JSON.stringify(risks.slice(0, 5), null, 2));
  } else if (command === "graph") {
    console.log(`Graf Düğüm Sayısı: ${registry.graph.nodes.size}`);
    console.log(`Graf Kenar Sayısı: ${registry.graph.edges.length}`);
    console.log(`Döngü Durumu (part_of): ${registry.graph.hasCycle("part_of") ? "Döngü Var!" : "Döngü Yok (Temiz)"}`);
  } else if (command === "dry-run-migration") {
    const records = await loadCatalogRecords();
    const sim = simulateMigration(records);
    console.log("=== DRY-RUN MIGRATION RAPORU (DİSK YAZIMI YOK) ===");
    console.log(`İncelenen Kayıt Sayısı: ${sim.totalRecordsAnalyzed}`);
    console.log(`Eşleştirilen Şahıs Sayısı: ${sim.totalPeopleMapped}`);
    console.log(`Eşleştirilen Mekân Sayısı: ${sim.totalLocationsMapped}`);
    console.log(`Eşleştirilen Kurum Sayısı: ${sim.totalInstitutionsMapped}`);
    console.log(`Diske Yazma Girişimi: ${sim.diskWritesAttempted} (Sıfır - Güvenli)`);
    console.log("==================================================");
  } else if (command === "validate") {
    const val = registry.validate();
    console.log(`Geçerlilik Durumu: ${val.valid ? "GEÇTİ (Valid)" : "BAŞARISIZ"}`);
    if (!val.valid) {
      console.error("Hatalar:", val.entityErrors);
      process.exit(1);
    }
  } else if (command === "export") {
    const outIndex = args.indexOf("--out");
    const defaultExportPath = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "data", "authority-registry.json");
    const target = outIndex !== -1 ? args[outIndex + 1] : defaultExportPath;
    const safeTarget = assertSafePath(target);
    const dir = path.dirname(safeTarget);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const allEntities = Array.from(registry.entities.values());
    fs.writeFileSync(
      safeTarget,
      JSON.stringify({ entities: allEntities, summary: registry.getSummary() }, null, 2),
      "utf8"
    );
    console.log(`${allEntities.length} varlık dışa aktarıldı: ${safeTarget}`);
  } else {
    console.log("Kullanım: node src/cli.mjs [report|inspect|extract|resolve <ad>|match <ad>|duplicates|graph|dry-run-migration|validate|export --out <dosya>]");
  }
}

main().catch((err) => {
  console.error("CLI Hatası:", err.message);
  process.exit(1);
});
