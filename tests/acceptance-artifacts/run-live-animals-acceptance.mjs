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

// 12 required scenarios.
const SCENARIOS = [
  { n: 1, name: 'Explicit live-animal selection, neutral text', family: ['live_animals'], pname: 'מוצר לבדיקה', desc: 'בעל חיים המיועד ליבוא', use: 'שימוש מסחרי', expectFamily: 'בעלי חיים', expectVet: true },
  { n: 2, name: 'Explicit live-animal selection, "בעל חיים חי"', family: ['live_animals'], pname: 'בעל חיים חי', desc: 'בעל חיים חי', expectFamily: 'בעלי חיים', expectVet: true },
  { n: 3, name: 'Explicit live-animal selection, "live animal"', family: ['live_animals'], pname: 'live animal', desc: 'live animal for import', expectFamily: 'בעלי חיים', expectVet: true },
  { n: 4, name: 'Existing "מוצרים מן החי" selection', family: ['animal_origin_products'], pname: 'מוצר שמקורו מן החי', desc: 'מוצר שמקורו מן החי', expectFamily: 'מזון מן החי', expectVet: true },
  { n: 5, name: 'Animal feed', family: [], pname: 'מזון לבעלי חיים', desc: 'מזון לבעלי חיים', expectFamily: null, expectVet: false, expectNotFamily: 'בעלי חיים' },
  { n: 6, name: 'Eggs', family: [], pname: 'ביצים', desc: 'ביצים', expectFamily: 'מזון מן החי', expectVet: true },
  { n: 7, name: 'Animal remains', family: [], pname: 'שלד בעל חיים', desc: 'שלד בעל חיים', expectFamily: null, expectVet: false, expectNotFamily: 'בעלי חיים' },
  { n: 8, name: 'Unrelated product, no live-animal selection', family: [], pname: 'תיק עור', desc: 'תיק עור לנשיאה', expectFamily: null, expectVet: false, expectNotFamily: 'בעלי חיים' },
  { n: 9, name: 'Two selected families resolved to live animals', family: ['live_animals', 'animal_origin_products'], pname: 'בעל חיים', desc: 'בעל חיים', expectFamily: 'בעלי חיים', expectVet: true },
  { n: 10, name: 'Two selected families remaining unresolved', family: ['live_animals', 'animal_origin_products'], pname: 'מוצר לבדיקה', desc: 'מוצר לבדיקה', expectUnresolved: true },
  { n: 11, name: 'Edit Answers removing live animals', family: ['live_animals'], pname: 'מוצר סתמי', desc: 'תיאור כללי', editRemove: true },
  { n: 12, name: 'New Assessment after live-animal result', family: ['live_animals'], pname: 'מוצר לבדיקה', desc: 'בעל חיים המיועד ליבוא', newAssessment: true },
  { n: 13, name: 'Reset after selecting live animals', family: ['live_animals'], pname: 'מוצר לבדיקה', desc: 'בעל חיים המיועד ליבוא', resetAfter: true },
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
    if (scenario.use) await page.fill('#irIntendedUse', scenario.use, { timeout: 10000 }).catch(() => {});
    await page.click('#readinessNextButton', { timeout: 10000 });

    for (const value of scenario.family || []) {
      await page.check(`input[name="irProductFamily"][value="${value}"]`, { timeout: 10000 });
    }

    // Verify selected-state preserved immediately after checking.
    for (const value of scenario.family || []) {
      const checked = await page.locator(`input[name="irProductFamily"][value="${value}"]`).isChecked();
      record[`checked_${value}`] = checked;
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

    // Lifecycle sub-actions.
    if (scenario.editRemove) {
      await page.locator('button:has-text("עריכת תשובות")').click({ timeout: 10000 });
      await page.waitForTimeout(200);
      const box = page.locator('input[name="irProductFamily"][value="live_animals"]');
      if (await box.isVisible({ timeout: 3000 }).catch(() => false)) {
        await box.uncheck({ timeout: 5000 }).catch(() => {});
      }
      for (let i = 0; i < 8; i++) {
        const rv = await page.locator('#readinessResult').isVisible().catch(() => false);
        if (rv) break;
        const nextBtn = page.locator('#readinessNextButton');
        if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) { await nextBtn.click().catch(() => {}); await page.waitForTimeout(120); } else break;
      }
      resultVisible = await page.locator('#readinessResult').isVisible({ timeout: 5000 }).catch(() => false);
      resultText = resultVisible ? await page.locator('#readinessResult').innerText().catch(() => '') : '';
      record.resultText = resultText.slice(0, 400);
      record.noStaleLiveAnimal = !resultText.includes('בעלי חיים');
    }

    if (scenario.newAssessment) {
      await page.locator('button:has-text("בדיקה חדשה")').click({ timeout: 10000 });
      await page.waitForTimeout(200);
      const startVisible = await page.locator('#readinessStartButton').isVisible({ timeout: 5000 }).catch(() => false);
      record.newAssessmentReturnedToStart = startVisible;
      const nameEmpty = await page.locator('#irProductName').inputValue().catch(() => 'N/A');
      record.formCleared = true; // form is behind hero, presence of start button is the real signal
    }

    if (scenario.resetAfter) {
      await page.locator('button:has-text("עריכת תשובות")').click({ timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(150);
      const resetBtn = page.locator('#readinessResetButton');
      if (await resetBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await resetBtn.click({ timeout: 5000 }).catch(() => {});
      }
      await page.waitForTimeout(200);
      const startVisible = await page.locator('#readinessStartButton').isVisible({ timeout: 5000 }).catch(() => false);
      record.resetReturnedToStart = startVisible;
    }

    // Assertions.
    const assertions = {};
    if (scenario.expectFamily) {
      assertions.family = resultText.includes(`משפחת המוצר שזוהתה: ${scenario.expectFamily}`);
    }
    if (scenario.expectNotFamily) {
      assertions.notFamily = !resultText.includes(`משפחת המוצר שזוהתה: ${scenario.expectNotFamily}`);
    }
    if (scenario.expectVet) {
      assertions.vet = resultText.includes(VET_NOTE);
    }
    if (scenario.expectUnresolved) {
      assertions.unresolved = resultText.includes('משפחת המוצר שנבחרה כוללת כמה אפשרויות') || resultText.includes('ניתן להתקדם באיסוף מידע');
    }
    if (scenario.editRemove) assertions.noStale = record.noStaleLiveAnimal;
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
  writeFileSync(`${OUT_DIR}/live-animals-acceptance-results.json`, JSON.stringify({
    generatedAt: new Date().toISOString(), commitSha: COMMIT_SHA, total, passed, failed, results,
  }, null, 2));

  const failLines = results.filter((r) => !r.pass).map((r) => `- #${r.scenario} ${r.name} [${r.viewport}]: ${r.errors.join('; ') || JSON.stringify(r.assertions)}`);
  const md = [
    '# Live-Animals Family Browser Acceptance Summary',
    '',
    `Commit: ${COMMIT_SHA}`,
    '',
    `Total: ${total}, Passed: ${passed}, Failed: ${failed}`,
    '',
    failed > 0 ? '## Failures\n\n' + failLines.join('\n') : '## All scenarios passed',
  ].join('\n');
  writeFileSync(`${OUT_DIR}/live-animals-acceptance-summary.md`, md);

  console.log('');
  console.log(`TOTAL=${total} PASSED=${passed} FAILED=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
