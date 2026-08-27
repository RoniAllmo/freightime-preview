import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE_URL = 'http://localhost:8998/index.html';
const VIEWPORTS = { mobile: { width: 375, height: 800 }, desktop: { width: 1440, height: 900 } };
const commitSha = execSync('git rev-parse HEAD', { cwd: '/home/user/freightime-preview' }).toString().trim();
const ARTIFACTS_DIR = dirname(fileURLToPath(import.meta.url));

// 38 named scenarios covering all seven Wave 3 approved areas.
const SCENARIOS = [
  // -- Drones (1-4) --
  { n: 1, name: 'Drone (free text)', pname: 'רחפן', desc: 'רחפן', expectFamily: 'רחפן', expectPositive: true, expectCategory: 'משרד התקשורת' },
  { n: 2, name: 'Drone (English)', pname: 'camera drone', desc: 'camera drone', expectFamily: 'רחפן', expectPositive: true, expectCategory: 'משרד התקשורת' },
  { n: 3, name: 'Drone via wireless checkbox', checkbox: 'wireless_or_transmitting_equipment', pname: 'drone', desc: 'drone', expectFamily: 'רחפן', expectPositive: true, expectCategory: 'משרד התקשורת' },
  { n: 4, name: 'Drone accessory not a complete drone', pname: 'drone accessory', desc: 'drone propeller', expectNotFamily: 'רחפן' },
  // -- Non-food pet products (5-7) --
  { n: 5, name: 'Pet toy: no positive', pname: 'pet toy', desc: 'pet toy', expectFamily: 'מוצרים לבעלי חיים', expectNoPositive: true },
  { n: 6, name: 'Dog leash: no positive', pname: 'dog leash', desc: 'pet leash', expectFamily: 'מוצרים לבעלי חיים', expectNoPositive: true },
  { n: 7, name: 'Pet toy never becomes a children\'s toy', pname: 'pet toy', desc: 'pet toy', expectNotFamily: 'צעצועים' },
  // -- Hand tools (8-10) --
  { n: 8, name: 'Hammer: no positive', pname: 'hammer', desc: 'hammer', expectFamily: 'כלי עבודה ידניים', expectNoPositive: true },
  { n: 9, name: 'Screwdriver (Hebrew): no positive', pname: 'מברג', desc: 'מברג', expectFamily: 'כלי עבודה ידניים', expectNoPositive: true },
  { n: 10, name: 'Hand tool set: no positive', pname: 'hand tool set', desc: 'hand tool set', expectFamily: 'כלי עבודה ידניים', expectNoPositive: true },
  // -- Packaging (11-16) --
  { n: 11, name: 'Cardboard box: no positive', pname: 'cardboard box', desc: 'cardboard box', expectFamily: 'קרטון לאריזה', expectNoPositive: true },
  { n: 12, name: 'Polymer-coated food-contact cardboard: Standards', pname: 'אריזת קרטון בציפוי פולימרי למזון', desc: 'אריזת קרטון בציפוי פולימרי למזון', checkbox: 'plastics_polymers_and_coated_products', material: 'plastic_or_polymer', materialTouchesFood: 'yes', materialHasCoating: 'yes', answerFoodContactYes: true, expectFamily: 'מוצר עם ציפוי פולימרי במגע עם מזון', expectPositive: true, expectCategory: 'תקינה' },
  { n: 13, name: 'Wooden packaging box: Ministry of Agriculture', pname: 'wooden box', desc: 'wooden box', expectFamily: 'קופסת עץ לאריזה', expectPositive: true, expectCategory: 'משרד החקלאות' },
  { n: 14, name: 'Plastic food-contact bottle: Standards', pname: 'בקבוק פלסטיק למשקה', desc: 'בקבוק פלסטיק למשקה', checkbox: 'plastics_polymers_and_coated_products', material: 'plastic_or_polymer', materialTouchesFood: 'yes', expectNoteContains: 'משטח פלסטיק במוצר מיועד למגע ישיר עם מזון או שתייה', expectPositive: true, expectCategory: 'תקינה' },
  { n: 15, name: 'Glass food-contact bottle: Standards', pname: 'בקבוק זכוכית למשקה', desc: 'בקבוק זכוכית למשקה', checkbox: 'glass_ceramics_and_tableware', material: 'glass', materialTouchesFood: 'yes', expectNoteContains: 'כלי זכוכית המיועד למגע ישיר עם מזון או שתייה', expectPositive: true, expectCategory: 'תקינה' },
  { n: 16, name: 'Decorative bottle not swept into food-contact rule', pname: 'בקבוק דקורטיבי', desc: 'בקבוק דקורטיבי לנוי', expectUnknown: true },
  // -- Paper and printed products (17-20) --
  { n: 17, name: 'Printing paper: no positive', pname: 'printing paper', desc: 'printing paper', expectFamily: 'נייר ומוצרי דפוס', expectNoPositive: true },
  { n: 18, name: 'Ordinary book: no positive, not a toy', pname: 'ordinary book', desc: 'ordinary book', expectFamily: 'נייר ומוצרי דפוס', expectNoPositive: true },
  { n: 19, name: 'Toy book (play value): Standards via toys row', pname: 'toy book', desc: 'toy book', expectFamily: 'צעצועים', expectPositive: true, expectCategory: 'תקינה' },
  { n: 20, name: 'Notebook: no positive', pname: 'מחברת', desc: 'מחברת', expectFamily: 'נייר ומוצרי דפוס', expectNoPositive: true },
  // -- Non-apparel textile products (21-27) --
  { n: 21, name: 'Rug: Standards', pname: 'rug', desc: 'rug', expectFamily: 'שטיחים', expectPositive: true, expectCategory: 'תקינה' },
  { n: 22, name: 'Carpet cleaner not a carpet', pname: 'carpet cleaner', desc: 'carpet cleaner', expectUnknown: true },
  { n: 23, name: 'Ordinary blanket: no positive', pname: 'blanket', desc: 'textile blanket', expectFamily: 'שמיכה רגילה', expectNoPositive: true },
  { n: 24, name: 'Pacifier holder: Standards', pname: 'pacifier holder', desc: 'pacifier clip', expectFamily: 'מחזיק מוצץ', expectPositive: true, expectCategory: 'תקינה' },
  { n: 25, name: 'Infant carrier: Standards', pname: 'baby carrier', desc: 'infant carrier', expectFamily: 'מנשא לתינוק', expectPositive: true, expectCategory: 'תקינה' },
  { n: 26, name: 'Infant carrier via childrens checkbox', checkbox: 'childrens_products_and_toys', pname: 'infant carrier', desc: 'infant carrier', expectFamily: 'מנשא לתינוק', expectPositive: true, expectCategory: 'תקינה' },
  { n: 27, name: 'Household textile (bedding): no positive', pname: 'bedding', desc: 'bedding', expectFamily: 'מוצרי טקסטיל ביתיים', expectNoPositive: true },
  // -- Glass and ceramic products (28-33) --
  { n: 28, name: 'Glass food jar: Standards', pname: 'glass food jar', desc: 'glass food jar', expectFamily: 'כלי זכוכית במגע עם מזון או שתייה', expectPositive: true, expectCategory: 'תקינה' },
  { n: 29, name: 'Ceramic mug: Standards', pname: 'ceramic mug', desc: 'ceramic mug', expectFamily: 'כלי קרמיקה במגע עם מזון', expectPositive: true, expectCategory: 'תקינה' },
  { n: 30, name: 'Vehicle safety glass: certified vehicle laboratory route', pname: 'vehicle safety glass', desc: 'vehicle safety glass', expectFamily: 'זכוכית ושמשות לרכב', expectPositive: true },
  { n: 31, name: 'Building safety glass: Standards', pname: 'building safety glass', desc: 'building safety glass', expectFamily: 'זכוכית בטיחות לבניין', expectPositive: true, expectCategory: 'תקינה' },
  { n: 32, name: 'Decorative glass vase: no automatic direction', pname: 'decorative glass vase', desc: 'decorative glass vase', expectUnknown: true },
  { n: 33, name: 'Decorative ceramic ornament: no automatic direction', pname: 'ceramic ornament', desc: 'ceramic ornament', expectUnknown: true },
  // -- Regression: protected pre-existing behavior (34-38) --
  { n: 34, name: 'Regression: toys still positive Standards', pname: 'צעצועים', desc: 'צעצועים', expectFamily: 'צעצועים', expectPositive: true, expectCategory: 'תקינה' },
  { n: 35, name: 'Regression: animal feed still Veterinary Services', pname: 'מזון לבעלי חיים', desc: 'מזון לבעלי חיים', expectFamily: 'מזון לבעלי חיים', expectPositive: true, expectCategory: 'משרד החקלאות' },
  { n: 36, name: 'Regression: live animals still Veterinary Services', pname: 'בעל חיים חי', desc: 'בעל חיים חי', expectFamily: 'בעלי חיים', expectPositive: true, expectCategory: 'משרד החקלאות' },
  { n: 37, name: 'Regression: ordinary footwear still no positive', pname: 'נעליים רגילות', desc: 'נעליים רגילות', expectFamily: 'הנעלה רגילה', expectNoPositive: true },
  { n: 38, name: 'Regression: unknown/unrelated product stays unresolved', pname: 'מוצר לא ידוע לחלוטין', desc: 'תיאור סתום שאין לו קשר', expectUnknown: true },
];

