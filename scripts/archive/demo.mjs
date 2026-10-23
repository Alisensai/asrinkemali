/**
 * Arşiv çekirdeğinin web katmanı olmadan nasıl kullanılacağını gösterir.
 *
 *   node scripts/archive/demo.mjs
 *
 * Bu betik yalnızca okuma yapar; hiçbir dosyayı değiştirmez, ağa çıkmaz.
 */

import { loadArchive, searchRecords, todayInHistory } from "./lib/index.mjs";

const archive = await loadArchive();
if (archive.errors.length > 0) {
  console.error("Arşiv yüklenemedi:");
  for (const error of archive.errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const { records } = archive;
  console.log("ASRIN KEMALİ arşiv çekirdeği demosu\n");
  console.log(`Toplam kayıt: ${records.length}`);
  console.log(
    `Yayım / inceleme / taslak: ${
      records.filter((record) => record.verification.status === "published").length
    } / ${
      records.filter((record) => record.verification.status === "reviewed").length
    } / ${
      records.filter((record) => record.verification.status === "draft").length
    }\n`
  );

  const queries = ["istiklal", "meclis", "kategori:egitim", "yil:1923", "tur:fotograf"];
  for (const query of queries) {
    const hits = searchRecords(records, query);
    console.log(`Arama: ${JSON.stringify(query)} → ${hits.length} sonuç`);
    for (const hit of hits.slice(0, 3)) {
      console.log(`  - ${hit.record.title} (${hit.record.date.display})`);
    }
  }

  console.log("");
  const today = todayInHistory(records, "2026-10-23");
  console.log(`Tarihte bugün (${today.date}): ${today.records.length} kayıt`);
  console.log(`  ${today.message ?? today.records.map((record) => record.title).join(", ")}`);
}
