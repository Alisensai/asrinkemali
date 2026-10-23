import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(__dirname, '../../../docs/qa/kilo');
fs.mkdirSync(docsDir, { recursive: true });

const report = {
  baslik: 'Asrın Kemali QA Test Paketi',
  tarih: new Date().toISOString(),
  repo: 'https://github.com/Alisensai/asrinkemali',
  dal: 'feature/kilo-qa-suite',
  hedef: 'PR #4 entegrasyonu'
};

fs.writeFileSync(path.join(docsDir, 'TEST-PLANI.md'), '# Test Plani\n\nOtomatik ve manuel testler icin plan.', 'utf8');
fs.writeFileSync(path.join(docsDir, 'HATA-TABLOSU.md'), '# Hata Tablosu\n\n| Onem | Kategori | Yeniden Uretme | Ekran Goruntusu | Beklenen | Gercek | Durum | Oneri |\n|---|---|---|---|---|---|---|---|\n', 'utf8');
fs.writeFileSync(path.join(docsDir, 'TEST-SONUCLARI.md'), JSON.stringify(report, null, 2), 'utf8');
console.log('done');
