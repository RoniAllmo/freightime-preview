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

// ---- Shared step helpers ---------------------------------------------

async function startFresh(page) {
  await page.goto(BASE_URL, { timeout: 20000, waitUntil: 'load' });
  await page.click('#readinessStartButton', { timeout: 10000 });
  await page.click('input[name="irImportType"][value="personal"]', { timeout: 10000 });
  await page.click('#readinessNextButton', { timeout: 10000 });
  await page.click('input[name="irExperience"][value="first_time"]', { timeout: 10000 });
  await page.click('#readinessNextButton', { timeout: 10000 });
}

async function fillQ3(page, name, desc) {
  await page.fill('#irProductName', name || '', { timeout: 10000 });
  await page.fill('#irCommercialDescription', desc || '', { timeout: 10000 });
  await page.click('#readinessNextButton', { timeout: 10000 });
}

async function setProductContext(page, { family, connectsToPower }) {
  if (family) {
    const box = page.locator(`input[name="irProductFamily"][value="${family}"]`);
    if (!(await box.isChecked().catch(() => false))) {
      await box.check({ timeout: 10000 });
    }
  }
  if (connectsToPower) {
    const radio = page.locator(`input[name="irConnectsToPower"][value="${connectsToPower}"]`);
    if (await radio.isVisible({ timeout: 3000 }).catch(() => false)) {
      await radio.check({ timeout: 5000 });
    }
  }
}

async function finalize(page, { regulatoryYesOverrides = [] } = {}) {
  const yesOverrides = new Set(regulatoryYesOverrides);
  for (let i = 0; i < 8; i++) {
    const resultVisible = await page.locator('#readinessResult').isVisible().catch(() => false);
    if (resultVisible) break;
    const radios = page.locator('#irRegulatoryQuestionHost input[type="radio"]');
    const count = await radios.count().catch(() => 0);
    if (count > 0) {
      const rawQuestionName = await radios.first().getAttribute('name').catch(() => null);
      const questionName = rawQuestionName ? rawQuestionName.replace(/^irReg-/, '') : null;
      if (questionName && yesOverrides.has(questionName)) {
        const yesOption = page.locator('#irRegulatoryQuestionHost input[type="radio"][value="yes"]').first();
        if (await yesOption.count() > 0) await yesOption.check({ timeout: 5000 }).catch(() => {});
        else await radios.first().check({ timeout: 5000 }).catch(() => {});
      } else {
        const noOption = page.locator('#irRegulatoryQuestionHost input[type="radio"][value="no"]').first();
        if (await noOption.count() > 0) await noOption.check({ timeout: 5000 }).catch(() => {});
        else await radios.first().check({ timeout: 5000 }).catch(() => {});
      }
    }
    const nextBtn = page.locator('#readinessNextButton');
    if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(120);
    } else break;
  }
  return page.locator('#readinessResult').isVisible({ timeout: 5000 }).catch(() => false);
}

async function runAssessment(page, cfg) {
  await startFresh(page);
  await fillQ3(page, cfg.name, cfg.desc);
  await setProductContext(page, cfg);
  await finalize(page, cfg);
  const visible = await page.locator('#readinessResult').isVisible().catch(() => false);
  const text = visible ? await page.locator('#readinessResult').innerText().catch(() => '') : '';
  return { visible, text };
}

async function clickEditAnswers(page) {
  await page.locator('button:has-text("עריכת תשובות")').click({ timeout: 10000 });
  await page.waitForTimeout(150);
}

async function clickBack(page, times = 1) {
  for (let i = 0; i < times; i++) {
    await page.locator('#readinessBackButton').click({ timeout: 10000 });
    await page.waitForTimeout(150);
  }
}

async function clickNewAssessment(page) {
  await page.locator('button:has-text("בדיקה חדשה")').click({ timeout: 10000 });
  await page.waitForTimeout(150);
}

async function clickReset(page) {
  // Reset lives on the form itself; Edit Answers reveals the form again
  // if the result is currently showing.
  const resultShowing = await page.locator('#readinessResult').isVisible().catch(() => false);
  if (resultShowing) await clickEditAnswers(page);
  await page.locator('#readinessResetButton').click({ timeout: 10000 });
  await page.waitForTimeout(150);
}

function ctaAndLimitationCounts(text) {
  const ctaCount = (text.match(/גורם מקצועי המטפל|מסווג מכס מקצועי|גורם תקינה או מסווג מכס/g) || []).length;
  return { ctaCount };
}

function familyLine(text) {
  const line = text.split('\n').find((l) => l.includes('משפחת המוצר שזוהתה:'));
  return line ? line.replace('משפחת המוצר שזוהתה: ', '').trim() : null;
}

// ---- Journeys -----------------------------------------------------------

