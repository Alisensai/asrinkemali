import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test.describe('Asrın Kemali - Kişisel Koleksiyon ve Okuma Listesi E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/okuma-listem');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('sayfa yüklenir, başlık ve gizlilik uyarısı görünür', async ({ page }) => {
    await page.goto('/okuma-listem');
    await expect(page.getByRole('heading', { name: /Okuma Listem/i })).toBeVisible();
    await expect(page.getByText(/Yerel Gizlilik ve Depolama Bildirimi/i)).toBeVisible();
    await expect(page.getByText(/Henüz Bir Koleksiyon Oluşturmadınız/i)).toBeVisible();
  });

  test('yeni koleksiyon oluşturulur ve aktif hale gelir', async ({ page }) => {
    await page.goto('/okuma-listem');
    await page.getByRole('button', { name: /İlk koleksiyonu oluştur/i }).click();

    await page.getByLabel(/Koleksiyon Adı/i).fill('Millî Mücadele Belgeleri');
    await page.getByRole('button', { name: /^Oluştur$/i }).click();

    await expect(page.getByRole('heading', { name: 'Millî Mücadele Belgeleri', exact: true })).toBeVisible();
    await expect(page.getByText(/Henüz Boş/i)).toBeVisible();
  });

  test('arşivden modal ile yayınlanmış kayıt eklenir', async ({ page }) => {
    await page.goto('/okuma-listem');

    // Koleksiyon oluştur
    await page.getByRole('button', { name: /İlk koleksiyonu oluştur/i }).click();
    await page.getByLabel(/Koleksiyon Adı/i).fill('Önemli Belgeler');
    await page.getByRole('button', { name: /^Oluştur$/i }).click();

    // Modal aç
    await page.getByRole('button', { name: /Arşivden Kayıt Ekle|Arşivden Ekle/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Arşivden Kayıt Ekle' })).toBeVisible();

    // İlk kaydı ekle
    const addBtn = page.getByRole('button', { name: '+ Ekle' }).first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await expect(page.getByText(/koleksiyona eklendi/i)).toBeVisible();

    // Modalı kapat
    await page.getByRole('button', { name: 'Modalı kapat' }).click();

    // Kart görünmeli
    await expect(page.getByRole('article').first()).toBeVisible();
  });

  test('sonra oku bayrağı açılıp kapatılır', async ({ page }) => {
    await page.goto('/okuma-listem');

    // Koleksiyon ve kayıt hazırla
    await page.getByRole('button', { name: /İlk koleksiyonu oluştur/i }).click();
    await page.getByLabel(/Koleksiyon Adı/i).fill('Okuma Takibi');
    await page.getByRole('button', { name: /^Oluştur$/i }).click();

    await page.getByRole('button', { name: /Arşivden Kayıt Ekle|Arşivden Ekle/i }).first().click();
    await page.getByRole('button', { name: '+ Ekle' }).first().click();
    await page.getByRole('button', { name: 'Modalı kapat' }).click();

    // Sonra oku butonuna tıkla
    const readLaterBtn = page.getByRole('button', { name: /Sonra oku/i }).first();
    await readLaterBtn.click();
    await expect(page.getByLabel('Sonra okunacak olarak işaretli')).toBeVisible();

    // Tekrar tıkla kapat
    const markedBtn = page.getByRole('button', { name: /İşaretli/i }).first();
    await markedBtn.click();
    await expect(page.getByLabel('Sonra okunacak olarak işaretli')).toHaveCount(0);
  });


  test('kişisel not eklenir ve kaydedilir', async ({ page }) => {
    await page.goto('/okuma-listem');

    await page.getByRole('button', { name: /İlk koleksiyonu oluştur/i }).click();
    await page.getByLabel(/Koleksiyon Adı/i).fill('Not Testi');
    await page.getByRole('button', { name: /^Oluştur$/i }).click();

    await page.getByRole('button', { name: /Arşivden Kayıt Ekle|Arşivden Ekle/i }).first().click();
    await page.getByRole('button', { name: '+ Ekle' }).first().click();
    await page.getByRole('button', { name: 'Modalı kapat' }).click();

    // Not ekle
    await page.getByRole('button', { name: /Not Ekle/i }).first().click();
    await page.getByPlaceholder(/kişisel araştırma notlarınız/i).fill('E2E Test Notu: 1919 Samsun');
    await page.getByRole('button', { name: 'Kaydet' }).click();

    await expect(page.getByText('E2E Test Notu: 1919 Samsun')).toBeVisible();

  });

  test('JSON dışa aktarma düğmesi etkindir', async ({ page }) => {
    await page.goto('/okuma-listem');
    const exportBtn = page.getByRole('button', { name: /JSON Dışa Aktar/i });
    await expect(exportBtn).toBeVisible();
  });

  test('kaldırılmış kayıt için güvenli uyarı görüntülenir', async ({ page }) => {
    // LocalStorage'a yapay bir eksik kayıt yerleştir
    await page.goto('/okuma-listem');
    await page.evaluate(() => {
      const state = {
        version: 1,
        collections: [
          {
            id: 'col-missing-test',
            name: 'Eksik Kayıt Koleksiyonu',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: [
              {
                recordId: 'non-existent-rec-xyz',
                addedAt: new Date().toISOString(),
                readLater: false,
                snapshot: {
                  title: 'Yayından Kaldırılmış Belge Snapshotı',
                  date: '1920-04-23',
                  institution: 'Eski Kurum',
                  type: 'document',
                },
              },
            ],
          },
        ],
      };
      localStorage.setItem('asrin-kemali:reading-lists:v1', JSON.stringify(state));
    });

    await page.reload();
    await expect(page.getByText('Yayından Kaldırılmış Belge Snapshotı')).toBeVisible();
    await expect(page.getByText(/Bu kayıt yayından kaldırılmış veya arşivde bulunamıyor/i)).toBeVisible();
  });

  test('sıfır yatay taşma (scrollWidth <= innerWidth + 1) ve ekran görüntüsü alımı', async ({ page }, testInfo) => {
    // Sayfayı doldur
    await page.goto('/okuma-listem');
    await page.evaluate(() => {
      const state = {
        version: 1,
        collections: [
          {
            id: 'col-showcase',
            name: 'Atatürk & Cumhuriyet Mirası',
            description: 'Kişisel tarih ve araştırma koleksiyonu',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: [
              {
                recordId: '1924-anayasasi',
                addedAt: new Date().toISOString(),
                readLater: true,
                note: 'Teşkilat-ı Esasiye Kanunu kabul metni.',
                snapshot: {
                  title: '1924 Anayasası',
                  slug: '1924-anayasasi',
                  date: '20 Nisan 1924',
                  institution: 'TBMM',
                  type: 'document',
                  url: '/arsiv/1924-anayasasi',
                },
              },
              {
                recordId: 'cumhuriyetin-ilani-1923',
                addedAt: new Date().toISOString(),
                readLater: false,
                snapshot: {
                  title: 'Cumhuriyetin İlanı',
                  slug: 'cumhuriyetin-ilani-1923',
                  date: '29 Ekim 1923',
                  institution: 'TBMM',
                  type: 'event',
                  url: '/arsiv/cumhuriyetin-ilani-1923',
                },
              },
            ],
          },
        ],
      };
      localStorage.setItem('asrin-kemali:reading-lists:v1', JSON.stringify(state));
    });

    await page.reload();
    await expect(page.getByText('1924 Anayasası')).toBeVisible();

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflows, `Yatay taşma tespit edildi: ${testInfo.project.name}`).toBe(false);

    const screenshotDir = path.resolve(process.cwd(), '../docs/screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    await page.screenshot({
      path: path.join(screenshotDir, `v08-reading-lists-${testInfo.project.name}.png`),
      fullPage: true,
    });
    await page.screenshot({
      path: testInfo.outputPath(`reading-lists-${testInfo.project.name}.png`),
      fullPage: true,
    });
  });
});
