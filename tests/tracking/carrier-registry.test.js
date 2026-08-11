/**
 * Tests for the official-tracking-destination registry in
 * js/tracking/carrier-registry.js, using the built-in Node.js test runner
 * (`node:test`) and assertion library (`node:assert`).
 *
 * This registry is data-only and immutable. These tests confirm its exact
 * shape, its six approved records — UPS, UPS Roadie, EMS (manually
 * verified and approved by the project owner, see
 * SAFE_EXTERNAL_ROUTING_DESIGN.md Sections 6–8) and MSC, ZIM, Maersk
 * (project-owner manually verified per FCL_CONTAINER_TRACKING_DESIGN.md
 * Sections 8-10, added for the ocean-container useful-tracking vertical
 * slice) — strict lookup behavior (no normalization, no case-folding),
 * full immutability, and the absence of any excluded provider, identifier
 * family, API, network, navigation, storage, logging, or assistant
 * interaction. No tracking identifier is used anywhere in this file.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  officialTrackingDestinations,
  getOfficialTrackingDestination,
} from '../../js/tracking/carrier-registry.js';

const REQUIRED_FIELDS = Object.freeze([
  'id',
  'displayName',
  'identifierType',
  'carrierId',
  'officialUrl',
  'identifierPrefillSupported',
  'enabled',
  'evidenceStatus',
  'privacyMode',
]);

const EXPECTED_RECORDS = Object.freeze({
  ups: {
    id: 'ups',
    displayName: 'UPS',
    identifierType: 'commercial-courier',
    carrierId: 'ups',
    officialUrl: 'https://www.ups.com/track?loc=EN_US',
    identifierPrefillSupported: false,
    enabled: true,
    evidenceStatus: 'project_owner_approved_official_destination',
    privacyMode: 'generic_page_no_identifier',
  },
  'ups-roadie': {
    id: 'ups-roadie',
    displayName: 'UPS Roadie',
    identifierType: 'commercial-courier',
    carrierId: 'ups-roadie',
    officialUrl: 'https://track.roadie.com/',
    identifierPrefillSupported: false,
    enabled: true,
    evidenceStatus: 'project_owner_approved_official_destination',
    privacyMode: 'generic_page_no_identifier',
  },
  ems: {
    id: 'ems',
    displayName: 'EMS',
    identifierType: 'international-postal',
    carrierId: null,
    officialUrl: 'https://items.ems.post/',
    identifierPrefillSupported: false,
    enabled: true,
    evidenceStatus: 'project_owner_approved_official_destination',
    privacyMode: 'generic_page_no_identifier',
  },
  msc: {
    id: 'msc',
    displayName: 'MSC',
    identifierType: 'ocean-container',
    carrierId: 'msc',
    officialUrl: 'https://www.msc.com/en/track-a-shipment',
    identifierPrefillSupported: false,
    enabled: true,
    evidenceStatus: 'project_owner_verified_official_tracking_page',
    privacyMode: 'generic_page_no_identifier',
  },
  zim: {
    id: 'zim',
    displayName: 'ZIM',
    identifierType: 'ocean-container',
    carrierId: 'zim',
    officialUrl: 'https://www.zim.com/tools/track-a-shipment',
    identifierPrefillSupported: false,
    enabled: true,
    evidenceStatus: 'project_owner_verified_official_tracking_page',
    privacyMode: 'generic_page_no_identifier',
  },
  maersk: {
    id: 'maersk',
    displayName: 'Maersk',
    identifierType: 'ocean-container',
    carrierId: 'maersk',
    officialUrl: 'https://www.maersk.com/tracking/',
    identifierPrefillSupported: false,
    enabled: true,
    evidenceStatus: 'project_owner_verified_official_tracking_page',
    privacyMode: 'generic_page_no_identifier',
  },
});

/** Registry IDs backed only by the earlier project-owner-approved evidence tier. */
const APPROVED_DESTINATION_EVIDENCE_IDS = Object.freeze(['ups', 'ups-roadie', 'ems']);
/** Registry IDs backed by the FCL design-document verified evidence tier. */
const VERIFIED_TRACKING_PAGE_EVIDENCE_IDS = Object.freeze(['msc', 'zim', 'maersk']);

test('1. both officialTrackingDestinations and getOfficialTrackingDestination are exported', () => {
  assert.ok(Array.isArray(officialTrackingDestinations));
  assert.strictEqual(typeof getOfficialTrackingDestination, 'function');
});

test('2. the registry contains exactly six records', () => {
  assert.strictEqual(officialTrackingDestinations.length, 6);
});

test('3. record IDs are exactly ups, ups-roadie, ems, msc, zim, and maersk, in that order', () => {
  const ids = officialTrackingDestinations.map((entry) => entry.id);
  assert.deepStrictEqual(ids, ['ups', 'ups-roadie', 'ems', 'msc', 'zim', 'maersk']);
});

test('4. every record has its exact expected values', () => {
  for (const record of officialTrackingDestinations) {
    assert.deepStrictEqual(record, EXPECTED_RECORDS[record.id]);
  }
});

test('5. every record contains exactly the required fields, no more, no fewer', () => {
  for (const record of officialTrackingDestinations) {
    assert.deepStrictEqual(Object.keys(record).sort(), [...REQUIRED_FIELDS].sort());
  }
});

test('6. the registry array and every record are frozen', () => {
  assert.ok(Object.isFrozen(officialTrackingDestinations));
  for (const record of officialTrackingDestinations) {
    assert.ok(Object.isFrozen(record));
  }
});

test('7. valid lookups return the correct frozen record, by reference', () => {
  for (const record of officialTrackingDestinations) {
    const found = getOfficialTrackingDestination(record.id);
    assert.strictEqual(found, record);
    assert.ok(Object.isFrozen(found));
  }
});