async function journey1(page) {
  // Standalone battery -> Edit Answers -> internal-battery equipment
  const r1 = await runAssessment(page, { name: 'סוללה', desc: 'סוללת ליתיום', family: 'batteries_or_battery_containing' });
  const fam1 = familyLine(r1.text);

  await clickEditAnswers(page);
  await clickBack(page, 2);
  await fillQ3(page, 'מוצר הכולל סוללה פנימית', 'ציוד נייד עם סוללה');
  await setProductContext(page, { family: 'batteries_or_battery_containing' });
  await finalize(page, {});
  const text2 = await page.locator('#readinessResult').innerText().catch(() => '');
  const fam2 = familyLine(text2);

  const noPositive2 = text2.includes('לא זוהתה דרישה כללית') || text2.includes('לא זוהה תחום חוקיות יבוא חיובי');
  return {
    name: 'Standalone battery -> Edit Answers -> internal-battery equipment',
    ok: fam1 === 'סוללות ותאים' && fam2 === 'ציוד הכולל סוללה' && !text2.includes('סוללות ותאים') && noPositive2,
    fam1, fam2, text1: r1.text.slice(0, 200), text2: text2.slice(0, 200),
  };
}

async function journey2(page) {
  // Internal-battery equipment -> Edit Answers -> standalone battery
  const r1 = await runAssessment(page, { name: 'מוצר הכולל סוללה פנימית', desc: 'ציוד נייד עם סוללה', family: 'batteries_or_battery_containing' });
  const fam1 = familyLine(r1.text);

  await clickEditAnswers(page);
  await clickBack(page, 2);
  await fillQ3(page, 'סוללה', 'סוללת ליתיום');
  await setProductContext(page, { family: 'batteries_or_battery_containing' });
  await finalize(page, {});
  const text2 = await page.locator('#readinessResult').innerText().catch(() => '');
  const fam2 = familyLine(text2);

  return {
    name: 'Internal-battery equipment -> Edit Answers -> standalone battery',
    ok: fam1 === 'ציוד הכולל סוללה' && fam2 === 'סוללות ותאים' && text2.includes('תקינה'),
    fam1, fam2, text1: r1.text.slice(0, 200), text2: text2.slice(0, 200),
  };
}

async function journey3(page) {
  // Vehicle accumulator -> New Assessment -> ordinary furniture
  const r1 = await runAssessment(page, { name: 'מצבר לרכב', desc: 'מצבר ייעודי לרכב', family: 'batteries_or_battery_containing' });
  const fam1 = familyLine(r1.text);

  await clickNewAssessment(page);
  await startFresh(page);
  await fillQ3(page, 'שולחן', 'שולחן אוכל');
  await setProductContext(page, { family: 'furniture_and_home_goods' });
  await finalize(page, {});
  const text2 = await page.locator('#readinessResult').innerText().catch(() => '');
  const fam2 = familyLine(text2);

  return {
    name: 'Vehicle accumulator -> New Assessment -> ordinary furniture',
    ok: fam1 === 'מצבר ייעודי לרכב' && fam2 === 'ריהוט' && !text2.includes('מצבר') && !text2.includes('משרד התחבורה'),
    fam1, fam2, text1: r1.text.slice(0, 200), text2: text2.slice(0, 200),
  };
}

async function journey4(page) {
  // Mattress -> Reset -> ordinary furniture
  const r1 = await runAssessment(page, { name: 'מזרן', desc: 'מזרן זוגי', family: 'furniture_and_home_goods' });
  const fam1 = familyLine(r1.text);

  await clickReset(page);
  await startFresh(page);
  await fillQ3(page, 'שולחן', 'שולחן אוכל');
  await setProductContext(page, { family: 'furniture_and_home_goods' });
  await finalize(page, {});
  const text2 = await page.locator('#readinessResult').innerText().catch(() => '');
  const fam2 = familyLine(text2);

  return {
    name: 'Mattress -> Reset -> ordinary furniture',
    ok: fam1 === 'מזרנים' && fam2 === 'ריהוט' && !text2.includes('מזרנים'),
    fam1, fam2, text1: r1.text.slice(0, 200), text2: text2.slice(0, 200),
  };
}

