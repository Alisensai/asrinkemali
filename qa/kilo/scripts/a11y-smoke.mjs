import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resultsDir = path.join(__dirname, '../results');
fs.mkdirSync(resultsDir, { recursive: true });

const args = process.argv.slice(2);
const getArg = (key) => {
  const item = args.find(a => a.startsWith('--' + key + '='));
  return item ? item.split('=')[1] : null;
};
const target = getArg('target') || 'static';
const baseUrl = getArg('baseUrl') || (target === 'next' ? 'http://localhost:4173' : 'http://localhost:3000');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  
  const report = {
    timestamp: new Date().toISOString(),
    target,
    baseUrl,
    tests: []
  };
  
  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
    
    // Skip link
    try {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.className || document.activeElement?.textContent);
      report.tests.push({ name: 'skip-link-focus', status: focused?.includes('İçeriğe') || focused?.includes('icerik') || focused?.toLowerCase().includes('skip') ? 'PASS' : 'CHECK', details: focused });
    } catch(e) { report.tests.push({ name: 'skip-link-focus', status: 'ERROR', details: e.message }); }
    
    // Heading order
    try {
      const headings = await page.evaluate(() => 
        Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => ({ level: parseInt(h.tagName[1]), text: h.textContent?.trim().substring(0,40) }))
      );
      let prev = 0, orderOk = true;
      for (const h of headings) { if (h.level > prev + 1) orderOk = false; prev = h.level; }
      report.tests.push({ name: 'heading-order', status: orderOk ? 'PASS' : 'WARN', details: headings.slice(0,10) });
    } catch(e) { report.tests.push({ name: 'heading-order', status: 'ERROR', details: e.message }); }
    
    // Images alt
    try {
      const imgs = await page.evaluate(() => 
        Array.from(document.querySelectorAll('img')).map(img => ({ src: img.src.split('/').pop(), alt: img.alt, hasAlt: 'alt' in img }))
      );
      const missing = imgs.filter(i => !i.alt && !i.alt === '');
      report.tests.push({ name: 'img-alt', status: imgs.every(i => i.hasAlt) ? 'PASS' : 'WARN', details: imgs.slice(0,15) });
    } catch(e) { report.tests.push({ name: 'img-alt', status: 'ERROR', details: e.message }); }
    
    // Menu aria-expanded
    try {
      const menuBtn = page.locator('#mobile-menu-toggle, button[aria-controls*=\"menu\"], button[aria-controls*=\"nav\"]').first();
      if (await menuBtn.count() > 0) {
        const expanded = await menuBtn.getAttribute('aria-expanded');
        report.tests.push({ name: 'menu-aria-expanded', status: expanded !== null ? 'PASS' : 'WARN', details: { ariaExpanded: expanded } });
      } else {
        report.tests.push({ name: 'menu-aria-expanded', status: 'SKIP', details: 'no mobile menu button found' });
      }
    } catch(e) { report.tests.push({ name: 'menu-aria-expanded', status: 'ERROR', details: e.message }); }
    
    // axe-core
    try {
      const results = await new AxeBuilder({ page }).analyze();
      report.tests.push({ 
        name: 'axe-core', 
        status: results.violations.length === 0 ? 'PASS' : (results.violations.length < 5 ? 'WARN' : 'FAIL'),
        violations: results.violations.length,
        details: results.violations.slice(0,10).map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.length }))
      });
    } catch(e) { report.tests.push({ name: 'axe-core', status: 'ERROR', details: e.message }); }
    
    await page.screenshot({ path: path.join(resultsDir, 11y--desktop.png), fullPage: true });
  } catch(e) {
    report.error = e.message;
  }
  
  await browser.close();
  const reportPath = path.join(resultsDir, 11y-report--.json);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('A11y raporu: ' + reportPath);
  console.log(JSON.stringify(report.tests, null, 2));
}

run().catch(console.error);
