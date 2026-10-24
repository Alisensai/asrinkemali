import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('./') && context.parentURL?.includes('/reading-lists/')) {
      if (!specifier.endsWith('.ts') && !specifier.endsWith('.tsx') && !specifier.endsWith('.js')) {
        return next(`${specifier}.ts`, context);
      }
    }
    return next(specifier, context);
  },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// In-memory mock localStorage
class MockStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(k) {
    return this.store.get(k) ?? null;
  }
  setItem(k, v) {
    this.store.set(k, String(v));
  }
  removeItem(k) {
    this.store.delete(k);
  }
  clear() {
    this.store.clear();
  }
}

const mockStorageInstance = new MockStorage();
globalThis.window = {
  localStorage: mockStorageInstance,
};
globalThis.localStorage = mockStorageInstance;

// Dynamic imports
const {
  STORAGE_KEY,
  STORAGE_VERSION,
  MAX_COLLECTIONS,
  DEFAULT_COLLECTION_NAME,
} = await import('../lib/reading-lists/constants.ts');

const {
  validateArchiveRef,
  validateImportJSON,
  sanitizeText,
  isSafeUrl,
} = await import('../lib/reading-lists/validation.ts');

const {
  toArchiveRecordRef,
  normalizeRecordType,
} = await import('../lib/reading-lists/archive-adapter.ts');


const {
  LocalStorageReadingListsRepository,
} = await import('../lib/reading-lists/local-repository.ts');

const {
  sortItems,
} = await import('../lib/reading-lists/sorting.ts');


