import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, "..", "..", "..", "qa", "kilo", "synthetic");
fs.mkdirSync(outDir, { recursive: true });

function generate(n) {
  const records = [];
  for (let i = 0; i < n; i++) {
    records.push({
      schemaVersion: "1.0.0",
      id: `synthetic-${i}`,
      slug: `synthetic-${i}`,
      title: `Sentetik Kayýt ${i}`,
      type: ["event", "document", "photograph"][i % 3],
      date: { start: `19${(10 + i % 40).toString().padStart(2,"0")}-01-01`, end: null, precision: "year", certainty: "approximate", display: `${1900 + i % 126}` },
      people: [],
      locations: [{ name: "Ankara", city: "Ankara", country: "Türkiye" }],
      categories: ["milli-mucadele"],
      summary: "Sentetik test verisi - gerçek arþive eklenmedi",
      description: "Bu kayýt sadece performans testi için oluþturulmuþtur.",
      source: { institution: "Sentetik Test", institutionType: "other", url: "https://example.com", accessedAt: "2026-10-23" },
      provenance: [],
      rights: { status: "unknown", license: null, imageReuse: "not_downloaded" },
      image: null,
      verification: { status: "draft", reviewedBy: null, reviewedAt: null, checks: {}, notes: "Test verisi" },
      tags: ["sentetik"],
      relatedIds: [],
      createdAt: "2026-10-23T00:00:00Z",
      updatedAt: "2026-10-23T00:00:00Z"
    });
  }
  return records;
}

for (const n of [500, 2000, 10000]) {
  const records = generate(n);
  fs.writeFileSync(path.join(outDir, `synthetic-${n}.json`), JSON.stringify(records, null, 2));
  console.log(`Generated synthetic-${n}.json (${records.length} records)`);
}
console.log("Sentetik veriler qa/kilo/synthetic/ altýna oluþturuldu - gerçek arþive EKLENMEDÝ");