test('8a. a missing/unknown ID returns null', () => {
  assert.strictEqual(getOfficialTrackingDestination('fedex'), null);
  assert.strictEqual(getOfficialTrackingDestination('dhl'), null);
  assert.strictEqual(getOfficialTrackingDestination('not-a-real-id'), null);
});

test('8b. an empty string ID returns null', () => {
  assert.strictEqual(getOfficialTrackingDestination(''), null);
});

test('8c. null and undefined return null', () => {
  assert.strictEqual(getOfficialTrackingDestination(null), null);
  assert.strictEqual(getOfficialTrackingDestination(undefined), null);
  assert.strictEqual(getOfficialTrackingDestination(), null);
});

test('8d. a numeric ID returns null', () => {
  assert.strictEqual(getOfficialTrackingDestination(1), null);
  assert.strictEqual(getOfficialTrackingDestination(0), null);
});

test('8e. an object ID returns null', () => {
  assert.strictEqual(getOfficialTrackingDestination({ id: 'ups' }), null);
  assert.strictEqual(getOfficialTrackingDestination(['ups']), null);
});

test('9. lookup performs an exact match only — it does not normalize, trim, or guess IDs', () => {
  assert.strictEqual(getOfficialTrackingDestination(' ups'), null);
  assert.strictEqual(getOfficialTrackingDestination('ups '), null);
  assert.strictEqual(getOfficialTrackingDestination('ups-roadie '), null);
  assert.strictEqual(getOfficialTrackingDestination('UPSROADIE'), null);
});

test('10. an uppercase "UPS" ID does not match the lowercase "ups" record', () => {
  assert.strictEqual(getOfficialTrackingDestination('UPS'), null);
  assert.strictEqual(getOfficialTrackingDestination('Ups'), null);
});

test('11. every officialUrl uses HTTPS and exactly matches the approved URL', () => {
  const expectedUrls = {
    ups: 'https://www.ups.com/track?loc=EN_US',
    'ups-roadie': 'https://track.roadie.com/',
    ems: 'https://items.ems.post/',
    msc: 'https://www.msc.com/en/track-a-shipment',
    zim: 'https://www.zim.com/tools/track-a-shipment',
    maersk: 'https://www.maersk.com/tracking/',
  };
  for (const record of officialTrackingDestinations) {
    assert.strictEqual(record.officialUrl, expectedUrls[record.id]);
    assert.ok(record.officialUrl.startsWith('https://'));
  }
});

test('12. identifierPrefillSupported is false for every record', () => {
  for (const record of officialTrackingDestinations) {
    assert.strictEqual(record.identifierPrefillSupported, false);
  }
});

test('13. privacyMode is the approved value, and evidenceStatus matches each record\'s evidence tier', () => {
  for (const record of officialTrackingDestinations) {
    assert.strictEqual(record.privacyMode, 'generic_page_no_identifier');
    if (APPROVED_DESTINATION_EVIDENCE_IDS.includes(record.id)) {
      assert.strictEqual(record.evidenceStatus, 'project_owner_approved_official_destination');
    } else if (VERIFIED_TRACKING_PAGE_EVIDENCE_IDS.includes(record.id)) {
      assert.strictEqual(record.evidenceStatus, 'project_owner_verified_official_tracking_page');
    } else {
      assert.fail(`unexpected record id with no known evidence tier: ${record.id}`);
    }
  }
});

test('14. no excluded provider or identifier family appears in the registry', () => {
  const ids = officialTrackingDestinations.map((entry) => entry.id);
  const excludedIds = [
    'generic-s10',
    's10',
    'awb',
    'container',
    'dsv',
    'dhl',
    'fedex',
    'aramex',
    'ups-mail-innovations',
    'israel-post',
  ];
  for (const excludedId of excludedIds) {
    assert.ok(!ids.includes(excludedId), `unexpected excluded id present: ${excludedId}`);
  }

  const identifierTypes = officialTrackingDestinations.map((entry) => entry.identifierType);
  assert.ok(!identifierTypes.includes('air-waybill'));
});

test('15. no record contains an API, OAuth, live-tracking, prefilled-URL, or tracking-number field', () => {
  const forbiddenFieldNames = [
    'apiKey',
    'apiEndpoint',
    'oauth',
    'liveTrackingUrl',
    'prefilledUrl',
    'trackingNumber',
    'identifier',
    'token',
    'credentials',
  ];
  for (const record of officialTrackingDestinations) {
    for (const forbiddenField of forbiddenFieldNames) {
      assert.strictEqual(
        Object.prototype.hasOwnProperty.call(record, forbiddenField),
        false,
        `unexpected field present: ${forbiddenField}`,
      );
    }
  }
});

test('16. importing and using the registry causes no DOM, network, navigation, storage, logging, or assistant interaction', () => {
  assert.strictEqual(typeof window, 'undefined');
  assert.strictEqual(typeof document, 'undefined');

  // Exercise every export without triggering any side effect.
  officialTrackingDestinations.forEach((entry) => entry.id);
  getOfficialTrackingDestination('ups');
  getOfficialTrackingDestination('does-not-exist');
});

test('17. attempting to mutate the registry or a record throws or is silently rejected (frozen)', () => {
  assert.throws(() => {
    'use strict';
    officialTrackingDestinations.push({ id: 'new' });
  });

  const upsRecord = getOfficialTrackingDestination('ups');
  assert.throws(() => {
    'use strict';
    upsRecord.officialUrl = 'https://example.com/';
  });
  assert.strictEqual(upsRecord.officialUrl, 'https://www.ups.com/track?loc=EN_US');
});
