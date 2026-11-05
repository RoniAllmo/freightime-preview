/**
 * HS6 -> family -> risk-flag lookup for the B2B API (PRODUCT_SPEC.md
 * §0.3, §0.5.3 and §0.5.4). Pure functions with no dependencies, so the
 * suite can test them without installing Express.
 *
 * Client inputs are client data whose retention and logging policy is
 * still open (PRODUCT_SPEC.md §0.8): nothing here stores or logs them.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DATABASE_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../../data/api/families.json');
export const IMPORT_TYPES = Object.freeze(['commercial', 'personal']);
export const DISCLAIMER =
  'Risk indication only: goods under this heading in Israel often require the approvals listed, under the stated conditions. This is not a customs classification, an import approval or legal advice. Data verified by a licensed Israeli customs broker on 2026-11-05.';
export const NO_MATCH_NOTE =
  'No product family was recognized for this HS6 code. This does not mean the goods have no requirement.';

// Most specific first: an exact subheading beats a heading, which beats a range.
const MATCH_RANK = Object.freeze({ exact: 1, partial: 2, heading: 3, heading_range: 4 });

// The personal-use exemption covers the standards approval only
// (registry rule 50); a flag from any other authority still applies.
export const STANDARDS_AUTHORITIES = Object.freeze(['Standards Institution of Israel (SII)', 'Standards (authority not named)']);

export function loadDatabase(path = DATABASE_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** True when the 6-digit `hs6` falls under one mapped code entry. */
export function codeMatches(entry, hs6) {
  const heading = Number(hs6.slice(0, 4));
  switch (entry.match) {
    case 'exact':
    case 'partial':
      return entry.code.replace('.', '') === hs6;
    case 'heading':
      return entry.code.slice(0, 4) === hs6.slice(0, 4);
    case 'heading_range': {
      const [from, to] = entry.code.split('-').map(Number);
      return heading >= from && heading <= to;
    }
    default:
      return false;
  }
}

function riskFlag(requirement, personal, exempt) {
  const flag = {
    requirement_type: requirement.requirement_type,
    document: requirement.document ? requirement.document.en : null,
    authority: requirement.authority.en,
    applies_when: requirement.applies_when ? requirement.applies_when.en : null,
    verification_status: requirement.verification_status,
  };
  if (personal) flag.applies_in_personal_import = !exempt || !STANDARDS_AUTHORITIES.includes(requirement.authority.en);
  return flag;
}

// A requirement limited to listed codes (`applies_to`) is dropped only
// when the query resolved exactly to a different code of the family; on
// a heading or range match the code is not resolved, so it stays.
function appliesToMatch(requirement, entry) {
  if (requirement.applies_to === 'all_codes_in_family') return true;
  if (entry.match !== 'exact' && entry.match !== 'partial') return true;
  return requirement.applies_to.includes(entry.code);
}

function toMatch(family, entry, personal) {
  const exempt = family.personal_import.commercial_exemption_applies;
  const match = {
    family_id: family.family_id,
    family_name: family.name,
    match_method: 'hs6',
    hs_match: { code: entry.code, match: entry.match, description: entry.description },
    risk_flags: family.requirements.filter((r) => appliesToMatch(r, entry)).map((r) => riskFlag(r, personal, exempt)),
  };
  if (personal) match.personal_import = family.personal_import;
  return match;
}

/**
 * Answers one compliance query. Returns `{ status, body }` so any HTTP
 * layer can send it unchanged.
 */
export function lookupCompliance(db, query) {
  const hs6 = typeof query.hs6 === 'string' ? query.hs6.replace(/[.\s]/g, '') : '';
  const importType = query.import_type === undefined || query.import_type === '' ? 'commercial' : query.import_type;
  if (!/^\d{6}$/.test(hs6)) {
    return { status: 400, body: { error: 'invalid_hs6', message: 'Send hs6 as a 6-digit HS code, e.g. hs6=902214.' } };
  }
  if (!IMPORT_TYPES.includes(importType)) {
    return { status: 400, body: { error: 'invalid_import_type', message: 'import_type must be "commercial" or "personal".' } };
  }
  const personal = importType === 'personal';
  const matches = [];
  for (const family of db.families) {
    const hits = family.hs_mapping.codes.filter((entry) => codeMatches(entry, hs6));
    if (hits.length === 0) continue;
    const best = hits.sort((a, b) => MATCH_RANK[a.match] - MATCH_RANK[b.match])[0];
    matches.push(toMatch(family, best, personal));
  }
  matches.sort((a, b) => MATCH_RANK[a.hs_match.match] - MATCH_RANK[b.hs_match.match]);
  const body = {
    input: { hs6, import_type: importType },
    schema_version: db.schema_version,
    hs_version: db.hs_version,
    matches,
    disclaimer: DISCLAIMER,
  };
  if (matches.length === 0) body.note = NO_MATCH_NOTE;
  return { status: 200, body };
}
