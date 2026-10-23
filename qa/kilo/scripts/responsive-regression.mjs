import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resultsDir = path.join(__dirname, '../results');
fs.mkdirSync(resultsDir, { recursive: true });

const viewports = [
  { name: '320x568', width: 320, height: 568 },
  { name: '360x800', width: 360, height: 800 },
  { name: '375x812', width: 375, height: 812 },
  { name: '390x844', width: 390, height: 844 },
  { name: '414x896', width: 414, height: 896 },
  { name: '430x932', width: 430, height: 932 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1536x1024', width: 1536, height: 1024 },
];

const args = process.argv.slice(2);
const getArg = (key) => {
  const item = args.find(a => a.startsWith('--' + key + '='));
  return item ? item.split('=')[1] : null;
};
const target = getArg('target') || 'static';
const baseUrl = getArg('baseUrl') || (target === 'next' ? 'http://localhost:4173' : 'http://localhost:3000');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const report = {
    timestamp: new Date().toISOString(),
    target,
    baseUrl,
    viewports: viewports.length,
    results: []
  };

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.width < 768 ? 2 : 1,
    });
    const page = await context.newPage();
    
    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(2000);
      
      const metrics = await page.evaluate(() => {
        const scrollWidth = document.documentElement.scrollWidth;
        const clientWidth = document.documentElement.clientWidth;
        const hasHorizontalScroll = scrollWidth > clientWidth + 2;
        
        const overflowElements = [];
        document.querySelectorAll('*').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && (rect.right > window.innerWidth + 3 || rect.left < -3)) {
            const cls = typeof el.className === 'string' ? el.className : '';
            overflowElements.push({ tag: el.tagName, class: cls.substring(0, 40), id: el.id || '' });
          }
        });
        
        const smallTargets = [];
        document.querySelectorAll('button, a, [role=\"button\"], input, select, textarea').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
            const text = (el.textContent || '').trim().substring(0, 30);
            if (text) smallTargets.push({ tag: el.tagName, text, width: Math.round(rect.width), height: Math.round(rect.height) });
          }
        });
        
        const smallFonts = [];
        document.querySelectorAll('p, span, a, button, li, label').forEach(el => {
          const style = getComputedStyle(el);
          const fs = parseFloat(style.fontSize);
          if (fs < 12 && (el.textContent || '').trim()) {
            smallFonts.push({ tag: el.tagName, fontSize: Math.round(fs * 10)/10 });
          }
        });
        
        return {
          scrollWidth,
          clientWidth,
          hasHorizontalScroll,
          overflowElements: overflowElements.slice(0, 15),
          smallTargets: smallTargets.slice(0, 20),
          smallFonts: smallFonts.slice(0, 15)
        };
      });
      
      const screenshotPath = path.join(resultsDir, esponsive--.png);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      report.results.push({
        viewport: vp.name,
        status: metrics.hasHorizontalScroll ? 'FAIL' : 'OK',
        horizontalOverflow: metrics.hasHorizontalScroll,
        overflowCount: metrics.overflowElements.length,
        smallTargetsCount: metrics.smallTargets.length,
        smallFontsCount: metrics.smallFonts.length,
        screenshot: screenshotPath,
        details: metrics
      });
      
      console.log((metrics.hasHorizontalScroll ? '✗' : '✓') + ' ' + vp.name + ': HOverflow=' + metrics.hasHorizontalScroll + ', overflow=' + metrics.overflowElements.length + ', smallTargets=' + metrics.smallTargets.length);
    } catch (e) {
      report.results.push({ viewport: vp.name, status: 'ERROR', error: e.message });
      console.log('✗ ' + vp.name + ': ' + e.message);
    }
    
    await context.close();
  }
  
  await browser.close();
  const reportPath = path.join(resultsDir, esponsive-report--.json);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('\nRapor: ' + reportPath);
}

run().catch(console.error);