async function run(page, s, viewport) {
  const consoleErrors = [];
  page.removeAllListeners('console');
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  await page.goto(BASE_URL, { timeout: 20000, waitUntil: 'load' });
  await page.click('#readinessStartButton');
  await page.click('input[name="irImportType"][value="commercial"]');
  await page.click('#readinessNextButton');
  await page.click('input[name="irExperience"][value="first_time"]');
  await page.click('#readinessNextButton');
  await page.fill('#irProductName', s.pname);
  await page.fill('#irCommercialDescription', s.desc);
  await page.click('#readinessNextButton');
  if (s.checkbox) await page.check(`input[name="irProductFamily"][value="${s.checkbox}"]`);
  if (s.material) await page.check(`input[name="irMaterial"][value="${s.material}"]`).catch(() => {});
  if (s.materialTouchesFood) {
    const radio = page.locator(`input[name="irMaterialTouchesFood"][value="${s.materialTouchesFood}"]`);
    if (await radio.isVisible({ timeout: 3000 }).catch(() => false)) await radio.check({ timeout: 5000 }).catch(() => {});
  }
  if (s.materialHasCoating) {
    const radio = page.locator(`input[name="irMaterialHasCoating"][value="${s.materialHasCoating}"]`);
    if (await radio.isVisible({ timeout: 3000 }).catch(() => false)) await radio.check({ timeout: 5000 }).catch(() => {});
  }

  for (let i = 0; i < 8; i++) {
    const rv = await page.locator('#readinessResult').isVisible().catch(() => false);
    if (rv) break;
    const radios = page.locator('#irRegulatoryQuestionHost input[type="radio"]');
    if ((await radios.count().catch(() => 0)) > 0) {
      const hostText = await page.locator('#irRegulatoryQuestionHost').innerText().catch(() => '');
      const isFoodContactQuestion = hostText.includes('מגע ישיר עם מזון או שתייה');
      if (s.answerFoodContactYes && isFoodContactQuestion) {
        const yesOpt = page.locator('#irRegulatoryQuestionHost input[type="radio"][value="yes"]').first();
        if (await yesOpt.count() > 0) await yesOpt.check().catch(() => {});
      } else {
        const noOpt = page.locator('#irRegulatoryQuestionHost input[type="radio"][value="no"]').first();
        if (await noOpt.count() > 0) await noOpt.check().catch(() => {});
      }
    }
    const nextBtn = page.locator('#readinessNextButton');
    if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) { await nextBtn.click().catch(() => {}); await page.waitForTimeout(120); } else break;
  }

  const resultVisible = await page.locator('#readinessResult').isVisible({ timeout: 5000 }).catch(() => false);
  const text = resultVisible ? await page.locator('#readinessResult').innerText().catch(() => '') : '';

  const checks = {};
  if (s.expectFamily) checks.family = text.includes(`משפחת המוצר שזוהתה: ${s.expectFamily}`);
  if (s.expectNotFamily) checks.notFamily = !text.includes(`משפחת המוצר שזוהתה: ${s.expectNotFamily}`);
  if (s.expectNoteContains) checks.noteContains = text.includes(s.expectNoteContains);
  if (s.expectPositive) checks.positive = !text.includes('לא זוהתה דרישה כללית');
  if (s.expectCategory) checks.category = text.includes(s.expectCategory);
  if (s.expectNoPositive) checks.noPositive = text.includes('לא זוהתה דרישה כללית');
  if (s.expectUnknown) checks.unknown = text.includes('לא זוהתה משפחת מוצר מתאימה') || !text.includes('משפחת המוצר שזוהתה:');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2).catch(() => null);
  const localStorage = await page.evaluate(() => { try { return Object.keys(window.localStorage).length; } catch { return -1; } }).catch(() => null);
  const sessionStorage = await page.evaluate(() => { try { return Object.keys(window.sessionStorage).length; } catch { return -1; } }).catch(() => null);
  const finalUrl = page.url();
  const productErrs = consoleErrors.filter((e) => !e.includes('ERR_CONNECTION_RESET'));

  const pass = resultVisible && Object.values(checks).every(Boolean)
    && !overflow && localStorage === 0 && sessionStorage === 0 && !finalUrl.includes(encodeURIComponent(s.pname)) && productErrs.length === 0;

  return { n: s.n, name: s.name, viewport, pass, checks, overflow, localStorage, sessionStorage, finalUrl, consoleErrors: productErrs, textSnippet: text.slice(0, 200) };
}

