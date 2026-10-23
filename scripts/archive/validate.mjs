#!/usr/bin/env node
/**
 * ASRIN KEMALİ arşiv doğrulama komut satırı aracı.
 *
 * Kullanım:
 *   node scripts/archive/validate.mjs
 *   node scripts/archive/validate.mjs --strict
 *   node scripts/archive/validate.mjs --links
 *   node scripts/archive/validate.mjs --json
 *   node scripts/archive/validate.mjs --root ./baska-bir-kok
 *
 * Çıkış kodları:
 *   0  Doğrulama başarılı (uyarılar kabul edilir)
 *   1  Doğrulama hataları var
 *   2  Kullanım hatası veya beklenmeyen çalışma hatası
 *
 * `--strict` uyarıları da hata sayar; CI'da sıfır uyarı politikası için kullanın.
 * `--links` ağ erişimi gerektirir ve kaynak URL'lerini denetler; varsayılan
 * doğrulama çevrimdışıdır.
 */

import process from "node:process";
import { loadArchive, resolveRoot } from "./lib/load.mjs";
import { validateArchive } from "./lib/validate.mjs";
import { checkArchiveLinks } from "./lib/links.mjs";

const HELP = `ASRIN KEMALİ arşiv doğrulayıcı

Kullanım:
  node scripts/archive/validate.mjs [seçenekler]

Seçenekler:
  --root <dizin>   Arşiv kök dizini (varsayılan: depo kökü)
  --strict         Uyarıları da hata say
  --links          Kaynak URL'lerini ağ üzerinden denetle
  --json           Sonucu JSON olarak yazdır
  --help, -h       Bu yardımı göster

Çıkış kodları:
  0 başarılı, 1 doğrulama hatası, 2 kullanım/çalışma hatası
`;

function parseArgs(argv) {
  const options = {
    root: null,
    strict: false,
    links: false,
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--strict") options.strict = true;
    else if (arg === "--links") options.links = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--root") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--root için bir dizin belirtilmeli.");
      }
      options.root = value;
      index += 1;
    } else if (arg.startsWith("--root=")) {
      const value = arg.slice("--root=".length);
      if (!value) throw new Error("--root için bir dizin belirtilmeli.");
      options.root = value;
    } else {
      throw new Error(`Bilinmeyen seçenek: ${arg}`);
    }
  }
  return options;
}

function printHuman(result, { links }) {
  const { stats, errors, warnings } = result;
  const lines = [];
  lines.push("ASRIN KEMALİ arşiv doğrulaması");
  lines.push(`Kayıt: ${stats.total} | Yayımlandı: ${stats.byStatus.published} | İncelendi: ${stats.byStatus.reviewed} | Taslak: ${stats.byStatus.draft}`);
  lines.push(
    `Türler: fotoğraf ${stats.byType.photograph}, belge ${stats.byType.document}, konuşma ${stats.byType.speech}, olay ${stats.byType.event}, yayın ${stats.byType.publication}, mekân ${stats.byType.place}`
  );
  lines.push(`Alıntılı kayıt: ${stats.withQuotation} | Görselli kayıt: ${stats.withImage} | Tarihi bilinmeyen: ${stats.unknownDates}`);
  if (links) {
    lines.push(`Bağlantı denetimi: ${links.checked} URL, ${links.failures.length} başarısız`);
  }
  lines.push("");
  if (errors.length === 0 && warnings.length === 0) {
    lines.push("Sonuç: temiz (0 hata, 0 uyarı).");
    return lines.join("\n");
  }
  if (errors.length > 0) {
    lines.push(`HATALAR (${errors.length}):`);
    for (const error of errors) {
      lines.push(`  [${error.code}] ${error.recordId ?? "-"} ${error.path}: ${error.message}`);
    }
  }
  if (warnings.length > 0) {
    if (errors.length > 0) lines.push("");
    lines.push(`UYARILAR (${warnings.length}):`);
    for (const warning of warnings) {
      lines.push(`  [${warning.code}] ${warning.recordId ?? "-"} ${warning.path}: ${warning.message}`);
    }
  }
  lines.push("");
  lines.push(errors.length === 0 ? "Sonuç: başarılı (uyarılar var)." : "Sonuç: başarısız.");
  return lines.join("\n");
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`Kullanım hatası: ${error.message}`);
    console.error("Yardım için: node scripts/archive/validate.mjs --help");
    return 2;
  }
  if (options.help) {
    console.log(HELP.trimEnd());
    return 0;
  }

  try {
    const root = resolveRoot(options.root);
    const archive = await loadArchive(root);
    const result = await validateArchive({
      records: archive.records,
      taxonomy: archive.taxonomy,
      recordSchema: archive.recordSchema,
      taxonomySchema: archive.taxonomySchema,
      root: archive.root,
      strict: false,
    });
    for (const message of archive.errors) {
      result.errors.push({
        code: "YUKLEME",
        recordId: null,
        path: "$",
        message,
      });
    }
    for (const message of archive.warnings) {
      result.warnings.push({
        code: "YUKLEME_UYARI",
        recordId: null,
        path: "$",
        message,
      });
    }

    let linkResult = null;
    if (options.links) {
      linkResult = await checkArchiveLinks(archive.records);
      for (const failure of linkResult.failures) {
        const references = failure.references
          .map((reference) => `${reference.recordId ?? "-"}${reference.field}`)
          .join(", ");
        result.errors.push({
          code: "LINK_ERISIM",
          recordId: failure.references[0]?.recordId ?? null,
          path: failure.field,
          message: `${failure.url}: ${failure.error}${references ? ` (${references})` : ""}`,
        });
      }
    }

    if (options.strict) {
      for (const warning of result.warnings) {
        result.errors.push({
          code: "SIKI_KIP",
          recordId: warning.recordId,
          path: warning.path,
          message: warning.message,
        });
      }
      result.warnings = [];
    }
    result.ok = result.errors.length === 0;

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            ok: result.ok,
            root: archive.root,
            stats: result.stats,
            errors: result.errors,
            warnings: result.warnings,
            links: linkResult
              ? {
                  checked: linkResult.checked,
                  ok: linkResult.ok,
                  failures: linkResult.failures,
                }
              : null,
          },
          null,
          2
        )
      );
    } else {
      console.log(printHuman(result, { links: linkResult }));
    }
    return result.ok ? 0 : 1;
  } catch (error) {
    console.error(`Beklenmeyen hata: ${error.stack ?? error.message}`);
    return 2;
  }
}

process.exitCode = await main();
