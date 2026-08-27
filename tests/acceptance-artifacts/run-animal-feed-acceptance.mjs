import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const BASE_URL = 'http://localhost:8998/index.html';
const OUT_DIR = '/home/user/freightime-preview/tests/acceptance-artifacts';
mkdirSync(OUT_DIR, { recursive: true });
const COMMIT_SHA = execSync('git rev-parse HEAD', { cwd: '/home/user/freightime-preview' }).toString().trim();

const VIEWPORTS = [
  { name: 'mobile-375', width: 375, height: 800 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

const VET_NOTE = 'נדרש לבדוק אישור של השירותים הווטרינריים במשרד החקלאות';

const SCENARIOS = [
  { n: 1, name: 'Explicit animal-feed selection, neutral text', family: ['animal_feed'], pname: 'מוצר לבדיקה', desc: 'מוצר לבדיקה', expectFamily: 'מזון לבעלי חיים', expectVet: true },
  { n: 2, name: 'מזון לבעלי חיים', family: [], pname: 'מזון לבעלי חיים', desc: 'מזון לבעלי חיים', expectFamily: 'מזון לבעלי חיים', expectVet: true },
  { n: 3, name: 'מזון לכלבים', family: [], pname: 'מזון לכלבים', desc: 'מזון לכלבים', expectFamily: 'מזון לבעלי חיים', expectVet: true },
  { n: 4, name: 'מזון לחתולים', family: [], pname: 'מזון לחתולים', desc: 'מזון לחתולים', expectFamily: 'מזון לבעלי חיים', expectVet: true },
  { n: 5, name: 'מזון לדגים', family: [], pname: 'מזון לדגים', desc: 'מזון לדגים', expectFamily: 'מזון לבעלי חיים', expectVet: true },
  { n: 6, name: 'מזון לציפורים', family: [], pname: 'מזון לציפורים', desc: 'מזון לציפורים', expectFamily: 'מזון לבעלי חיים', expectVet: true },
  { n: 7, name: 'מזון לחיות משק', family: [], pname: 'מזון לחיות משק', desc: 'מזון לחיות משק', expectFamily: 'מזון לבעלי חיים', expectVet: true },
  { n: 8, name: 'animal feed', family: [], pname: 'animal feed', desc: 'animal feed', expectFamily: 'מזון לבעלי חיים', expectVet: true },
  { n: 9, name: 'dog food', family: [], pname: 'dog food', desc: 'dog food', expectFamily: 'מזון לבעלי חיים', expectVet: true },
  { n: 10, name: 'cat food', family: [], pname: 'cat food', desc: 'cat food', expectFamily: 'מזון לבעלי חיים', expectVet: true },
  { n: 11, name: 'pet food', family: [], pname: 'pet food', desc: 'pet food', expectFamily: 'מזון לבעלי חיים', expectVet: true },
  { n: 12, name: 'Explicit "בעלי חיים" selection', family: ['live_animals'], pname: 'מוצר לבדיקה', desc: 'מוצר לבדיקה', expectFamily: 'בעלי חיים', expectVet: true },
  { n: 13, name: 'בעל חיים חי', family: [], pname: 'בעל חיים חי', desc: 'בעל חיים חי', expectFamily: 'בעלי חיים', expectVet: true },
  { n: 14, name: 'Existing "מוצרים מן החי" selection', family: ['animal_origin_products'], pname: 'מוצר שמקורו מן החי', desc: 'מוצר שמקורו מן החי', expectFamily: 'מזון מן החי', expectVet: true },
  { n: 15, name: 'ביצים', family: [], pname: 'ביצים', desc: 'ביצים', expectFamily: 'מזון מן החי', expectVet: true },
  { n: 16, name: 'שיירים מן החי', family: [], pname: 'שיירים מן החי', desc: 'שיירים מן החי', expectFamily: null, expectNotFamily: 'מזון לבעלי חיים' },
  { n: 17, name: 'ויטמינים לבעלי חיים', family: [], pname: 'ויטמינים לבעלי חיים', desc: 'ויטמינים לבעלי חיים', expectFamily: 'ויטמינים לבעלי חיים', expectVet: true },
  { n: 18, name: 'pet toy', family: [], pname: 'pet toy', desc: 'pet toy', expectFamily: null, expectNotFamily: 'מזון לבעלי חיים' },
  { n: 19, name: 'dog leash', family: [], pname: 'dog leash', desc: 'dog leash', expectFamily: null, expectNotFamily: 'מזון לבעלי חיים' },
  { n: 20, name: 'pet bed', family: [], pname: 'pet bed', desc: 'pet bed', expectFamily: null, expectNotFamily: 'מזון לבעלי חיים' },
  { n: 21, name: 'pet bowl', family: [], pname: 'pet bowl', desc: 'pet bowl', expectFamily: null, expectNotFamily: 'מזון לבעלי חיים' },
  { n: 22, name: 'aquarium accessory', family: [], pname: 'aquarium accessory', desc: 'aquarium accessory', expectFamily: null, expectNotFamily: 'מזון לבעלי חיים' },
  { n: 23, name: 'Two selected families resolved to animal feed', family: ['animal_feed', 'live_animals'], pname: 'dog food', desc: 'dog food', expectFamily: 'מזון לבעלי חיים', expectVet: true },
  { n: 24, name: 'Two selected families unresolved', family: ['animal_feed', 'live_animals'], pname: 'מוצר לבדיקה', desc: 'מוצר לבדיקה', expectUnresolved: true },
  { n: 25, name: 'Edit Answers removing animal feed', family: ['animal_feed'], pname: 'מוצר סתמי', desc: 'תיאור כללי', editRemove: true },
  { n: 26, name: 'New Assessment after animal-feed result', family: ['animal_feed'], pname: 'מוצר לבדיקה', desc: 'מזון לבעלי חיים', newAssessment: true },
  { n: 27, name: 'Reset after animal-feed selection', family: ['animal_feed'], pname: 'מוצר לבדיקה', desc: 'מזון לבעלי חיים', resetAfter: true },
];

async function runScenario(page, scenario, viewport) {
  const record = { scenario: scenario.n, name: scenario.name, viewport: viewport.name, pass: true, errors: [] };
  const consoleErrors = [];
  const pageErrors = [];
  const networkHosts = new Set();
  const onConsole = (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); };
  const onPageError = (err) => pageErrors.push(String(err));
  const onRequest = (req) => { try { networkHosts.add(new URL(req.url()).host); } catch { /* ignore */ } };
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('request', onRequest);

  try {
    await page.goto(BASE_URL, { timeout: 20000, waitUntil: 'load' });
    record.initialUrl = page.url();
    await page.click('#readinessStartButton', { timeout: 10000 });
    await page.click('input[name="irImportType"][value="personal"]', { timeout: 10000 });
    await page.click('#readinessNextButton', { timeout: 10000 });
    await page.click('input[name="irExperience"][value="first_time"]', { timeout: 10000 });
    await page.click('#readinessNextButton', { timeout: 10000 });
    await page.fill('#irProductName', scenario.pname || '', { timeout: 10000 });
    await page.fill('#irCommercialDescription', scenario.desc || '', { timeout: 10000 });
    await page.click('#readinessNextButton', { timeout: 10000 });

    for (const value of scenario.family || []) {
      await page.check(`input[name="irProductFamily"][value="${value}"]`, { timeout: 10000 });
    }
    for (const value of scenario.family || []) {
      record[`checked_${value}`] = await page.locator(`input[name="irProductFamily"][value="${value}"]`).isChecked();
    }

    for (let i = 0; i < 8; i++) {
      const resultVisible = await page.locator('#readinessResult').isVisible().catch(() => false);
      if (resultVisible) break;
      const radios = page.locator('#irRegulatoryQuestionHost input[type="radio"]');
      const count = await radios.count().catch(() => 0);
      if (count > 0) {
        const noOption = page.locator('#irRegulatoryQuestionHost input[type="radio"][value="no"]').first();
        if (await noOption.count() > 0) await noOption.check({ timeout: 5000 }).catch(() => {});
      }
      const nextBtn = page.locator('#readinessNextButton');
      if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextBtn.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(120);
      } else break;
    }

    let resultVisible = await page.locator('#readinessResult').isVisible({ timeout: 5000 }).catch(() => false);
    let resultText = resultVisible ? await page.locator('#readinessResult').innerText().catch(() => '') : '';
    record.resultText = resultText.slice(0, 400);

    if (scenario.editRemove) {
      await page.locator('button:has-text("עריכת תשובות")').click({ timeout: 10000 });
      await page.waitForTimeout(200);
      const box = page.locator('input[name="irProductFamily"][value="animal_feed"]');
      if (await box.isVisible({ timeout: 3000 }).catch(() => false)) await box.uncheck({ timeout: 5000 }).catch(() => {});
      for (let i = 0; i < 8; i++) {
        const rv = await page.locator('#readinessResult').isVisible().catch(() => false);
        if (rv) break;
        const nextBtn = page.locator('#readinessNextButton');
        if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) { await nextBtn.click().catch(() => {}); await page.waitForTimeout(120); } else break;
      }
      resultVisible = await page.locator('#readinessResult').isVisible({ timeout: 5000 }).catch(() => false);
      resultText = resultVisible ? await page.locator('#readinessResult').innerText().catch(() => '') : '';
      record.resultText = resultText.slice(0, 400);
      record.noStale = !resultText.includes('מזון לבעלי חיים');
    }

    if (scenario.newAssessment) {
      await page.locator('button:has-text("בדיקה חדשה")').click({ timeout: 10000 });
      await page.waitForTimeout(200);
      record.newAssessmentReturnedToStart = await page.locator('#readinessStartButton').isVisible({ timeout: 5000 }).catch(() => false);
    }

    if (scenario.resetAfter) {
      await page.locator('button:has-text("עריכת תשובות")').click({ timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(150);
      const resetBtn = page.locator('#readinessResetButton');
      if (await resetBtn.isVisible({ timeout: 3000 }).catch(() => false)) await resetBtn.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(200);
      record.resetReturnedToStart = await page.locator('#readinessStartButton').isVisible({ timeout: 5000 }).catch(() => false);
    }

    const assertions = {};
    if (scenario.expectFamily) assertions.family = resultText.includes(`משפחת המוצר שזוהתה: ${scenario.expectFamily}`);
    if (scenario.expectNotFamily) assertions.notFamily = !resultText.includes(`משפחת המוצר שזוהתה: ${scenario.expectNotFamily}`);
    if (scenario.expectVet) assertions.vet = resultText.includes(VET_NOTE);
    if (scenario.expectUnresolved) assertions.unresolved = resultText.includes('משפחת המוצר שנבחרה כוללת כמה אפשרויות') || resultText.includes('ניתן להתקדם באיסוף מידע');
    if (scenario.editRemove) assertions.noStale = record.noStale;
    if (scenario.newAssessment) assertions.newAssessment = record.newAssessmentReturnedToStart;
    if (scenario.resetAfter) assertions.reset = record.resetReturnedToStart;
    record.assertions = assertions;

    const ctaCount = await page.locator('#readinessResult a.btn, #readinessResult button.btn-primary, .ir-professional-cta, .ir-primary-action a').count().catch(() => null);
    record.ctaCount = ctaCount;
    record.overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2).catch(() => null);
    record.localStorage = await page.evaluate(() => { try { return Object.keys(window.localStorage).length; } catch { return -1; } }).catch(() => null);
    record.sessionStorage = await page.evaluate(() => { try { return Object.keys(window.sessionStorage).length; } catch { return -1; } }).catch(() => null);
    record.finalUrl = page.url();
    record.consoleErrors = consoleErrors;
    record.pageErrors = pageErrors;
    record.networkHosts = [...networkHosts];

    const values = Object.values(assertions);
    record.pass = (values.length === 0 || values.every(Boolean)) && !record.overflow;
  } catch (err) {
    record.pass = false;
    record.errors.push(String(err && err.message ? err.message.split('\n')[0] : err));
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('request', onRequest);
  }
  return record;
}