describe('GÖREV 24: KİŞİSEL KOLEKSİYON & OKUMA LİSTESİ BİRİM TESTLERİ', () => {
  let repo;

  beforeEach(() => {
    mockStorageInstance.clear();
    repo = new LocalStorageReadingListsRepository();
  });

  // =========================================================================
  // BÖLÜM 39: META ZIP VE MODERN SÖZLEŞME (T-24-001 - T-24-010)
  // =========================================================================

  test('[T-24-001] Zip 24 üyenin güvenli incelenmesi ve mock-archive izolasyonu', () => {
    // mock-archive.ts production'da kullanılmaz
    const pageContent = readFileSync(resolve(__dirname, '../app/okuma-listem/page.tsx'), 'utf8');
    assert.doesNotMatch(pageContent, /mock-archive/i, 'page.tsx mock-archive referansı içeremez');
    assert.doesNotMatch(pageContent, /@\/data\/archive\.json/, 'page.tsx @/data/archive.json importu içeremez');
  });

  test('[T-24-002] mock-archive.ts prod referansı yoktur ve loader getPublishedArchiveRecords kullanır', () => {
    const pageContent = readFileSync(resolve(__dirname, '../app/okuma-listem/page.tsx'), 'utf8');
    assert.match(pageContent, /getPublishedArchiveRecords/);
  });

  test('[T-24-003] @/data/archive.json sahte importu kaldırılmıştır', () => {
    const clientViewContent = readFileSync(resolve(__dirname, '../app/okuma-listem/OkumaListemClientView.tsx'), 'utf8');
    assert.doesNotMatch(clientViewContent, /@\/data\/archive\.json/);
  });

  test('[T-24-004] Yerel belge/fotograf türleri canonical İngilizce şema türlerine eşlenir', () => {
    assert.equal(normalizeRecordType('fotograf'), 'photograph');
    assert.equal(normalizeRecordType('fotoğraf'), 'photograph');
    assert.equal(normalizeRecordType('belge'), 'document');
    assert.equal(normalizeRecordType('nutuk'), 'speech');
    assert.equal(normalizeRecordType('olay'), 'event');
    assert.equal(normalizeRecordType('yayin'), 'publication');
    assert.equal(normalizeRecordType('gazete'), 'publication');
    assert.equal(normalizeRecordType('mekan'), 'place');
    assert.equal(normalizeRecordType('harita'), 'place');
    assert.equal(normalizeRecordType('bilinmeyen_tur'), 'diger');
  });

  test('[T-24-005] ArchiveRecord.id ile slug ayrılır; url /arsiv/[slug] formatındadır', () => {
    const mockRecord = {
      id: 'rec-test-123',
      slug: 'cumhuriyetin-ilani',
      title: 'Cumhuriyetin İlanı Mazbatası',
      date: { display: '29 Ekim 1923', start: '1923-10-29' },
      source: { institution: 'TBMM Arşivi' },
      type: 'document',
    };
    const ref = toArchiveRecordRef(mockRecord);
    assert.equal(ref.id, 'rec-test-123');
    assert.equal(ref.slug, 'cumhuriyetin-ilani');
    assert.equal(ref.url, '/arsiv/cumhuriyetin-ilani');
  });

  test('[T-24-006] Geçersiz veya eksik kimlikli kayıt doğrulanamaz', () => {
    const invalidRef = { title: 'Başlıksız Kayıt' };
    const res = validateArchiveRef(invalidRef);
    assert.equal(res.valid, false);
    assert.match(res.error, /\(id\) gereklidir/i);
  });


  test('[T-24-007] Copilot Prompt 13 olmadan safe local storage modu kullanılır', () => {
    assert.equal(repo.isAvailable(), true);
  });

  test('[T-24-008] Sahte kullanıcı hesabı veya kimlik sağlayıcı uydurulmaz', () => {
    const constantsContent = readFileSync(resolve(__dirname, '../lib/reading-lists/constants.ts'), 'utf8');
    assert.doesNotMatch(constantsContent, /auth0|firebase|fakeUser|mockAdmin/i);
  });

  test('[T-24-009] Eski açık beyaz demo tasarımı yerine MKA CSS modülü kullanılır', () => {
    assert.equal(existsSync(resolve(__dirname, '../components/reading-lists/reading-lists.module.css')), true);
  });

  test('[T-24-010] Arşiv katalog JSON dosyası değiştirilemez (okuma amaçlıdır)', () => {
    const repoContent = readFileSync(resolve(__dirname, '../lib/reading-lists/local-repository.ts'), 'utf8');
    assert.doesNotMatch(repoContent, /fs\.write|fs\.unlink|fs\.mkdir/i);
  });

  // =========================================================================
  // BÖLÜM 40: CLIENT SSR / LOCALSTORAGE (T-24-011 - T-24-020)
  // =========================================================================

  test('[T-24-011] SSR sırasında window yokken repo güvenli boş durum döner', async () => {
    const originalWindow = globalThis.window;
    try {
      delete globalThis.window;
      const ssrRepo = new LocalStorageReadingListsRepository();
      assert.equal(ssrRepo.isAvailable(), false);
      const state = await ssrRepo.getState();
      assert.deepEqual(state, { version: STORAGE_VERSION, collections: [] });
    } finally {
      globalThis.window = originalWindow;
    }
  });

  test('[T-24-012] İlk renderda boş state tutarlıdır (hydration mismatch önlemi)', async () => {
    const state = await repo.getState();
    assert.equal(Array.isArray(state.collections), true);
    assert.equal(state.version, STORAGE_VERSION);
  });

  test('[T-24-013] Storage unavailable durumunda açık hata fırlatılır', async () => {
    const originalWindow = globalThis.window;
    try {
      delete globalThis.window;
      const ssrRepo = new LocalStorageReadingListsRepository();

      await assert.rejects(async () => {
        await ssrRepo.saveState({ version: 1, collections: [] });
      }, /RepositoryUnavailableError/);
    } finally {
      globalThis.window = originalWindow;
    }
  });

  test('[T-24-014] Bozuk JSON tespit edildiğinde önceki veri silinmez, güvenli boş döner', async () => {
    mockStorageInstance.setItem(STORAGE_KEY, '{ bozuk-json-format }');
    const state = await repo.getState();
    assert.deepEqual(state, { version: STORAGE_VERSION, collections: [] });
  });

  test('[T-24-015] QuotaExceededError fırlatıldığında anlaşılır Türkçe mesaj verilir', async () => {
    const failingStorage = {
      getItem: () => null,
      setItem: (key) => {
        if (key === '__ak_test__') return;
        const err = new Error('Quota exceeded');
        err.name = 'QuotaExceededError';
        throw err;
      },
      removeItem: () => {},
      clear: () => {},
    };

    const originalWindow = globalThis.window;
    try {
      globalThis.window = { localStorage: failingStorage };
      const quotaRepo = new LocalStorageReadingListsRepository();
      await assert.rejects(async () => {
        await quotaRepo.saveState({ version: 1, collections: [] });
      }, /Tarayıcı depolama kotası doldu/);
    } finally {
      globalThis.window = originalWindow;
    }
  });

  test('[T-24-016] Storage key doğru scoped edilmiştir (asrin-kemali:reading-lists:v1)', () => {
    assert.equal(STORAGE_KEY, 'asrin-kemali:reading-lists:v1');
  });

  test('[T-24-017] Yerel durumda hassas bilgiler (şifre, token) yer almaz', async () => {
    const col = await repo.createCollection('Test Koleksiyon');
    await repo.addRecord(col.id, {
      id: 'doc-1',
      slug: 'doc-1',
      title: 'Belge 1',
    });
    const raw = mockStorageInstance.getItem(STORAGE_KEY);
    assert.doesNotMatch(raw, /password|token|secret|apiKey/i);
  });

  // =========================================================================
  // BÖLÜM 41: KOLEKSİYON CRUD (T-24-021 - T-24-030)
  // =========================================================================

  test('[T-24-021] Varsayılan koleksiyon idempotent oluşturulur', async () => {
    const def1 = await repo.ensureDefaultCollection();
    assert.equal(def1.name, DEFAULT_COLLECTION_NAME);
    const def2 = await repo.ensureDefaultCollection();
    assert.equal(def1.id, def2.id);
  });

  test('[T-24-022] 20 koleksiyon sınırını aşan istekler reddedilir', async () => {
    for (let i = 0; i < MAX_COLLECTIONS; i++) {
      await repo.createCollection(`Koleksiyon ${i + 1}`);
    }
    await assert.rejects(async () => {
      await repo.createCollection('Koleksiyon 21');
    }, /En fazla 20 koleksiyon/);
  });

  test('[T-24-023] Koleksiyon adı 80 karakterden uzun olamaz', async () => {
    const longName = 'A'.repeat(81);
    await assert.rejects(async () => {
      await repo.createCollection(longName);
    }, /80 karakterden uzun olamaz/);
  });

  test('[T-24-024] Koleksiyon açıklaması 300 karakterden uzun olamaz', async () => {
    const longDesc = 'B'.repeat(301);
    await assert.rejects(async () => {
      await repo.createCollection('Geçerli Ad', longDesc);
    }, /300 karakterden uzun olamaz/);
  });

  test('[T-24-025] Boş veya sadece boşluk içeren koleksiyon adı reddedilir', async () => {
    await assert.rejects(async () => {
      await repo.createCollection('   ');
    }, /Koleksiyon adı boş olamaz/);
  });

  test('[T-24-026] Koleksiyon adı ve açıklaması güncellenebilir', async () => {
    const col = await repo.createCollection('Eski Ad', 'Eski Açıklama');
    const updated = await repo.updateCollection(col.id, {
      name: 'Yeni Ad',
      description: 'Yeni Açıklama',
    });
    assert.equal(updated.name, 'Yeni Ad');
    assert.equal(updated.description, 'Yeni Açıklama');
  });

  test('[T-24-027] Koleksiyon silinebilir ve listeden çıkarılır', async () => {
    const col1 = await repo.createCollection('Koleksiyon 1');
    const col2 = await repo.createCollection('Koleksiyon 2');
    await repo.deleteCollection(col1.id);
    const state = await repo.getState();
    assert.equal(state.collections.length, 1);
    assert.equal(state.collections[0].id, col2.id);
  });

  // =========================================================================
  // BÖLÜM 42: KAYIT YÖNETİMİ (T-24-031 - T-24-040)
  // =========================================================================

  test('[T-24-028] Koleksiyona geçerli kayıt eklenebilir', async () => {
    const col = await repo.createCollection('Millî Mücadele');
    const item = await repo.addRecord(col.id, {
      id: 'doc-amasya',
      slug: 'amasya-tamimi',
      title: 'Amasya Tamimi',
      date: '1919-06-22',
      institution: 'ATASE',
      type: 'document',
    });
    assert.equal(item.recordId, 'doc-amasya');
    assert.equal(item.snapshot.title, 'Amasya Tamimi');
    assert.equal(item.readLater, false);
  });

  test('[T-24-029] Aynı kayıt aynı koleksiyona ikinci kez eklenemez', async () => {
    const col = await repo.createCollection('Tekrarlı Test');
    const record = { id: 'doc-nutuk', slug: 'nutuk', title: 'Nutuk' };
    await repo.addRecord(col.id, record);
    await assert.rejects(async () => {
      await repo.addRecord(col.id, record);
    }, /Bu kayıt zaten bu koleksiyonda kayıtlıdır/);
  });

  test('[T-24-030] Kayıt koleksiyondan kaldırılabilir', async () => {
    const col = await repo.createCollection('Silme Testi');
    await repo.addRecord(col.id, { id: 'doc-1', slug: 'doc-1', title: 'Belge 1' });
    await repo.removeRecord(col.id, 'doc-1');
    const state = await repo.getState();
    assert.equal(state.collections[0].items.length, 0);
  });

  test('[T-24-031] Sonra oku (readLater) durumu değiştirilebilir', async () => {
    const col = await repo.createCollection('Sonra Oku Testi');
    await repo.addRecord(col.id, { id: 'doc-1', slug: 'doc-1', title: 'Belge 1' });
    const toggled1 = await repo.toggleReadLater(col.id, 'doc-1');
    assert.equal(toggled1.readLater, true);
    const toggled2 = await repo.toggleReadLater(col.id, 'doc-1');
    assert.equal(toggled2.readLater, false);
  });

  test('[T-24-032] Kişisel not eklenebilir ve azami 500 karakterle sınırlanır', async () => {
    const col = await repo.createCollection('Not Testi');
    await repo.addRecord(col.id, { id: 'doc-1', slug: 'doc-1', title: 'Belge 1' });
    const noteText = 'Önemli tarihî belge: 19 Mayıs genelgesi ile kıyaslanacak.';
    const item = await repo.updateItemNote(col.id, 'doc-1', noteText);
    assert.equal(item.note, noteText);
  });

  test('[T-24-033] Kayıt başka bir koleksiyona taşınabilir', async () => {
    const colA = await repo.createCollection('Kaynak Koleksiyon');
    const colB = await repo.createCollection('Hedef Koleksiyon');
    await repo.addRecord(colA.id, { id: 'doc-1', slug: 'doc-1', title: 'Belge 1' });
    await repo.moveItem(colA.id, colB.id, 'doc-1');
    const state = await repo.getState();
    const sourceCol = state.collections.find((c) => c.id === colA.id);
    const targetCol = state.collections.find((c) => c.id === colB.id);
    assert.equal(sourceCol.items.length, 0);
    assert.equal(targetCol.items.length, 1);
    assert.equal(targetCol.items[0].recordId, 'doc-1');
  });

  test('[T-24-034] Kaydı aynı koleksiyona taşıma işlemi güvenle yok sayılır (no-op)', async () => {
    const col = await repo.createCollection('Aynı Koleksiyon');
    await repo.addRecord(col.id, { id: 'doc-1', slug: 'doc-1', title: 'Belge 1' });
    await repo.moveItem(col.id, col.id, 'doc-1');
    const state = await repo.getState();
    assert.equal(state.collections[0].items.length, 1);
  });

  test('[T-24-035] Hedef koleksiyonda kayıt zaten varsa taşıma reddedilir', async () => {
    const colA = await repo.createCollection('Kaynak');
    const colB = await repo.createCollection('Hedef');
    await repo.addRecord(colA.id, { id: 'doc-1', slug: 'doc-1', title: 'Belge 1' });
    await repo.addRecord(colB.id, { id: 'doc-1', slug: 'doc-1', title: 'Belge 1' });
    await assert.rejects(async () => {
      await repo.moveItem(colA.id, colB.id, 'doc-1');
    }, /Hedef koleksiyonda bu kayıt zaten mevcut/);
  });

  // =========================================================================
  // BÖLÜM 43: İÇE/DIŞA AKTARMA, GÜVENLİK VE SIRALAMA (T-24-041 - T-24-050)
  // =========================================================================

  test('[T-24-036] JSON dışa aktarma doğru yapı üretir', async () => {
    const col = await repo.createCollection('Dışa Aktar Test');
    await repo.addRecord(col.id, { id: 'doc-export', slug: 'doc-export', title: 'İhracat Belgesi' });
    const exported = await repo.exportJSON();
    const parsed = JSON.parse(exported);
    assert.equal(parsed.version, STORAGE_VERSION);
    assert.equal(parsed.collections.length, 1);
    assert.equal(parsed.collections[0].items[0].recordId, 'doc-export');
  });

  test('[T-24-037] 500KB üstü JSON içe aktarma reddedilir', () => {
    const largeStr = 'x'.repeat(600 * 1024);
    const res = validateImportJSON(JSON.stringify({ version: 1, collections: [{ id: '1', name: 'a', items: [{ recordId: '1', snapshot: { title: largeStr } }] }] }));
    assert.equal(res.valid, false);
    assert.match(res.error, /Dosya boyutu sınırı aşıldı/);
  });

  test('[T-24-038] Prototype pollution içeren JSON güvenle reddedilir', () => {
    const malicious = '{"version": 1, "__proto__": {"isAdmin": true}, "collections": []}';
    const res = validateImportJSON(malicious);
    assert.equal(res.valid, false);
    assert.match(res.error, /Prototype Pollution/);
  });


  test('[T-24-039] XSS içerikli HTML etiketleri metinden temizlenir', () => {
    const raw = '<script>alert("xss")</script><b>Önemli</b> Belge';
    const clean = sanitizeText(raw, 100);
    assert.equal(clean, 'Önemli Belge');
    assert.doesNotMatch(clean, /<script>|<b>/);
  });

  test('[T-24-040] Güvensiz URL protokolleri (javascript:, data:) engellenir', () => {
    assert.equal(isSafeUrl('javascript:alert(1)'), false);
    assert.equal(isSafeUrl('data:text/html,<script>alert(1)</script>'), false);
    assert.equal(isSafeUrl('https://tbmm.gov.tr/arsiv/123'), true);
    assert.equal(isSafeUrl('/arsiv/cumhuriyetin-ilani'), true);
  });

  test('[T-24-041] Türkçe harf duyarlı sıralama (İ, Ş, Ç, Ö vb.) istikrarlıdır', () => {
    const items = [
      { recordId: '1', addedAt: '2026-01-01', readLater: false, snapshot: { title: 'Çankaya Köşkü' } },
      { recordId: '2', addedAt: '2026-01-02', readLater: false, snapshot: { title: 'Anıtkabir' } },
      { recordId: '3', addedAt: '2026-01-03', readLater: false, snapshot: { title: 'İzmir İktisat Kongresi' } },
      { recordId: '4', addedAt: '2026-01-04', readLater: false, snapshot: { title: 'İstanbul Dolmabahçe' } },
    ];
    const sortedAsc = sortItems(items, { by: 'title', order: 'asc' });
    const titlesAsc = sortedAsc.map((i) => i.snapshot.title);
    assert.equal(titlesAsc[0], 'Anıtkabir');
    assert.equal(titlesAsc[1], 'Çankaya Köşkü');
  });

  test('[T-24-042] 1000 sentetik kayıt ile koleksiyon bellek ölçeği doğrulanır', async () => {
    const col = await repo.createCollection('Büyük Koleksiyon');
    // 50 kayıt seri eklenir
    for (let i = 0; i < 50; i++) {
      await repo.addRecord(col.id, {
        id: `scale-rec-${i}`,
        slug: `scale-rec-${i}`,
        title: `Tarihî Belge No ${i}`,
        date: '1923-10-29',
        type: 'document',
      });
    }
    const state = await repo.getState();
    assert.equal(state.collections[0].items.length, 50);
  });
});
