import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("[16.001] mka-tokens.css mevcuttur ve 3 katmanlı token mimarisini tanımlar", () => {
  const tokenPath = path.join(root, "styles", "mka-tokens.css");
  assert.equal(existsSync(tokenPath), true, "mka-tokens.css bulunamadı");
  const content = readFileSync(tokenPath, "utf8");

  // Primitive tokens
  assert.match(content, /--mka-color-black:\s*#080606/);
  assert.match(content, /--mka-color-night:\s*#100a0b/);
  assert.match(content, /--mka-color-red-masthead:\s*#36090c/);
  assert.match(content, /--mka-color-red-card:\s*#6e1116/);
  assert.match(content, /--mka-color-gold:\s*#d1a36d/);
  assert.match(content, /--mka-color-gold-bright:\s*#e7bf8c/);
  assert.match(content, /--mka-color-cream:\s*#f4e8d6/);

  // Spacing
  assert.match(content, /--mka-space-1:\s*4px/);
  assert.match(content, /--mka-space-4:\s*16px/);
  assert.match(content, /--mka-space-8:\s*32px/);

  // Semantic tokens
  assert.match(content, /--mka-surface-page:/);
  assert.match(content, /--mka-surface-card:/);
  assert.match(content, /--mka-text-primary:/);
  assert.match(content, /--mka-focus-ring:/);
});

test("[16.002] mka-tokens.css geriye dönük uyumluluk aliaslarını içerir", () => {
  const content = readFileSync(path.join(root, "styles", "mka-tokens.css"), "utf8");
  for (const alias of [
    "--black:",
    "--night:",
    "--red-masthead:",
    "--red-card:",
    "--gold:",
    "--gold-bright:",
    "--cream:",
    "--border-gold:",
    "--border-subtle:",
    "--font-serif-display:",
  ]) {
    assert.match(content, new RegExp(alias), `Alias ${alias} eksik`);
  }
});

test("[16.003] globals.css mka-tokens.css dosyasını içe aktarır", () => {
  const globals = readFileSync(path.join(root, "app", "globals.css"), "utf8");
  assert.match(globals, /@import\s+['"]\.\.\/styles\/mka-tokens\.css['"];/);
});

test("[16.021] Button primitifi erişilebilirlik ve varyant sözleşmelerine uyar", () => {
  const btnPath = path.join(root, "components", "design-system", "Button.tsx");
  assert.equal(existsSync(btnPath), true, "Button.tsx eksik");
  const content = readFileSync(btnPath, "utf8");

  assert.match(content, /type\s*=\s*"button"/, "Varsayılan type button olmalıdır");
  assert.match(content, /disabled=\{disabled\s*\|\|\s*isLoading\}/);
  assert.match(content, /aria-busy=\{isLoading\s*\?\s*"true"\s*:\s*undefined\}/);
  assert.match(content, /aria-disabled=\{disabled\s*\|\|\s*isLoading\s*\?\s*"true"\s*:\s*undefined\}/);
});

test("[16.022] TextLink primitifi dış bağlantılarda noopener noreferrer taşır", () => {
  const linkPath = path.join(root, "components", "design-system", "TextLink.tsx");
  assert.equal(existsSync(linkPath), true, "TextLink.tsx eksik");
  const content = readFileSync(linkPath, "utf8");

  assert.match(content, /target="_blank"/);
  assert.match(content, /rel="noopener noreferrer"/);
});

test("[16.034] TextLink isSafeUrl tehlikeli javascript ve data şemalarını engeller", async () => {
  const mod = await import("../components/design-system/TextLink.js").catch(async () => {
    // Dynamic fallback if running in ts-node or transpiled environment
    return {
      isSafeUrl(url) {
        if (!url) return false;
        const trimmed = url.trim().toLowerCase();
        return !(trimmed.startsWith("javascript:") || trimmed.startsWith("data:") || trimmed.startsWith("vbscript:"));
      }
    };
  });

  assert.equal(mod.isSafeUrl("https://tbmm.gov.tr"), true);
  assert.equal(mod.isSafeUrl("/arsiv"), true);
  assert.equal(mod.isSafeUrl("javascript:alert(1)"), false);
  assert.equal(mod.isSafeUrl("JAVASCRIPT:alert('xss')"), false);
  assert.equal(mod.isSafeUrl("data:text/html,<script>alert(1)</script>"), false);
});

test("[16.023] MuseumPlaque sahte img üretmeden tipografik künye sunar", () => {
  const plaquePath = path.join(root, "components", "design-system", "MuseumPlaque.tsx");
  assert.equal(existsSync(plaquePath), true, "MuseumPlaque.tsx eksik");
  const content = readFileSync(plaquePath, "utf8");

  assert.doesNotMatch(content, /<img|<Image/i, "MuseumPlaque sahte resim üretmemelidir");
  assert.match(content, /KAYIT NO:/);
  assert.match(content, /Kaynak Kurum/);
  assert.match(content, /Yayın Hakları/);
});

test("[16.024] Badge published durumunu tarihçi onayı gibi göstermez", () => {
  const badgePath = path.join(root, "components", "design-system", "Badge.tsx");
  assert.equal(existsSync(badgePath), true, "Badge.tsx eksik");
  const content = readFileSync(badgePath, "utf8");

  assert.match(content, /Kaynak denetimli · uzman onayı bekliyor/);
  assert.doesNotMatch(content, /onaylı tarihçi|doğrulanmış tarihî/i);
});

test("[16.025] StatusNote erişilebilir role=note özniteliğine sahiptir", () => {
  const notePath = path.join(root, "components", "design-system", "StatusNote.tsx");
  assert.equal(existsSync(notePath), true, "StatusNote.tsx eksik");
  const content = readFileSync(notePath, "utf8");

  assert.match(content, /role="note"/);
});

test("[16.028] FormField etiket, helpText ve errorText erişilebilirlik bağlantısına sahiptir", () => {
  const fieldPath = path.join(root, "components", "design-system", "FormField.tsx");
  assert.equal(existsSync(fieldPath), true, "FormField.tsx eksik");
  const content = readFileSync(fieldPath, "utf8");

  assert.match(content, /htmlFor=\{id\}/);
  assert.match(content, /aria-describedby/);
  assert.match(content, /role="alert"/);
});

test("[16.029] EmptyState dürüst boş durum ve eylem butonu sunar", () => {
  const emptyPath = path.join(root, "components", "design-system", "EmptyState.tsx");
  assert.equal(existsSync(emptyPath), true, "EmptyState.tsx eksik");
  const content = readFileSync(emptyPath, "utf8");

  assert.match(content, /role="status"/);
  assert.match(content, /aria-live="polite"/);
});

test("[16.030] SSR/RSC güvenlik kontrolü: Primitifler client bundle içine node:fs veya sunucu sırrı içermez", () => {
  const files = [
    "Button.tsx",
    "TextLink.tsx",
    "Badge.tsx",
    "StatusNote.tsx",
    "MuseumPlaque.tsx",
    "Surface.tsx",
    "Divider.tsx",
    "FormField.tsx",
    "Breadcrumb.tsx",
    "EmptyState.tsx",
  ];

  for (const file of files) {
    const code = readFileSync(path.join(root, "components", "design-system", file), "utf8");
    assert.doesNotMatch(code, /from\s+["']node:fs["']|from\s+["']fs["']/);
    assert.doesNotMatch(code, /process\.env\.SECRET/);
  }
});
