/**
 * HS6 lookup behind GET /api/v1/compliance (api/lib/compliance.js).
 * Pure Node: the Express wrapper is not loaded, so no install is needed.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadDatabase, lookupCompliance, codeMatches, DISCLAIMER, NO_MATCH_NOTE, STANDARDS_AUTHORITIES,
} from '../../api/lib/compliance.js';

const db = loadDatabase();
const ask = (query) => lookupCompliance(db, query);
const ids = (res) => res.body.matches.map((m) => m.family_id);

test('1. a drone HS6 under personal import returns the drone family, not exempt, with its flag applying', () => {
  const res = ask({ hs6: '880621', import_type: 'personal' });
  assert.equal(res.status, 200);
  assert.deepEqual(ids(res), ['electrical-and-electronics-10']);
  const m = res.body.matches[0];
  assert.equal(m.hs_match.code, '8806.xx');
  assert.equal(m.personal_import.commercial_exemption_applies, false);
  assert.ok(m.personal_import.conditions.includes('Civil Aviation Authority'));
  assert.ok(m.risk_flags.every((f) => f.applies_in_personal_import === true));
  assert.equal(res.body.disclaimer, DISCLAIMER);
});

test('2. toys under personal import: the standards flag is exempt, but the bows import-licence flag still applies', () => {
  const toys = ask({ hs6: '950300', import_type: 'personal' }).body.matches.find((m) => m.family_id === 'children-and-infants-01');
  assert.equal(toys.personal_import.commercial_exemption_applies, true);
  const byType = Object.fromEntries(toys.risk_flags.map((f) => [f.requirement_type, f.applies_in_personal_import]));
  assert.deepEqual(byType, { standards_approval: false, import_license: true });
});

test('3. the personal exemption never switches off a non-standards flag, for any family', () => {
  for (const family of db.families) {
    for (const entry of family.hs_mapping.codes) {
      // A 6-digit code inside this entry: the code itself, or its first heading.
      const hs6 = entry.match === 'exact' || entry.match === 'partial' ? entry.code.replace('.', '') : `${entry.code.slice(0, 4)}00`;
      const res = ask({ hs6, import_type: 'personal' });
      for (const m of res.body.matches) {
        for (const f of m.risk_flags) {
          if (!STANDARDS_AUTHORITIES.includes(f.authority)) assert.equal(f.applies_in_personal_import, true, `${m.family_id}: ${f.authority}`);
        }
      }
    }
  }
});

test('4. every exact or partial code reaches its own family; commercial queries carry no personal fields', () => {
  for (const family of db.families) {
    for (const entry of family.hs_mapping.codes.filter((c) => c.match === 'exact' || c.match === 'partial')) {
      const res = ask({ hs6: entry.code.replace('.', '') });
      assert.ok(ids(res).includes(family.family_id), `${entry.code} -> ${family.family_id}`);
      for (const m of res.body.matches) {
        assert.equal(m.personal_import, undefined);
        assert.ok(m.risk_flags.every((f) => !('applies_in_personal_import' in f)));
      }
    }
  }
});

test('5. a more specific match is listed first; headings and ranges match by their first four digits', () => {
  assert.deepEqual(ids(ask({ hs6: '870830' })), ['vehicles-and-transport-06', 'vehicles-and-transport-03']);
  assert.ok(codeMatches({ code: '0701-0714', match: 'heading_range' }, '070990'));
  assert.ok(!codeMatches({ code: '0701-0714', match: 'heading_range' }, '071590'));
  assert.ok(codeMatches({ code: '8806.xx', match: 'heading' }, '880699'));
  assert.ok(!codeMatches({ code: '9022.14', match: 'exact' }, '902219'));
});

test('6. unknown codes return an empty list with a note that never claims "no requirement"', () => {
  const res = ask({ hs6: '999999' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.matches, []);
  assert.equal(res.body.note, NO_MATCH_NOTE);
  assert.ok(res.body.note.includes('does not mean the goods have no requirement'));
  assert.ok(!/exempt/i.test(res.body.note));
});

test('7. invalid input is a 400; dots and spaces in the code are accepted; commercial is the default', () => {
  assert.equal(ask({}).status, 400);
  assert.equal(ask({ hs6: '12ab' }).body.error, 'invalid_hs6');
  assert.equal(ask({ hs6: '1234567' }).status, 400);
  assert.equal(ask({ hs6: '880621', import_type: 'b2b' }).body.error, 'invalid_import_type');
  assert.equal(ask({ hs6: '9022.14' }).body.input.hs6, '902214');
  assert.equal(ask({ hs6: '902214' }).body.input.import_type, 'commercial');
});
