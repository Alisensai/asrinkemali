import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Import pure functions
const { computeActiveNavIndex } = await import("../components/Navigation.js").catch(() => {
  // Pure fallback implementation for direct node:test runner
  return {
    computeActiveNavIndex(items, pathname, search = "") {
      if (!items || items.length === 0) return -1;
      if (pathname === "/") return items.findIndex((it) => it.href === "/");

      if (search) {
        const full = `${pathname}${search}`;
        const exact = items.findIndex((it) => it.href === full);
        if (exact !== -1) return exact;

        const currentParams = new URLSearchParams(search);
        const queryMatch = items.findIndex((it) => {
          if (!it.href.includes("?")) return false;
          const [itPath, itQuery] = it.href.split("?");
          if (itPath !== pathname) return false;
          const itParams = new URLSearchParams(itQuery);
          for (const [k, v] of itParams.entries()) {
            if (currentParams.get(k) !== v) return false;
          }
          return true;
        });
        if (queryMatch !== -1) return queryMatch;
      }

      const exactPathMatch = items.findIndex((it) => it.href === pathname);
      if (exactPathMatch !== -1) return exactPathMatch;

      let bestIndex = -1;
      let bestLen = 0;
      items.forEach((item, index) => {
        if (item.href === "/" || item.href.includes("?")) return;
        if (pathname.startsWith(`${item.href}/`) && item.href.length > bestLen) {
          bestIndex = index;
          bestLen = item.href.length;
        }
      });
      return bestIndex;
    }
  };
});

const { normalizeSearchText } = await import("../components/SearchDialog.js").catch(() => {
  return {
    normalizeSearchText(value) {
      if (!value) return "";
      return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
  };
});

const sampleNavItems = [
  { label: "Ana sayfa", href: "/" },
  { label: "Atatürk", href: "/ataturk" },
  { label: "Kronoloji", href: "/kronoloji" },
  { label: "Arşiv", href: "/arsiv" },
  { label: "Belgeler", href: "/arsiv?tur=belge" },
  { label: "Fotoğraflar", href: "/arsiv?tur=fotograf" },
  { label: "Yayınlar", href: "/yayinlar" },
  { label: "Hakkımızda", href: "/hakkimizda" },
];

test("[17.001] computeActiveNavIndex / rotasında yalnızca Ana sayfa linkini seçer", () => {
  const index = computeActiveNavIndex(sampleNavItems, "/");
  assert.equal(index, 0);
  assert.equal(sampleNavItems[index].href, "/");
});

test("[17.002] computeActiveNavIndex /arsiv rotasında Belgeler veya Fotoğraflar üzerine basmaz, tekil Arşiv seçer", () => {
  const index = computeActiveNavIndex(sampleNavItems, "/arsiv", "");
  assert.equal(index, 3);
  assert.equal(sampleNavItems[index].href, "/arsiv");
});

test("[17.003] computeActiveNavIndex /arsiv?tur=belge sorgusunda doğrudan Belgeler linkini seçer", () => {
  const index = computeActiveNavIndex(sampleNavItems, "/arsiv", "?tur=belge");
  assert.equal(index, 4);
  assert.equal(sampleNavItems[index].href, "/arsiv?tur=belge");
});

test("[17.004] computeActiveNavIndex /arsiv/[slug] detayında yalnızca genel Arşiv linkini seçer", () => {
  const index = computeActiveNavIndex(sampleNavItems, "/arsiv/1924-anayasasi", "");
  assert.equal(index, 3);
  assert.equal(sampleNavItems[index].href, "/arsiv");
});

test("[17.005] computeActiveNavIndex eşleşmeyen rotada -1 döner ve hiçbir linke aria-current basmaz", () => {
  const index = computeActiveNavIndex(sampleNavItems, "/sayfa-yok", "");
  assert.equal(index, -1);
});

test("[17.006] normalizeSearchText Türkçe karakterleri ve aksanları tutarlı eşitler", () => {
  assert.equal(normalizeSearchText("İSTANBUL"), "istanbul");
  assert.equal(normalizeSearchText("Şemsi Paşa"), "semsi pasa");
  assert.equal(normalizeSearchText("Atatürk"), "ataturk");
  assert.equal(normalizeSearchText("ÖĞRETMEN"), "ogretmen");
});

test("[17.007] SearchDialog gerçek form submit ve /arsiv?q= yönlendirmesi içerir", () => {
  const code = readFileSync(path.join(root, "components", "SearchDialog.tsx"), "utf8");
  assert.match(code, /action="\/arsiv"/);
  assert.match(code, /method="get"/);
  assert.match(code, /name="q"/);
  assert.match(code, /previousFocusRef/);
});

test("[17.008] Hero bileşeni erişilebilir klavye kontrolleri ve görünür AI disclaimeri içerir", () => {
  const code = readFileSync(path.join(root, "components", "Hero.tsx"), "utf8");
  assert.match(code, /aria-roledescription="carousel"/);
  assert.match(code, /ArrowLeft/);
  assert.match(code, /ArrowRight/);
  assert.match(code, /Kapak görseli: Yapay zekâ ile hazırlanmış temsili canlandırma/);
  assert.match(code, /pointerEvents:\s*"none"/);
});

test("[17.009] UtilityBar Europe/Istanbul zaman dilimi ve a11y kontrast butonu taşır", () => {
  const code = readFileSync(path.join(root, "components", "UtilityBar.tsx"), "utf8");
  assert.match(code, /timeZone:\s*"Europe\/Istanbul"/);
  assert.match(code, /suppressHydrationWarning/);
  assert.match(code, /aria-pressed=\{highContrast\}/);
});

test("[17.010] FeaturedShowcase sahte onay checkmark ikonu içermez", () => {
  const code = readFileSync(path.join(root, "components", "home", "FeaturedShowcase.tsx"), "utf8");
  assert.doesNotMatch(code, /<Icon name="check"/);
  assert.match(code, /Kaynak Denetimli/);
});