async function main() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pages = { mobile: await browser.newPage({ viewport: VIEWPORTS.mobile }), desktop: await browser.newPage({ viewport: VIEWPORTS.desktop }) };
  const results = [];
  for (const viewport of ['mobile', 'desktop']) {
    for (const s of SCENARIOS) {
      const record = await run(pages[viewport], s, viewport);
      results.push(record);
      console.log(`${record.pass ? 'PASS' : 'FAIL'} [${viewport}] #${s.n} ${s.name}`);
    }
  }
  await browser.close();
  const passed = results.filter((r) => r.pass).length;
  console.log('');
  console.log(`commitSha=${commitSha}`);
  console.log(`TOTAL=${results.length} PASSED=${passed} FAILED=${results.length - passed}`);
  for (const r of results.filter((r) => !r.pass)) console.log('FAIL DETAIL:', JSON.stringify(r));

  const jsonOut = {
    generatedAt: new Date().toISOString(),
    commitSha,
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
  writeFileSync(join(ARTIFACTS_DIR, 'wave-3-completion-results.json'), JSON.stringify(jsonOut, null, 2));
  const mdLines = [
    '# Wave 3 Completion Browser Acceptance Summary',
    '',
    `Commit: ${commitSha}`,
    '',
    `Total: ${results.length}, Passed: ${passed}, Failed: ${results.length - passed}`,
    '',
  ];
  if (passed === results.length) {
    mdLines.push('## All scenarios passed');
  } else {
    mdLines.push('## Failures');
    for (const r of results.filter((r) => !r.pass)) mdLines.push(`- [${r.viewport}] #${r.n} ${r.name}`);
  }
  writeFileSync(join(ARTIFACTS_DIR, 'wave-3-completion-summary.md'), mdLines.join('\n') + '\n');

  if (passed !== results.length) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exit(1); });
