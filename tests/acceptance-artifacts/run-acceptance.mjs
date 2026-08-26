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

// ---- Scenario definitions -------------------------------------------------
// Each scenario: id, name, importType, family checkbox(es), material
// checkbox(es), characteristic answers (name -> 'yes'/'no'), product text,
// expected assertions.
const SCENARIOS = [
  s(1, 'Medical device', { family: 'medical_equipment_or_medical_use', name: 'מד לחץ דם', desc: 'מד לחץ דם ביתי', expectFamily: 'ציוד רפואי', expectCategories: ['משרד הבריאות'] }),
  s(2, 'Protective equipment', { family: null, name: 'קסדת מגן', desc: 'קסדת מגן לעבודה', expectFamily: 'ציוד מגן אישי', expectCategories: ['תקינה'] }),
  s(3, 'Pesticide', { family: 'chemicals_paints_adhesives_aerosols', name: 'קוטל חרקים', desc: 'קוטל חרקים בתרסיס', expectFamily: 'חומרי הדברה', expectCategories: ['משרד הבריאות'] }),
  s(4, 'Human supplement', { family: 'dietary_supplements', name: 'תוסף מזון', desc: 'תוסף תזונה לאדם', expectFamily: 'תוספי תזונה', expectCategories: ['משרד הבריאות'] }),
  s(5, 'Animal vitamins', { family: 'dietary_supplements', name: 'ויטמינים לבעלי חיים', desc: 'תוסף ויטמינים לכלבים', expectFamily: 'ויטמינים לבעלי חיים', expectCategories: ['משרד החקלאות'] }),
  s(6, 'Pharmaceutical-manufacturing vitamins', { family: 'dietary_supplements', name: 'ויטמינים לייצור תרופות', desc: 'חומר גלם ויטמיני לייצור תרופות', expectFamily: 'ויטמינים לייצור תרופות', expectCategories: ['משרד הבריאות'] }),
  s(7, 'Ambiguous vitamins', { family: 'dietary_supplements', name: 'ויטמינים', desc: 'מוצר ויטמינים', expectUnresolved: true }),
  s(8, 'Plant or seed', { family: 'plant_origin_products', name: 'זרעים לשתילה', desc: 'זרעים לגינה', expectFamily: 'תוצרת חקלאית, זרעים וצמחים', expectCategories: ['משרד הבריאות', 'משרד החקלאות'] }),
  s(9, 'Vehicle accessory', { family: 'vehicle_parts_and_transport_accessories', name: 'אביזר לרכב', desc: 'אביזר נוחות לרכב', expectFamily: 'חלקי חילוף לרכב', expectCategories: ['משרד התחבורה / מעבדת רכב'] }),
  s(10, 'Wireless product', { family: 'wireless_or_transmitting_equipment', name: 'מוצר אלחוטי Wi-Fi', desc: 'רמקול Wi-Fi', expectFamily: 'מוצר אלחוטי, Wi-Fi או Bluetooth', expectCategories: ['תקינה', 'משרד התקשורת'] }),
  s(11, 'Household mains appliance', { family: 'electrical_and_electronics', name: 'קומקום חשמלי', desc: 'קומקום חשמלי ביתי', connectsToPower: 'yes', expectDetailedRule: 'mains-connected-electrical-product' }),
  s(12, 'Standalone battery', { family: 'batteries_or_battery_containing', name: 'סוללה', desc: 'סוללת ליתיום', expectFamily: 'סוללות ותאים', expectCategories: ['תקינה'] }),
  s(13, 'Vehicle accumulator', { family: 'batteries_or_battery_containing', name: 'מצבר לרכב', desc: 'מצבר ייעודי לרכב', expectFamily: 'מצבר ייעודי לרכב', expectCategories: ['משרד התחבורה / מעבדת רכב'] }),
  s(14, 'Equipment with wall charger', { family: 'electrical_and_electronics', name: 'ציוד עם מטען קיר', desc: 'מוצר המגיע עם מטען חשמלי', connectsToPower: 'yes', expectDetailedRule: 'mains-connected-electrical-product' }),
  s(15, 'Perfume', { family: 'cosmetics_and_beauty', name: 'בושם', desc: 'בושם צרפתי', expectFamily: 'בשמים', expectNoPositive: true }),
  s(16, 'Deodorant', { family: 'cosmetics_and_beauty', name: 'דיאודורנט', desc: 'דיאודורנט לגוף', expectFamily: 'תמרוקים', expectCategories: ['משרד הבריאות'] }),
  s(17, 'Nail polish', { family: 'cosmetics_and_beauty', name: 'לק לציפורניים', desc: 'לק צבעוני', expectFamily: 'תמרוקים', expectCategories: ['משרד הבריאות'] }),
  s(18, 'Ambiguous perfume/cosmetics', { family: 'cosmetics_and_beauty', name: 'מוצר קוסמטי ובושם', desc: 'מוצר קוסמטי', expectUnresolved: true }),
  s(19, 'Ordinary footwear', { family: 'textile_apparel_and_footwear', name: 'נעליים', desc: 'נעליים לגברים', expectFamily: 'הנעלה רגילה', expectNoPositive: true }),
  s(20, 'Safety footwear', { family: 'textile_apparel_and_footwear', name: 'נעלי בטיחות', desc: 'נעלי בטיחות לעבודה', expectFamily: 'הנעלת בטיחות', expectCategories: ['תקינה'] }),
  s(21, 'Ordinary furniture', { family: 'furniture_and_home_goods', name: 'שולחן', desc: 'שולחן אוכל', expectFamily: 'ריהוט', expectNoPositive: true }),
  s(22, 'Mattress', { family: 'furniture_and_home_goods', name: 'מזרן', desc: 'מזרן זוגי', expectFamily: 'מזרנים', expectCategories: ['תקינה'] }),
  s(23, 'Electrically wired furniture', { family: null, name: 'כורסה חשמלית', desc: 'כורסה עם חיווט חשמלי', regulatoryYesOverrides: ['mainsConnectedOrSuppliedAdapter'], expectDetailedRule: 'mains-connected-electrical-product', expectCategories: ['תקינה'] }),
  s(24, 'Infant crib', { family: 'childrens_products_and_toys', name: 'לול לתינוק', desc: 'לול נייד', expectFamily: 'עגלות, מיטות, לולים וכיסאות אוכל', expectCategories: ['תקינה'] }),
  s(25, 'Plastic kitchen article', { family: 'food_contact_items', material: 'plastic_or_polymer', materialTouchesFood: 'yes', name: 'קופסת אוכל מפלסטיק', desc: 'קופסת פלסטיק לאוכל', expectCategories: ['תקינה'] }),
  s(26, 'Plastic-coated metal food-contact item', { family: 'plastics_polymers_and_coated_products', material: 'plastic_or_polymer', materialTouchesFood: 'yes', materialHasCoating: 'yes', name: 'מחבת מצופה', desc: 'מחבת עם ציפוי לא נדבק', expectFamily: 'מוצר עם ציפוי פולימרי במגע עם מזון', expectCategories: ['תקינה'] }),
  s(27, 'Infant-feeding cutlery', { family: 'childrens_products_and_toys', name: 'כפית לתינוק לאכילה', desc: 'כפית האכלה', expectFamily: 'מוצרי תינוקות', expectCategories: ['תקינה'] }),
  s(28, 'Ordinary bicycle', { family: null, name: 'אופניים', desc: 'אופני הרים', expectFamily: 'אופניים וקורקינטים רגילים', expectCategories: ['תקינה'] }),
  s(29, 'Electric bicycle', { family: null, name: 'אופניים חשמליים', desc: 'אופניים עם מנוע עזר', expectFamily: 'אופניים או קורקינט עם מנוע עזר', expectCategories: ['משרד התחבורה / מעבדת רכב'] }),
  s(30, 'Ordinary scooter', { family: null, name: 'קורקינט רגיל', desc: 'קורקינט קלאסי לשימוש יומיומי', expectFamily: 'אופניים וקורקינטים רגילים', expectCategories: ['תקינה'] }),
  s(31, 'Electric scooter', { family: null, name: 'קורקינט חשמלי', desc: 'קורקינט עם מנוע עזר', expectFamily: 'אופניים או קורקינט עם מנוע עזר', expectCategories: ['משרד התחבורה / מעבדת רכב'] }),
  s(32, 'Ordinary sports equipment', { family: null, name: 'משקולות', desc: 'ציוד ספורט', expectFamily: 'ציוד ספורט', expectNoPositive: true }),
  s(33, 'Electrically wired treadmill', { family: null, name: 'הליכון חשמלי', desc: 'מכשיר כושר עם חיווט חשמלי', regulatoryYesOverrides: ['mainsConnectedOrSuppliedAdapter'], expectDetailedRule: 'mains-connected-electrical-product', expectCategories: ['תקינה'] }),
  s(34, 'Toy regression', { family: 'childrens_products_and_toys', name: 'צעצוע פלסטיק', desc: 'צעצוע ילדים', expectFamily: 'צעצועים', expectCategories: ['תקינה'] }),
  s(35, 'Animal-origin regression', { family: 'animal_origin_products', name: 'מזון מן החי', desc: 'בשר קפוא', expectFamily: 'מזון מן החי', expectCategories: ['משרד הבריאות', 'משרד החקלאות'] }),
  s(36, 'Machinery regression', { family: 'industrial_machinery_and_equipment', name: 'מכונת תעשייה', desc: 'ציוד תעשייתי', expectFamily: 'מכונות וציוד תעשייתי', expectNoPositive: true }),
  s(37, 'Building-material regression', { family: 'building_materials', name: 'חומרי בניין', desc: 'חומר בנייה', expectFamily: 'חומרי בנייה', expectNoPositive: true }),
  s(38, 'Glass detailed rule', { family: 'glass_ceramics_and_tableware', material: 'glass', name: 'כוס זכוכית', desc: 'כוס זכוכית לשתיה', materialTouchesFood: 'yes', expectDetailedRule: 'glass-food-contact-vessel' }),
  s(39, 'Plastic food-contact detailed rule', { family: 'food_contact_items', material: 'plastic_or_polymer', name: 'קופסת פלסטיק לאוכל', desc: 'קופסה לאוכל', materialTouchesFood: 'yes', expectDetailedRule: 'plastic-direct-food-contact' }),
  s(40, 'Vehicle detailed rule', { family: 'vehicle_parts_and_transport_accessories', name: 'פנס לרכב', desc: 'פנס קדמי לרכב להתקנה ברכב', expectDetailedRuleOrPositive: true }),
  s(41, 'Unknown family', { family: null, name: 'מוצר לא ידוע לחלוטין', desc: 'תיאור סתום', expectUnknownFamily: true }),
  s(42, 'Unresolved explicit selection', { family: 'food_contact_items', name: 'מוצר סתמי', desc: 'תיאור כללי', expectUnresolved: true }),
  s(43, 'Cargo damage', { problem: 'cargo_or_container_damage' }),
  s(44, 'Customs dispute', { problem: 'classification_dispute' }),
  s(45, 'Equipment containing an internal battery', { family: 'batteries_or_battery_containing', name: 'מוצר הכולל סוללה פנימית', desc: 'ציוד נייד עם סוללה', expectFamily: 'ציוד הכולל סוללה', expectNoPositive: true }),
  s(46, 'Battery charger', { family: 'batteries_or_battery_containing', name: 'battery charger', desc: 'מטען לסוללה', expectNotFamily: 'סוללות ותאים' }),
  s(47, 'Battery tester', { family: 'batteries_or_battery_containing', name: 'battery tester', desc: 'בודק סוללות', expectNotFamily: 'סוללות ותאים' }),
  s(48, 'Battery holder', { family: 'batteries_or_battery_containing', name: 'battery holder', desc: 'מחזיק סוללה', expectNotFamily: 'סוללות ותאים' }),
];

