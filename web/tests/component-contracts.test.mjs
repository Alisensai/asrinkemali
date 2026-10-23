import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const components = ["UtilityBar", "Masthead", "Navigation", "Hero", "ShortcutGrid", "Publications", "Chronology", "Archive", "Footer", "SearchDialog"];

test("Sprint 2 bileşen sözleşmeleri mevcuttur", () => {
  for (const name of components) assert.equal(existsSync(path.join(root, "components", `${name}.tsx`)), true, `${name} eksik`);
});

test("ortak yerleşim site chrome bileşenlerini kullanır", () => {
  const layout = readFileSync(path.join(root, "app", "layout.tsx"), "utf8");
  const header = readFileSync(path.join(root, "components", "SiteHeader.tsx"), "utf8");
  assert.match(layout, /<SiteHeader \/>/);
  assert.match(layout, /<Footer \/>/);
  for (const name of ["UtilityBar", "Masthead", "Navigation", "SearchDialog"]) assert.match(header, new RegExp(`<${name}(?: |/|>)`));
});

test("ana sayfa içerik bölümlerini birleştirir", () => {
  const page = readFileSync(path.join(root, "app", "page.tsx"), "utf8");
  for (const name of ["Hero", "ShortcutGrid", "Publications", "Chronology", "Archive"]) assert.match(page, new RegExp(`<${name}(?: |/|>)`));
});

test("arşiv veri sözleşmesi kaynak, lisans ve doğrulama durumu gerektirir", () => {
  const types = readFileSync(path.join(root, "lib", "site-types.ts"), "utf8");
  for (const field of ["source:", "license:", "verificationStatus:"]) assert.match(types, new RegExp(field));
});

test("istenen temel rotalar bulunur", () => {
  for (const route of ["ataturk", "kronoloji", "arsiv", "yayinlar", "hakkimizda"]) assert.equal(existsSync(path.join(root, "app", route, "page.tsx")), true, `/${route} eksik`);
  assert.equal(existsSync(path.join(root, "app", "arsiv", "[slug]", "page.tsx")), true, "/arsiv/[slug] eksik");
});
