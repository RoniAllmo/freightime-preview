/**
 * Regression tests for the Israeli compliance-readiness foundations added
 * in this change: footer legal links, the three new draft legal pages
 * (accessibility statement / privacy policy / terms of use), the
 * placeholder registry conventions, and a set of anti-fabrication
 * assertions that must hold for as long as the site is unpublished.
 *
 * Matches the existing pattern in
 * tests/readiness/professional-routing-quality-gate.test.js of asserting
 * against real page markup and source files as strings -- no jsdom, no
 * new framework.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);

function read(relPath) {
  return readFileSync(new URL(relPath, ROOT), 'utf8');
}

const LEGAL_PAGES = ['accessibility-statement.html', 'privacy-policy.html', 'terms-of-use.html'];

const DRAFT_NOTICE =
  'טיוטה לצורך בדיקה והשלמת פרטים. אין לפרסם כנוסח סופי לפני אישור משפטי והשלמת כל הפרטים המסומנים.';

// Realistic-looking fabricated values that must never appear anywhere in
// shipped content. Written here only as regression patterns to detect
// their ABSENCE -- never placed near real content elsewhere in the repo.
const FORBIDDEN_FABRICATIONS = [
  /example@example\.com/i,
  /test@test\.com/i,
  /050-0000000/,
  /03-0000000/,
  /03-1234567/,
  /hello@freightime\.co\.il/i,
  /רחוב לדוגמה/,
  /ישראל ישראלי/,
  /חברה לדוגמה בע"?מ/,
];

const APPROVED_PLACEHOLDER_RE = /\[להשלמה לפני פרסום:[^\]]+\]|\[נדרשת בדיקה משפטית לפני פרסום\]/;

test('1. all three draft legal pages exist on disk', () => {
  for (const page of LEGAL_PAGES) {
    assert.ok(existsSync(new URL(page, ROOT)), `expected ${page} to exist`);
  }
});

test('2. index.html footer links to all three legal pages and to contact', () => {
  const source = read('index.html');
  assert.ok(/<footer[\s\S]*<\/footer>/.test(source), 'expected a footer element');
  const footer = source.match(/<footer[\s\S]*<\/footer>/)[0];
  assert.ok(footer.includes('href="accessibility-statement.html"'), 'footer missing accessibility statement link');
  assert.ok(footer.includes('href="privacy-policy.html"'), 'footer missing privacy policy link');
  assert.ok(footer.includes('href="terms-of-use.html"'), 'footer missing terms of use link');
  assert.ok(footer.includes('href="#contact"'), 'footer missing contact link');
});

test('3. legal-page footer links work without JavaScript (plain relative hrefs, no javascript: scheme, no click-only wiring)', () => {
  const source = read('index.html');
  const footer = source.match(/<footer[\s\S]*<\/footer>/)[0];
  for (const page of LEGAL_PAGES) {
    const re = new RegExp(`<a href="${page.replace('.', '\\.')}"[^>]*>`);
    const match = footer.match(re);
    assert.ok(match, `expected a real <a href="${page}"> in the footer`);
    assert.ok(!/javascript:/i.test(match[0]), `${page} footer link must not use a javascript: href`);
  }
});

test('4. every legal page has lang="he" and dir="rtl" on the <html> element', () => {
  for (const page of LEGAL_PAGES) {
    const source = read(page);
    assert.match(source, /<html\s+lang="he"\s+dir="rtl">/, `${page} missing lang="he" dir="rtl"`);
  }
});

test('5. every legal page has exactly one <h1> and a sane nested heading order (h2 before h3)', () => {
  for (const page of LEGAL_PAGES) {
    const source = read(page);
    const h1s = [...source.matchAll(/<h1[\s>]/g)];
    assert.equal(h1s.length, 1, `${page} should have exactly one h1, found ${h1s.length}`);
    const headings = [...source.matchAll(/<h([1-4])[\s>]/g)].map((m) => Number(m[1]));
    for (let i = 1; i < headings.length; i++) {
      assert.ok(
        headings[i] <= headings[i - 1] + 1,
        `${page} skips a heading level: ...${headings[i - 1]} -> ${headings[i]}...`,
      );
    }
  }
});

test('6. every legal page has a skip link targeting #main, and a #main landmark', () => {
  for (const page of LEGAL_PAGES) {
    const source = read(page);
    assert.match(source, /class="skip-link" href="#main"/, `${page} missing skip link`);
    assert.match(source, /<main id="main">/, `${page} missing #main landmark`);
  }
});

test('7. every legal page carries the exact required draft-status notice', () => {
  for (const page of LEGAL_PAGES) {
    const source = read(page);
    assert.ok(source.includes(DRAFT_NOTICE), `${page} is missing the exact required draft-status notice`);
  }
});

test('8. no duplicate id attributes within any single legal page', () => {
  for (const page of LEGAL_PAGES) {
    const source = read(page);
    const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
    const seen = new Set();
    const dupes = new Set();
    for (const id of ids) {
      if (seen.has(id)) dupes.add(id);
      seen.add(id);
    }
    assert.deepEqual([...dupes], [], `${page}: duplicate ids found: ${[...dupes].join(', ')}`);
  }
});

test('9. every aria-labelledby reference in each legal page resolves to a real id in that same page', () => {
  for (const page of LEGAL_PAGES) {
    const source = read(page);
    const ids = new Set([...source.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
    const refs = [...source.matchAll(/aria-labelledby="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(refs.length > 0, `${page}: expected at least one aria-labelledby reference`);
    for (const id of refs) {
      assert.ok(ids.has(id), `${page}: aria-labelledby="${id}" does not resolve to a real id`);
    }
  }
});

test('10. legal pages carry no target="_blank" (no unnecessary new tabs) for internal navigation links', () => {
  for (const page of LEGAL_PAGES) {
    const source = read(page);
    const footer = source.match(/<footer[\s\S]*<\/footer>/)[0];
    assert.ok(!/target="_blank"/.test(footer), `${page}: footer nav should not force a new tab`);
  }
});

test('11. index.html and every legal page are free of realistic-looking fabricated contact/identity details', () => {
  const files = ['index.html', ...LEGAL_PAGES];
  for (const file of files) {
    const source = read(file);
    for (const pattern of FORBIDDEN_FABRICATIONS) {
      assert.ok(!pattern.test(source), `${file}: found forbidden fabricated-looking value matching ${pattern}`);
    }
  }
});

test('12. every legal page uses only the approved bracketed Hebrew placeholder format for missing operator/contact details, and each is grep-discoverable', () => {
  for (const page of LEGAL_PAGES) {
    const source = read(page);
    const matches = [...source.matchAll(/\[[^\]]*\]/g)].map((m) => m[0]);
    assert.ok(matches.length > 0, `${page}: expected at least one bracketed placeholder`);
    for (const bracket of matches) {
      assert.match(
        bracket,
        APPROVED_PLACEHOLDER_RE,
        `${page}: bracketed text "${bracket}" does not match the approved placeholder format`,
      );
    }
  }
});

test('13. the accessibility statement never claims certification, full compliance, or an appointed accessibility coordinator', () => {
  const source = read('accessibility-statement.html');
  assert.ok(!/תו נגישות(?!.*לא)/.test(source) || /לא (?:בוצעה|התקבל)/.test(source), 'unexpected unqualified certification claim');
  assert.ok(!/עמידה מלאה/.test(source.replace(/אין להסתמך על מסמך זה כהוכחת\s*עמידה מלאה/g, '')), 'unexpected full-compliance claim outside the explicit disclaimer');
  assert.ok(source.includes('טרם מונה'), 'expected an explicit "not yet appointed" statement about the accessibility coordinator');
});

test('14. the privacy policy never makes an absolute "we collect zero data" claim without qualification', () => {
  const source = read('privacy-policy.html');
  assert.ok(!/איננו אוספים שום מידע(?!\s*\()/.test(source), 'unexpected unqualified zero-data-collection claim');
  assert.ok(source.includes('מעובדות בדפדפן'), 'expected the precise browser-local-processing claim, not an absolute collection claim');
});

test('15. the terms-of-use page never states "no commercial relationship exists" or "verified professional network" as fact', () => {
  const source = read('terms-of-use.html');
  assert.ok(!/אין קשר מסחרי/.test(source), 'must not assert "no commercial relationship" as verified fact');
  assert.ok(!/רשת אנשי מקצוע מאומתת/.test(source), 'must not assert "verified professional network" as fact');
  assert.ok(
    source.includes('יש לאשר האם קיימים קשרים מסחריים'),
    'expected the required commercial-relationship placeholder blocker',
  );
});

test('16. the terms-of-use page marks the Hero image license and jurisdiction/liability clauses as needing verification', () => {
  const source = read('terms-of-use.html');
  assert.ok(source.includes('אימות רישיון וזכות שימוש בתמונת ה-Hero'), 'expected the Hero-license placeholder');
  assert.ok((source.match(/\[נדרשת בדיקה משפטית לפני פרסום\]/g) || []).length >= 1, 'expected at least one legal-review marker');
});

test('17. no new localStorage/sessionStorage/analytics/tracking code was introduced by the legal pages or footer wiring', () => {
  // privacy-policy.html is exempt from the storage-keyword check: it
  // legitimately *discusses* localStorage/sessionStorage in prose while
  // describing the verified absence of their use -- that is intentional
  // content, not usage. The other files must never mention them at all.
  const files = ['index.html', ...LEGAL_PAGES, 'css/legal.css'];
  for (const file of files) {
    const source = read(file);
    if (file !== 'privacy-policy.html') {
      assert.ok(!/localStorage|sessionStorage|indexedDB/i.test(source), `${file}: unexpected browser-storage usage`);
    }
    assert.ok(!/gtag|google-analytics|googletagmanager|analytics\.js|fbq\(|facebook\.net|hotjar|mixpanel|segment\.io/i.test(source), `${file}: unexpected analytics/tracking reference`);
    if (file !== 'privacy-policy.html') {
      assert.ok(!/sendBeacon|XMLHttpRequest|new WebSocket/.test(source), `${file}: unexpected network-transmission API usage`);
    }
  }
});

test('18. the contact-form success message no longer implies a real message was received when the form does not transmit anywhere, and is announced via aria-live', () => {
  const source = read('index.html');
  const successSpan = source.match(/<span class="form-msg" id="cfSuccess"[^>]*>([^<]*)<\/span>/);
  assert.ok(successSpan, 'expected the contact-form success message element');
  const openTag = source.match(/<span class="form-msg" id="cfSuccess"[^>]*>/)[0];
  assert.ok(/aria-live="polite"/.test(openTag), 'expected the status message to be announced via aria-live="polite"');
  assert.ok(
    !/נחזור אליכם בהקדם/.test(successSpan[1]),
    'the demo contact form must not claim FreighTime will follow up, since nothing is actually transmitted',
  );
});

test('19. the visible contact-section phone/email are explicit placeholders, not a fabricated real-looking number/address', () => {
  const source = read('index.html');
  const contactSection = source.match(/<section class="pad-sm bg-tint" id="contact">[\s\S]*?<\/section>/)[0];
  assert.match(contactSection, /\[להשלמה לפני פרסום: מספר טלפון\]/);
  assert.match(contactSection, /\[להשלמה לפני פרסום: כתובת דוא"ל מאושרת\]/);
});

test('20. the decorative service-card SVG icons are aria-hidden (do not surface as unlabeled images to assistive tech)', () => {
  const source = read('index.html');
  const iconBoxes = [...source.matchAll(/<div class="icon-box"><svg[^>]*>/g)];
  assert.ok(iconBoxes.length >= 3, 'expected at least three service-card icon boxes');
  for (const box of iconBoxes) {
    assert.ok(/aria-hidden="true"/.test(box[0]), `expected aria-hidden="true" on decorative icon: ${box[0]}`);
  }
});

test('21. the pre-publication compliance checklist doc exists and lists the professional-referral commercial-relationship blocker', () => {
  const checklistPath = new URL('docs/PRE_PUBLICATION_COMPLIANCE_CHECKLIST.md', ROOT);
  assert.ok(existsSync(checklistPath), 'expected docs/PRE_PUBLICATION_COMPLIANCE_CHECKLIST.md to exist');
  const source = readFileSync(checklistPath, 'utf8');
  assert.ok(source.includes('יש לאשר האם קיימים קשרים מסחריים'), 'checklist must list the commercial-relationship blocker');
  assert.ok(/אימות רישיון וזכות שימוש בתמונת ה-Hero/.test(source), 'checklist must list the Hero-image license blocker');
});

test('22. a grep-based detector script can find every unresolved placeholder across shipped legal content (informational, not release-blocking yet)', () => {
  const files = ['index.html', ...LEGAL_PAGES];
  let total = 0;
  for (const file of files) {
    const source = read(file);
    const matches = source.match(/\[להשלמה לפני פרסום:[^\]]+\]|\[נדרשת בדיקה משפטית לפני פרסום\]/g) || [];
    total += matches.length;
  }
  // Placeholders are EXPECTED to exist right now -- this assertion documents
  // that fact and will start failing (as intended) only once real details
  // are filled in and the doc's future CI-gate wiring is switched on.
  assert.ok(total > 0, 'expected unresolved compliance placeholders to currently exist (informational, see docs/PRE_PUBLICATION_COMPLIANCE_CHECKLIST.md)');
});
