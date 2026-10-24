import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  REPO_ROOT,
  resolveRoot,
  readJsonFile,
  loadTaxonomy,
  loadSchema,
  loadRecords,
  loadArchive,
} from "../lib/load.mjs";

test("gerçek arşiv yüklenir ve dosya eşlemesi tutarlıdır", async () => {
  const archive = await loadArchive();
  assert.equal(archive.errors.length, 0, archive.errors.join("\n"));
  assert.equal(archive.warnings.length, 0, archive.warnings.join("\n"));
  assert.equal(archive.records.length, 168);
  assert.equal(archive.files.length, 168);
  assert.equal(archive.root, REPO_ROOT);
  assert.ok(archive.taxonomy.categories.length > 0);
  assert.ok(archive.recordSchema);
  assert.ok(archive.taxonomySchema);
  assert.equal(archive.records[0].id, "1924-anayasasi");
  assert.equal(archive.files[0].file, "1924-anayasasi.json");
});

test("resolveRoot göreli ve mutlak yolları çözer", () => {
  assert.equal(resolveRoot(), REPO_ROOT);
  assert.equal(resolveRoot("."), REPO_ROOT);
  assert.equal(path.isAbsolute(resolveRoot("test-root")), true);
});

test("readJsonFile BOM uyarısı verir ve geçersiz JSON'u hata olarak döndürür", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "asrin-yukle-"));
  try {
    const bomFile = path.join(dir, "bom.json");
    await fs.writeFile(bomFile, `\uFEFF{"ok":true}`, "utf8");
    const bom = await readJsonFile(bomFile);
    assert.deepEqual(bom.data, { ok: true });
    assert.equal(bom.errors.length, 0);
    assert.equal(bom.warnings.length, 1);
    assert.match(bom.warnings[0], /BOM/);

    const badFile = path.join(dir, "bad.json");
    await fs.writeFile(badFile, "{bozuk", "utf8");
    const bad = await readJsonFile(badFile);
    assert.equal(bad.data, null);
    assert.match(bad.errors[0], /Geçersiz JSON/);

    const missing = await readJsonFile(path.join(dir, "yok.json"));
    assert.match(missing.errors[0], /bulunamadı/);

    const size = await readJsonFile(bomFile, { maxBytes: 2 });
    assert.match(size.errors[0], /sınırını aşıyor/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("loadRecords dizin yoksa ve boşsa hata üretir", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "asrin-kayit-"));
  try {
    const missing = await loadRecords(dir);
    assert.match(missing.errors[0], /Kayıt dizini okunamadı/);

    const recordsDir = path.join(dir, "content", "archive", "records");
    await fs.mkdir(recordsDir, { recursive: true });
    const empty = await loadRecords(dir);
    assert.match(empty.errors[0], /hiç JSON dosyası yok/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("loadRecords tek nesne, dizi ve bozuk dosyayı birlikte işler", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "asrin-kayit-"));
  try {
    const recordsDir = path.join(dir, "content", "archive", "records");
    await fs.mkdir(recordsDir, { recursive: true });
    await fs.writeFile(path.join(recordsDir, "a.json"), JSON.stringify({ id: "a" }), "utf8");
    await fs.writeFile(path.join(recordsDir, "b.json"), JSON.stringify([{ id: "b" }, { id: "c" }]), "utf8");
    await fs.writeFile(path.join(recordsDir, "c.json"), "{bozuk", "utf8");
    const result = await loadRecords(dir);
    assert.equal(result.records.length, 3);
    assert.equal(result.files.length, 3);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0], /c\.json/);
    assert.deepEqual(result.files.map((item) => item.file), ["a.json", "b.json", "b.json"]);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("loadRecords eski ve katalog dizinlerini birlikte yükler", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "asrin-kayit-"));
  try {
    const legacyDir = path.join(dir, "content", "archive", "records");
    const catalogDir = path.join(dir, "data", "archive", "catalog");
    await fs.mkdir(legacyDir, { recursive: true });
    await fs.mkdir(catalogDir, { recursive: true });
    await fs.writeFile(path.join(legacyDir, "eski.json"), JSON.stringify({ id: "eski" }), "utf8");
    await fs.writeFile(path.join(catalogDir, "yeni.json"), JSON.stringify({ id: "yeni" }), "utf8");

    const result = await loadRecords(dir);
    assert.equal(result.errors.length, 0, result.errors.join("\n"));
    assert.deepEqual(result.records.map((record) => record.id), ["eski", "yeni"]);
    assert.deepEqual(result.files.map((item) => item.source), ["legacy", "catalog"]);
    assert.deepEqual(result.files.map((item) => item.path), [
      "content/archive/records/eski.json",
      "data/archive/catalog/yeni.json",
    ]);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("loadTaxonomy ve loadSchema eksik dosyaları hata olarak döndürür", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "asrin-sema-"));
  try {
    const taxonomy = await loadTaxonomy(dir);
    assert.equal(taxonomy.taxonomy, null);
    assert.match(taxonomy.errors[0], /Taksonomi/);
    const schema = await loadSchema(dir, "yok.json");
    assert.equal(schema.schema, null);
    assert.match(schema.errors[0], /Şema/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
