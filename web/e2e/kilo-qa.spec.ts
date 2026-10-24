import { expect, test, type Page } from '@playwright/test';

async function expectNoOverflow(page: Page) {
  const d = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth }));
  expect(d.scrollWidth).toBeLessThanOrEqual(d.viewportWidth + 3);
}

test.describe('Kilo QA Responsive', () => {
  const vps = [[320,568],[360,800],[375,812],[390,844],[414,896],[430,932],[768,1024],[1024,768],[1440,900],[1536,1024]];
  for (const [w,h] of vps) {
    test('yatay tasma ' + w + 'x' + h, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 768 ? 2 : 1 });
      const page = await ctx.newPage();
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      await expectNoOverflow(page);
      await ctx.close();
    });
  }
});