async function main() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const results = [];
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    page.on('dialog', (d) => d.accept());
    for (const scenario of SCENARIOS) {
      const record = await runScenario(page, scenario, viewport);
      results.push(record);
      console.log(`${record.pass ? 'PASS' : 'FAIL'} [${viewport.name}] #${scenario.n} ${scenario.name}${record.errors.length ? ' -- ' + record.errors.join('; ') : ''}`);
    }
    await page.close();
  }
  await browser.close();

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = total - passed;
  writeFileSync(`${OUT_DIR}/animal-feed-acceptance-results.json`, JSON.stringify({
    generatedAt: new Date().toISOString(), commitSha: COMMIT_SHA, total, passed, failed, results,
  }, null, 2));
  const failLines = results.filter((r) => !r.pass).map((r) => `- #${r.scenario} ${r.name} [${r.viewport}]: ${r.errors.join('; ') || JSON.stringify(r.assertions)}`);
  const md = [
    '# Animal-Feed Family Browser Acceptance Summary', '', `Commit: ${COMMIT_SHA}`, '',
    `Total: ${total}, Passed: ${passed}, Failed: ${failed}`, '',
    failed > 0 ? '## Failures\n\n' + failLines.join('\n') : '## All scenarios passed',
  ].join('\n');
  writeFileSync(`${OUT_DIR}/animal-feed-acceptance-summary.md`, md);

  console.log('');
  console.log(`TOTAL=${total} PASSED=${passed} FAILED=${failed}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