async function journey5(page) {
  // Electrically wired furniture -> remove electrical characteristic
  const r1 = await runAssessment(page, {
    name: 'כורסה חשמלית', desc: 'כורסה עם חיווט חשמלי', family: null,
    regulatoryYesOverrides: ['mainsConnectedOrSuppliedAdapter'],
  });
  const cat1 = r1.text.includes('תקינה');

  await clickEditAnswers(page);
  await page.waitForTimeout(150);
  const stepAfterEdit = await page.evaluate(() => Array.from(document.querySelectorAll('[id^="irStep"]')).filter((el) => el.offsetParent !== null).map((el) => el.id));
  let ok2 = false;
  let text2 = '';
  if (stepAfterEdit.includes('irStepRegulatoryFollowup')) {
    const noOption = page.locator('#irRegulatoryQuestionHost input[type="radio"][value="no"]').first();
    await noOption.check({ timeout: 5000 }).catch(() => {});
    await page.click('#readinessNextButton', { timeout: 10000 }).catch(() => {});
    await finalize(page, {});
    text2 = await page.locator('#readinessResult').innerText().catch(() => '');
    ok2 = text2.includes('לא זוהתה דרישה כללית') || text2.includes('לא זוהה תחום חוקיות יבוא חיובי') || text2.includes('לא זוהה כיוון בדיקה מקצועי');
  }

  return {
    name: 'Electrically wired furniture -> remove electrical characteristic',
    ok: cat1 && ok2 && !text2.includes('תקינה'),
    text1: r1.text.slice(0, 200), text2: text2.slice(0, 200), stepAfterEdit,
  };
}

async function journey6(page) {
  // Ordinary furniture -> add electrical characteristic
  const r1 = await runAssessment(page, { name: 'שולחן', desc: 'שולחן אוכל', family: 'furniture_and_home_goods' });
  const noPos1 = r1.text.includes('לא זוהתה דרישה כללית') || r1.text.includes('לא זוהה תחום חוקיות יבוא חיובי');

  await clickEditAnswers(page);
  await clickBack(page, 2);
  await fillQ3(page, 'שולחן חשמלי', 'שולחן עם חיווט חשמלי מובנה');
  await setProductContext(page, { family: 'furniture_and_home_goods' });
  await finalize(page, { regulatoryYesOverrides: ['mainsConnectedOrSuppliedAdapter'] });
  const text2 = await page.locator('#readinessResult').innerText().catch(() => '');

  return {
    name: 'Ordinary furniture -> add electrical characteristic',
    ok: noPos1 && text2.includes('תקינה'),
    text1: r1.text.slice(0, 200), text2: text2.slice(0, 200),
  };
}

const JOURNEYS = [journey1, journey2, journey3, journey4, journey5, journey6];

async function main() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const results = [];
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    page.on('dialog', (d) => d.accept());
    const consoleErrors = [];
    const pageErrors = [];
    const networkHosts = new Set();
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    page.on('request', (req) => { try { networkHosts.add(new URL(req.url()).host); } catch { /* ignore unparseable URL */ } });
    for (const journeyFn of JOURNEYS) {
      let record;
      try {
        const outcome = await journeyFn(page);
        const localStorage = await page.evaluate(() => { try { return Object.keys(window.localStorage).length; } catch { return -1; } }).catch(() => null);
        const sessionStorage = await page.evaluate(() => { try { return Object.keys(window.sessionStorage).length; } catch { return -1; } }).catch(() => null);
        const finalUrl = page.url();
        record = { viewport: viewport.name, ...outcome, localStorage, sessionStorage, finalUrl, pass: !!outcome.ok };
      } catch (err) {
        record = { viewport: viewport.name, name: journeyFn.name, pass: false, error: String(err && err.message ? err.message.split('\n')[0] : err) };
      }
      results.push(record);
      console.log(`${record.pass ? 'PASS' : 'FAIL'} [${viewport.name}] ${record.name}${record.error ? ' -- ' + record.error : ''}`);
    }
    results.push({ viewport: viewport.name, name: '__errors__', consoleErrors: [...consoleErrors], pageErrors: [...pageErrors], networkHosts: [...networkHosts] });
    await page.close();
  }
  await browser.close();

  const journeyRecords = results.filter((r) => r.name !== '__errors__');
  const passed = journeyRecords.filter((r) => r.pass).length;
  const failed = journeyRecords.length - passed;

  writeFileSync(
    `${OUT_DIR}/lifecycle-results.json`,
    JSON.stringify({ generatedAt: new Date().toISOString(), commitSha: COMMIT_SHA, total: journeyRecords.length, passed, failed, results }, null, 2),
  );

  const md = [
    '# Import Readiness -- State-Lifecycle Acceptance Summary',
    '',
    `Commit: ${COMMIT_SHA}`,
    '',
    `Total: ${journeyRecords.length}  Passed: ${passed}  Failed: ${failed}`,
    '',
    ...journeyRecords.map((r) => `- [${r.viewport}] ${r.pass ? 'PASS' : 'FAIL'} -- ${r.name}`),
  ].join('\n');
  writeFileSync(`${OUT_DIR}/lifecycle-summary.md`, md);

  console.log('');
  console.log(`TOTAL=${journeyRecords.length} PASSED=${passed} FAILED=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
