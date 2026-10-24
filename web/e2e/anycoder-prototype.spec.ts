import { test, expect } from '@playwright/test';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const screenshotsDir = resolve(__dirname, '..', '..', 'docs', 'screenshots');

test.describe('Task 25: AnyCoder Sergi Prototipi Denetim Arayüzü E2E & Responsive', () => {
  test('Sayfa yüklenir, başlıklar görünür ve sıfır yatay taşma (scrollWidth <= innerWidth + 1) kanıtlanır', async ({ page }, testInfo) => {
    await page.goto('/deneysel/anycoder-audit');
    await page.waitForLoadState('domcontentloaded');

    // 1. Ana kapsayıcı ve başlık denetimi
    const heading = page.getByRole('heading', { name: 'AnyCoder Sergi Prototipi Denetim Merkezi', exact: true });
    await expect(heading).toBeVisible();

    // 2. SOURCE_MISSING rozeti görünür
    const statusBadge = page.locator('div[role="status"]').filter({ hasText: 'DURUM: SOURCE_MISSING' });
    await expect(statusBadge).toBeVisible();

    // 3. Sıfır yatay taşma denetimi (T-25-061 ... T-25-095)
    const overflowMetrics = await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      const innerWidth = window.innerWidth;
      const bodyScrollWidth = document.body.scrollWidth;
      return {
        scrollWidth,
        innerWidth,
        bodyScrollWidth,
        hasHorizontalOverflow: scrollWidth > innerWidth + 1 || bodyScrollWidth > innerWidth + 1,
      };
    });

    expect(overflowMetrics.hasHorizontalOverflow).toBe(false);

    // 4. Filtreleme etkileşimi ve klavye erişilebilirliği (Tab & Click)
    const rejectFilterBtn = page.getByRole('button', { name: 'Reddedilen (3)', exact: true });
    await expect(rejectFilterBtn).toBeVisible();
    await rejectFilterBtn.click();
    await expect(rejectFilterBtn).toHaveAttribute('aria-pressed', 'true');

    // Reddedilen filtre altında 3 kart olmalı
    const cards = page.locator('article[role="listitem"]');
    await expect(cards).toHaveCount(3);

    // Tekrar tümüne dön
    const allFilterBtn = page.getByRole('button', { name: 'Tümü (8)', exact: true });
    await allFilterBtn.click();
    await expect(allFilterBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(cards).toHaveCount(8);

    // 5. Ekran görüntüsü yakalama
    const screenshotPath = resolve(screenshotsDir, `v08-anycoder-${testInfo.project.name.toLowerCase()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
  });

  test('Klavye odağı ve odak halkaları (focus ring) çalışır', async ({ page }) => {
    await page.goto('/deneysel/anycoder-audit');
    await page.waitForLoadState('domcontentloaded');

    // İlk interaktif filtre butonuna odaklan
    const allBtn = page.getByRole('button', { name: 'Tümü (8)', exact: true });
    await allBtn.focus();
    await expect(allBtn).toBeFocused();

    // Tab ile bir sonrakine geç
    await page.keyboard.press('Tab');
    const missingBtn = page.getByRole('button', { name: 'Eksik Kaynak (1)', exact: true });
    await expect(missingBtn).toBeFocused();

    // Space ile aktif et
    await page.keyboard.press('Space');
    await expect(missingBtn).toHaveAttribute('aria-pressed', 'true');

    // Kart sayısı 1 olmalı
    const cards = page.locator('article[role="listitem"]');
    await expect(cards).toHaveCount(1);
  });
});
