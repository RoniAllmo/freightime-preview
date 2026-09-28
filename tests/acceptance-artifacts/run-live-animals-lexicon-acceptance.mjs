import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const BASE_URL = 'http://localhost:8998/index.html';
const OUT_DIR = '/home/user/freightime-preview/tests/acceptance-artifacts';
mkdirSync(OUT_DIR, { recursive: true });
const COMMIT_SHA = execSync('git rev-parse HEAD', { cwd: '/home/user/freightime-preview' }).toString().trim();

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'mobile-390x844', width: 390, height: 844 },
];

const VET_NOTE = 'נדרש כיוון לבדיקת רישיון, היתר או אישור וטרינרי';

// Mandatory browser scenarios (workflow FT-ONE-PULSE-LIVE-ANIMALS-LEXICON-COMPLETENESS-V1, step 16).
const LIVE_TEXTS = [
  'כבש חי', 'כבשה חיה', 'טלה חי', 'עז חיה', 'סוסה חיה', 'עגל חי',
  'ארנב חי', 'אוגר חי', 'יונה חיה', 'שליו חי', 'איגואנה חיה',
  'קרפדה חיה', 'חיפושית חיה', 'צדפה חיה',
  'live lamb', 'live rabbit', 'live quail', 'live iguana', 'live oyster',
];
const COLLISION_TEXTS = [
  'מזון לכבשים', 'צמר כבשים', 'בשר כבש', 'sheep feed', 'lamb meat', 'rabbit cage', 'fish food',
];

const SCENARIOS = [
  ...LIVE_TEXTS.map((t, i) => ({ n: `L${i + 1}`, name: `live text: ${t}`, pname: t, desc: t, expectFamily: 'בעלי חיים', expectVet: true })),
  ...COLLISION_TEXTS.map((t, i) => ({ n: `C${i + 1}`, name: `collision: ${t}`, pname: t, desc: t, expectFamily: null, expectVet: false, expectNotFamily: 'בעלי חיים' })),
];

async function runScenario(page, scenario) {
  const record = { scenario: scenario.n, name: scenario.name, pass: true, errors: [] };
  const consoleErrors = [];
  const pageErrors = [];
  const onConsole = (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); };
  const onPageError = (err) => pageErrors.push(String(err));
  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  try {
    await page.goto(BASE_URL, { timeout: 20000, waitUntil: 'load' });
    await page.click('#readinessStartButton', { timeout: 10000 });
    await page.click('input[name="irImportType"][value="commercial"]', { timeout: 10000 });
    await page.click('#readinessNextButton', { timeout: 10000 });
    await page.click('input[name="irExperience"][value="first_time"]', { timeout: 10000 });
    await page.click('#readinessNextButton', { timeout: 10000 });
    await page.fill('#irProductName', scenario.pname || '', { timeout: 10000 });
    await page.fill('#irCommercialDescription', scenario.desc || '', { timeout: 10000 });
    await page.click('#readinessNextButton', { timeout: 10000 });

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
        await page.waitForTimeout(100);
      } else break;
    }

    const resultVisible = await page.locator('#readinessResult').isVisible({ timeout: 5000 }).catch(() => false);
    const resultText = resultVisible ? await page.locator('#readinessResult').innerText().catch(() => '') : '';
    record.resultText = resultText.slice(0, 300);

    const assertions = {};
    if (scenario.expectFamily) {
      assertions.family = resultText.includes(`משפחת המוצר שזוהתה: ${scenario.expectFamily}`);
      assertions.oneResult = (resultText.match(/משפחת המוצר שזוהתה:/g) || []).length === 1;
    }
    if (scenario.expectNotFamily) {
      assertions.notFamily = !resultText.includes(`משפחת המוצר שזוהתה: ${scenario.expectNotFamily}`);
    }
    if (scenario.expectVet) {
      assertions.vet = resultText.includes(VET_NOTE);
      assertions.oneVetNote = (resultText.match(new RegExp(VET_NOTE, 'g')) || []).length === 1;
    }

    const ctaCount = await page.locator('#readinessResult a.btn, #readinessResult button.btn-primary, .ir-professional-cta, .ir-primary-action a').count().catch(() => null);
    record.ctaCount = ctaCount;
    if (scenario.expectVet) assertions.oneCta = ctaCount === 1;

    record.overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2).catch(() => null);
    record.consoleErrors = consoleErrors;
    record.pageErrors = pageErrors;
    record.assertions = assertions;

    const values = Object.values(assertions);
    record.pass = (values.length === 0 || values.every(Boolean)) && !record.overflow && pageErrors.length === 0;
  } catch (err) {
    record.pass = false;
    record.errors.push(String(err && err.message ? err.message.split('\n')[0] : err));
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
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
      const record = await runScenario(page, scenario);
      record.viewport = viewport.name;
      results.push(record);
      console.log(`${record.pass ? 'PASS' : 'FAIL'} [${viewport.name}] ${scenario.n} ${scenario.name}${record.errors.length ? ' -- ' + record.errors.join('; ') : ''}`);
    }
    await page.close();
  }
  await browser.close();

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = total - passed;
  writeFileSync(`${OUT_DIR}/live-animals-lexicon-acceptance-results.json`, JSON.stringify({
    generatedAt: new Date().toISOString(), commitSha: COMMIT_SHA, total, passed, failed, results,
  }, null, 2));

  const failLines = results.filter((r) => !r.pass).map((r) => `- ${r.scenario} ${r.name} [${r.viewport}]: ${r.errors.join('; ') || JSON.stringify(r.assertions)}`);
  const md = [
    '# Live-Animals Lexicon Completeness Browser Acceptance Summary',
    '',
    `Commit: ${COMMIT_SHA}`,
    '',
    `Total: ${total}, Passed: ${passed}, Failed: ${failed}`,
    '',
    failed > 0 ? '## Failures\n\n' + failLines.join('\n') : '## All scenarios passed',
  ].join('\n');
  writeFileSync(`${OUT_DIR}/live-animals-lexicon-acceptance-summary.md`, md);

  console.log('');
  console.log(`TOTAL=${total} PASSED=${passed} FAILED=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
