/**
 * Conservative table-like text parsing for FreighTime's Smart Tracking
 * Import V2.
 *
 * Responsibility: recognize a header row (tab-, pipe-, or multiple-space
 * separated) whose columns match a known generic logistics vocabulary,
 * followed by one or more data rows using the same column separator, and
 * turn them into structured rows keyed by canonical field name. This is
 * the input `extract-events.js` uses to build an event timeline from a
 * pasted schedule/event table.
 *
 * Conservative by design (rule 16): a row is only interpreted when a
 * header row was clearly identified first (every header cell must match
 * the known vocabulary) and the row's column count is compatible with
 * the header. A row that does not fit safely ends the table block rather
 * than being guessed at.
 *
 * Performs no DOM/network/storage access and no logging.
 */

/** Header-cell text (lowercased) to canonical field key. */
const HEADER_FIELD_MAP = Object.freeze({
  vessel: 'vessel',
  'vessel name': 'vessel',
  'שם אונייה': 'vessel',
  אונייה: 'vessel',
  voyage: 'voyage',
  'voyage number': 'voyage',
  'מספר הפלגה': 'voyage',
  הפלגה: 'voyage',
  carrier: 'carrier',
  'חברת ספנות': 'carrier',
  pol: 'pol',
  'port of loading': 'pol',
  'נמל מוצא': 'pol',
  'נמל טעינה': 'pol',
  pod: 'pod',
  'port of discharge': 'pod',
  'נמל יעד': 'pod',
  'נמל פריקה': 'pod',
  etd: 'etd',
  'estimated time of departure': 'etd',
  'יציאה מתוכננת': 'etd',
  atd: 'atd',
  'actual time of departure': 'atd',
  'יציאה בפועל': 'atd',
  eta: 'eta',
  'estimated time of arrival': 'eta',
  'הגעה משוערת': 'eta',
  ata: 'ata',
  'actual time of arrival': 'ata',
  'הגעה בפועל': 'ata',
  event: 'event',
  אירוע: 'event',
  status: 'status',
  סטטוס: 'status',
  location: 'location',
  מיקום: 'location',
  date: 'date',
  'event date': 'date',
  תאריך: 'date',
  time: 'time',
  שעה: 'time',
  flight: 'flight',
  טיסה: 'flight',
  'מספר טיסה': 'flight',
  origin: 'origin',
  'שדה מוצא': 'origin',
  destination: 'destination',
  'שדה יעד': 'destination',
  description: 'description',
});

/** Try splitting a line into columns with each of the supported column separators, in priority order. */
function splitColumns(line) {
  if (line.includes('\t')) {
    const cells = line.split('\t').map((c) => c.trim()).filter((c) => c.length > 0);
    if (cells.length >= 2) return { cells, splitter: 'tab' };
  }
  if (line.includes('|')) {
    const cells = line.split('|').map((c) => c.trim()).filter((c) => c.length > 0);
    if (cells.length >= 2) return { cells, splitter: 'pipe' };
  }
  const spaceCells = line.split(/ {2,}/).map((c) => c.trim()).filter((c) => c.length > 0);
  if (spaceCells.length >= 2) return { cells: spaceCells, splitter: 'space' };
  return null;
}

function splitColumnsWith(line, splitter) {
  if (splitter === 'tab') {
    return line.split('\t').map((c) => c.trim()).filter((c) => c.length > 0);
  }
  if (splitter === 'pipe') {
    return line.split('|').map((c) => c.trim()).filter((c) => c.length > 0);
  }
  return line.split(/ {2,}/).map((c) => c.trim()).filter((c) => c.length > 0);
}

/** Map every header cell to a canonical field key; returns `null` if any cell is unrecognized (rule 16). */
function resolveHeaderFields(cells) {
  const fields = [];
  for (const cell of cells) {
    const key = HEADER_FIELD_MAP[cell.toLowerCase()];
    if (!key) {
      return null;
    }
    fields.push(key);
  }
  return fields;
}

function cellsEqualHeader(cells, headerCellsLower) {
  if (cells.length !== headerCellsLower.length) {
    return false;
  }
  return cells.every((cell, i) => cell.toLowerCase() === headerCellsLower[i]);
}

/**
 * Parse every table-like block out of a normalized line array.
 *
 * @param {ReadonlyArray<string>} lines - Normalized lines (raw `lines`, not `expandedLines` -- a table's multi-column rows are intentionally left unsplit by `split-combined-line.js`).
 * @returns {Readonly<{tables: ReadonlyArray<Readonly<{headerFields: ReadonlyArray<string>, rows: ReadonlyArray<Readonly<{valuesByField: Readonly<object>, sourceLineIndex: number}>>}>>}>}
 */
export function parseTables(lines) {
  const safeLines = Array.isArray(lines) ? lines : [];
  const tables = [];

  let i = 0;
  while (i < safeLines.length) {
    const line = safeLines[i];
    const split = typeof line === 'string' ? splitColumns(line) : null;
    if (!split || split.cells.length < 2) {
      i += 1;
      continue;
    }
    const headerFields = resolveHeaderFields(split.cells);
    if (!headerFields) {
      i += 1;
      continue;
    }

    const headerCellsLower = split.cells.map((c) => c.toLowerCase());
    const rows = [];
    let j = i + 1;
    while (j < safeLines.length) {
      const dataLine = safeLines[j];
      if (typeof dataLine !== 'string') break;
      const dataCells = splitColumnsWith(dataLine, split.splitter);
      if (dataCells.length < 2) break;

      if (cellsEqualHeader(dataCells, headerCellsLower)) {
        // Repeated header row: skip safely (rule 17), keep consuming the table.
        j += 1;
        continue;
      }

      if (dataCells.length !== headerFields.length && resolveHeaderFields(dataCells)) {
        // This "data row" is itself a valid header for a *different* table
        // structure (e.g. a second table immediately follows with no blank
        // line to separate them) -- end this block so the outer loop can
        // pick it up fresh as its own table, rather than swallowing it as a
        // malformed row of this one.
        break;
      }

      let effectiveCells = dataCells;
      if (dataCells.length > headerFields.length) {
        // Extra cells: merge the overflow into the last column rather than guessing which field they belong to.
        const head = dataCells.slice(0, headerFields.length - 1);
        const tail = dataCells.slice(headerFields.length - 1).join(' ');
        effectiveCells = [...head, tail];
      } else if (dataCells.length < headerFields.length) {
        // Fewer cells than the header: this row doesn't fit the table confidently -- end the block here.
        break;
      }

      const valuesByField = {};
      headerFields.forEach((fieldKey, idx) => {
        valuesByField[fieldKey] = effectiveCells[idx];
      });
      rows.push(Object.freeze({ valuesByField: Object.freeze(valuesByField), sourceLineIndex: j }));
      j += 1;
    }

    if (rows.length > 0) {
      tables.push(Object.freeze({ headerFields: Object.freeze(headerFields), rows: Object.freeze(rows) }));
      i = j;
    } else {
      i += 1;
    }
  }

  return Object.freeze({ tables: Object.freeze(tables) });
}