function s(id, name, cfg) {
  return { id, name, ...cfg };
}

// ---- Runner -----------------------------------------------------------

async function runScenario(page, scenario, viewport) {
  const record = {
    scenario: scenario.id,
    name: scenario.name,
    viewport: viewport.name,
    assertions: {},
    pass: true,
    errors: [],
  };
  const consoleErrors = [];
  const pageErrors = [];
  const networkHosts = new Set();
  const onConsole = (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); };
  const onPageError = (err) => pageErrors.push(String(err));
  const onRequest = (req) => { try { networkHosts.add(new URL(req.url()).host); } catch { /* ignore unparseable URL */ } };
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('request', onRequest);

  try {
    const initialUrl = page.url();
    await page.goto(BASE_URL, { timeout: 20000, waitUntil: 'load' });
    record.initialUrl = page.url();

    if (scenario.problem) {
      await page.click('#readinessProblemShortcutButton', { timeout: 10000 });
      await page.selectOption('#irProblemType', scenario.problem, { timeout: 10000 });
      await page.click('#readinessNextButton', { timeout: 10000 });
      await page.click('#readinessNextButton', { timeout: 10000 }); // problemDetails -> result
    } else {
      await page.click('#readinessStartButton', { timeout: 10000 });
      await page.click('input[name="irImportType"][value="personal"]', { timeout: 10000 });
      await page.click('#readinessNextButton', { timeout: 10000 });
      await page.click('input[name="irExperience"][value="first_time"]', { timeout: 10000 });
      await page.click('#readinessNextButton', { timeout: 10000 });
      await page.fill('#irProductName', scenario.name || '', { timeout: 10000 });
      await page.fill('#irCommercialDescription', scenario.desc || '', { timeout: 10000 });
      await page.click('#readinessNextButton', { timeout: 10000 }); // -> productContext

      if (scenario.family) {
        await page.check(`input[name="irProductFamily"][value="${scenario.family}"]`, { timeout: 10000 });
      }
      if (scenario.material) {
        await page.check(`input[name="irMaterial"][value="${scenario.material}"]`, { timeout: 10000 });
      }
      if (scenario.connectsToPower) {
        const radio = page.locator(`input[name="irConnectsToPower"][value="${scenario.connectsToPower}"]`);
        if (await radio.isVisible({ timeout: 3000 }).catch(() => false)) {
          await radio.check({ timeout: 5000 });
        }
      }
      if (scenario.materialTouchesFood) {
        const radio = page.locator(`input[name="irMaterialTouchesFood"][value="${scenario.materialTouchesFood}"]`);
        if (await radio.isVisible({ timeout: 3000 }).catch(() => false)) {
          await radio.check({ timeout: 5000 });
        }
      }
      if (scenario.materialHasCoating) {
        const radio = page.locator(`input[name="irMaterialHasCoating"][value="${scenario.materialHasCoating}"]`);
        if (await radio.isVisible({ timeout: 3000 }).catch(() => false)) {
          await radio.check({ timeout: 5000 });
        }
      }

      // Generic finalize loop: click Next; if a regulatoryFollowup fieldset
      // with a radio group appears, answer 'no' (safe default; scenario-
      // specific 'yes' answers were already set as visible productContext
      // toggles above) and continue, until the result is visible. A
      // scenario may name specific question ids (by their radio `name`
      // attribute) that must be answered 'yes' instead -- used only for
      // the two free-text-only mains-electrical scenarios (#23, #33)
      // that have no visible productContext toggle to set 'yes' on
      // directly.
      const yesOverrides = new Set(scenario.regulatoryYesOverrides || []);
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
            if (await yesOption.count() > 0) {
              await yesOption.check({ timeout: 5000 }).catch(() => {});
            } else {
              await radios.first().check({ timeout: 5000 }).catch(() => {});
            }
          } else {
            const noOption = page.locator('#irRegulatoryQuestionHost input[type="radio"][value="no"]').first();
            if (await noOption.count() > 0) {
              await noOption.check({ timeout: 5000 }).catch(() => {});
            } else {
              await radios.first().check({ timeout: 5000 }).catch(() => {});
            }
          }
        }
        const nextBtn = page.locator('#readinessNextButton');
        if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nextBtn.click({ timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(120);
        } else break;
      }
    }

    const resultVisible = await page.locator('#readinessResult').isVisible({ timeout: 5000 }).catch(() => false);
    record.resultVisible = resultVisible;
    const resultText = resultVisible ? await page.locator('#readinessResult').innerText().catch(() => '') : '';
    record.resultText = resultText.slice(0, 600);

    // Assertions
    if (scenario.expectFamily) {
      record.assertions.expectFamily = resultText.includes(`משפחת המוצר שזוהתה: ${scenario.expectFamily}`);
    }
    if (scenario.expectNotFamily) {
      record.assertions.expectNotFamily = !resultText.includes(`משפחת המוצר שזוהתה: ${scenario.expectNotFamily}`);
    }
    if (scenario.expectCategories) {
      record.assertions.expectCategories = scenario.expectCategories.every((c) => resultText.includes(c));
    }
    if (scenario.expectNoPositive) {
      record.assertions.expectNoPositive = resultText.includes('לא זוהתה דרישה כללית') || resultText.includes('לא זוהה תחום חוקיות יבוא חיובי');
    }
    if (scenario.expectUnresolved) {
      record.assertions.expectUnresolved = resultText.includes('משפחת המוצר שנבחרה כוללת כמה אפשרויות') || resultText.includes('ניתן להתקדם באיסוף מידע');
    }
    if (scenario.expectUnknownFamily) {
      record.assertions.expectUnknownFamily = resultText.includes('לא זוהתה משפחת מוצר מתאימה');
    }
    if (scenario.expectDetailedRule) {
      // Best-effort: detailed-rule cards render their own publicTitle text, not a generic marker; just record resultText for manual/automated cross-check.
      record.assertions.gotResult = resultVisible;
    }
    if (scenario.problem) {
      record.assertions.gotResult = resultVisible && resultText.length > 0;
    }

    // Global checks
    const ctaCount = await page.locator('#readinessResult a.btn, #readinessResult button.btn-primary, #readinessResult [data-cta]').count().catch(() => null);
    record.overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2).catch(() => null);
    record.localStorage = await page.evaluate(() => { try { return Object.keys(localStorage).length; } catch { return -1; } }).catch(() => null);
    record.sessionStorage = await page.evaluate(() => { try { return Object.keys(sessionStorage).length; } catch { return -1; } }).catch(() => null);
    record.finalUrl = page.url();
    record.consoleErrors = consoleErrors;
    record.pageErrors = pageErrors;
    record.networkHosts = [...networkHosts];

    const assertionValues = Object.values(record.assertions);
    record.pass = resultVisible && (assertionValues.length === 0 || assertionValues.every(Boolean));
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
      console.log(`${record.pass ? 'PASS' : 'FAIL'} [${viewport.name}] #${scenario.id} ${scenario.name}${record.errors.length ? ' -- ' + record.errors.join('; ') : ''}`);
    }
    await page.close();
  }
  await browser.close();

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = total - passed;
  writeFileSync(`${OUT_DIR}/acceptance-results.json`, JSON.stringify({
    generatedAt: new Date().toISOString(),
    commitSha: COMMIT_SHA,
    total, passed, failed,
    results,
  }, null, 2));

  const failLines = results.filter((r) => !r.pass).map((r) => `- #${r.scenario} ${r.name} [${r.viewport}]: ${r.errors.join('; ') || JSON.stringify(r.assertions)}`);
  const md = [
    '# Browser Acceptance Summary',
    '',
    `Commit: ${COMMIT_SHA}`,
    '',
    `Total: ${total}, Passed: ${passed}, Failed: ${failed}`,
    '',
    failed > 0 ? '## Failures\n\n' + failLines.join('\n') : '## All scenarios passed',
  ].join('\n');
  writeFileSync(`${OUT_DIR}/acceptance-summary.md`, md);

  console.log(`\nTOTAL=${total} PASSED=${passed} FAILED=${failed}`);
}

main();
