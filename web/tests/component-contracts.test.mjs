import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const componentNames = ["UtilityBar", "Masthead", "Navigation", "Hero", "ShortcutGrid", "Publications", "Chronology", "Archive", "Footer", "SearchDialog"];

test("Sprint 2 bileşen sözleşmeleri mevcuttur", () => {
  for (const name of componentNames) assert.equal(existsSync(path.join(root, "components", `${name}.tsx`)), true, `${name} eksik`);
});

test("ana sayfa tüm bölüm bileşenlerini birleştirir", () => {
  const page = readFileSync(path.join(root, "app", "page.tsx"), "utf8");
  for (const name of componentNames) assert.match(page, new RegExp(`<${name}(?: |/|>)`), `${name} ana sayfada kullanılmıyor`);
});

test("arşiv veri sözleşmesi kaynak, lisans ve doğrulama durumu gerektirir", () => {
  const types = readFileSync(path.join(root, "lib", "site-types.ts"), "utf8");
  for (const field of ["source:", "license:", "verificationStatus:"]) assert.match(types, new RegExp(field));
});
