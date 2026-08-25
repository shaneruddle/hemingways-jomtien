import { SportsEvent } from '../types';

// Kept here (rather than duplicated in SportsDashboard.tsx) so the importer
// validates against the same list the manual Add/Edit Fixture form uses.
export const SPORT_OPTIONS = [
  'Football',
  'Rugby',
  'Cricket',
  'Golf',
  'Tennis',
  'Boxing',
  'UFC / MMA',
  'Muay Thai',
  'Motorsport',
  'Horse Racing',
  'Cycling',
  'Darts',
  'Hockey',
  'Snooker',
  'American Football',
  'Australian Rules',
  'Other',
];

export const IMPORT_CSV_COLUMNS = [
  'date', 'time', 'sport', 'competition', 'participants', 'display_order', 'source_id',
] as const;

export const REQUIRED_CSV_COLUMNS = ['date', 'time', 'sport', 'participants'] as const;

/** Quick top-level check so a wrong/renamed header row surfaces one clear message instead of one error per row. */
export function getMissingRequiredHeaders(text: string): string[] {
  const table = parseCsv(text);
  if (table.length === 0) return [...REQUIRED_CSV_COLUMNS];
  const header = table[0].map(h => h.trim().toLowerCase());
  return REQUIRED_CSV_COLUMNS.filter(col => !header.includes(col));
}

export type ImportRowStatus = 'valid' | 'warning' | 'error';

export interface ImportRow {
  rowNumber: number; // 1-based, matching the CSV line (excluding header) for error messages
  date: string;
  time: string;
  sport: string;
  competition: string;
  participants: string;
  display_order: string; // kept as the raw string for the editable preview; parsed on commit
  source_id: string;
  status: ImportRowStatus;
  issues: string[]; // human-readable problems; errors block import, warnings don't
  excluded: boolean; // user can manually exclude a row from the preview table
}

// ── CSV parsing (hand-rolled — the format is small and fully controlled by
// the Monday export, so we don't need a dependency for this) ──────────────
// Handles quoted fields, embedded commas/quotes ("" escaping), and both
// \n and \r\n line endings.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  // Flush the last field/row if the file doesn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully blank trailing lines.
  return rows.filter(r => r.some(cell => cell.trim() !== ''));
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const isRealDate = (iso: string): boolean => {
  if (!DATE_RE.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
};

type RowFields = Pick<ImportRow, 'date' | 'time' | 'sport' | 'competition' | 'participants' | 'display_order' | 'source_id'>;

/** Validates one row's fields. Shared by initial CSV parsing and by re-validation after an inline edit in the preview table. */
export function validateRowFields(fields: RowFields): { status: ImportRowStatus; issues: string[] } {
  const { date, time, sport, participants, display_order } = fields;

  const issues: string[] = [];
  if (!isRealDate(date)) issues.push(`Invalid date "${date || '(empty)'}" — expected YYYY-MM-DD`);
  if (!TIME_RE.test(time)) issues.push(`Invalid time "${time || '(empty)'}" — expected 24-hour HH:mm (Thailand time)`);
  if (!sport) issues.push('Sport is required');
  if (!participants) issues.push('Participants / fixture is required');
  if (display_order && !/^-?\d+$/.test(display_order)) issues.push(`Display order "${display_order}" is not a whole number`);

  const warnings: string[] = [];
  if (sport && !SPORT_OPTIONS.includes(sport)) {
    warnings.push(`Sport "${sport}" isn't one of the dashboard's usual labels (${SPORT_OPTIONS.join(', ')}) — will be saved as-is`);
  }

  const status: ImportRowStatus = issues.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid';
  return { status, issues: [...issues, ...warnings] };
}

/** Re-run validation on a row after an inline edit in the preview table. */
export function revalidateRow(row: ImportRow): ImportRow {
  return { ...row, ...validateRowFields(row) };
}

/** Parse raw CSV text into validated ImportRow objects. Never throws — bad rows are flagged, not dropped. */
export function parseImportCsv(text: string): ImportRow[] {
  const table = parseCsv(text);
  if (table.length === 0) return [];

  const header = table[0].map(h => h.trim().toLowerCase());
  const colIndex: Record<string, number> = {};
  IMPORT_CSV_COLUMNS.forEach(col => {
    const idx = header.indexOf(col);
    if (idx !== -1) colIndex[col] = idx;
  });

  const rows: ImportRow[] = [];
  for (let i = 1; i < table.length; i++) {
    const cells = table[i];
    const get = (col: typeof IMPORT_CSV_COLUMNS[number]) =>
      colIndex[col] !== undefined ? (cells[colIndex[col]] ?? '').trim() : '';

    const fields: RowFields = {
      date: get('date'),
      time: get('time'),
      sport: get('sport'),
      competition: get('competition'),
      participants: get('participants'),
      display_order: get('display_order'),
      source_id: get('source_id'),
    };

    rows.push({
      rowNumber: i, // header is row 0, so first data row is 1
      ...fields,
      ...validateRowFields(fields),
      excluded: false,
    });
  }
  return rows;
}

/** Normalized dedup key for rows without a source_id. */
export const normalizedFixtureKey = (
  f: Pick<SportsEvent, 'date' | 'time' | 'sport' | 'participants'>
): string =>
  `${f.date}|${f.time}|${f.sport.trim().toLowerCase()}|${f.participants.trim().toLowerCase()}`;

export interface ImportPlanRow {
  row: ImportRow;
  data: Omit<SportsEvent, 'id'>;
}

export interface ImportPlan {
  toAdd: ImportPlanRow[];
  toUpdate: { id: string; data: Omit<SportsEvent, 'id'>; row: ImportRow }[];
  toSkip: ImportPlanRow[]; // matched an existing fixture with no differences
  toDelete: SportsEvent[]; // Replace mode only: existing fixtures in-range not present in this upload
}

const toEventData = (row: ImportRow): Omit<SportsEvent, 'id'> => ({
  date: row.date,
  time: row.time,
  sport: row.sport,
  competition: row.competition,
  participants: row.participants,
  order: row.display_order ? parseInt(row.display_order, 10) : 0,
  ...(row.source_id ? { source_id: row.source_id } : {}),
});

const sameFixtureData = (a: Omit<SportsEvent, 'id'>, b: SportsEvent): boolean =>
  a.date === b.date && a.time === b.time && a.sport === b.sport &&
  a.competition === b.competition && a.participants === b.participants &&
  a.order === b.order && (a.source_id || '') === (b.source_id || '');

/**
 * Compute what an import will actually do, without writing anything.
 * - Merge: match by source_id first, else by normalized date+time+sport+participants.
 *   Matched + identical -> skip. Matched + different -> update. No match -> add.
 * - Replace: same add/update/skip matching, PLUS any existing fixture whose date
 *   falls inside [rangeStart, rangeEnd] and isn't matched by an uploaded row is
 *   queued for deletion. Fixtures outside the range are never touched.
 */
export function planImport(
  validRows: ImportRow[],
  existing: SportsEvent[],
  mode: 'merge' | 'replace',
  range?: { start: string; end: string }
): ImportPlan {
  const bySourceId = new Map<string, SportsEvent>();
  const byKey = new Map<string, SportsEvent>();
  existing.forEach(e => {
    if (e.source_id) bySourceId.set(e.source_id, e);
    byKey.set(normalizedFixtureKey(e), e);
  });

  const matchedIds = new Set<string>();
  const plan: ImportPlan = { toAdd: [], toUpdate: [], toSkip: [], toDelete: [] };

  // Track rows already staged as an add within THIS SAME upload (keyed the
  // same way as the existing-schedule lookups above), so a duplicate row
  // inside the CSV itself — same source_id, or same date+time+sport+
  // participants repeated by mistake — collapses into one document instead
  // of creating a second one. The later occurrence in the file wins.
  const addedBySourceId = new Map<string, number>(); // -> index into plan.toAdd
  const addedByKey = new Map<string, number>();

  for (const row of validRows) {
    const data = toEventData(row);
    const key = normalizedFixtureKey(data);
    const existingMatch = (row.source_id && bySourceId.get(row.source_id)) || byKey.get(key);

    if (existingMatch?.id) {
      matchedIds.add(existingMatch.id);
      if (sameFixtureData(data, existingMatch)) {
        plan.toSkip.push({ row, data });
      } else {
        plan.toUpdate.push({ id: existingMatch.id, data, row });
      }
      continue;
    }

    let dupIndex: number | undefined;
    if (row.source_id && addedBySourceId.has(row.source_id)) dupIndex = addedBySourceId.get(row.source_id);
    else if (addedByKey.has(key)) dupIndex = addedByKey.get(key);

    if (dupIndex !== undefined) {
      // Replacing this slot's row: drop ITS old identity from both maps
      // first (only if they still point at this slot — a shared source_id
      // may have already been reassigned by an earlier iteration). Without
      // this, a later row that happens to share the outgoing row's now-
      // stale key would wrongly match this slot and clobber the row we're
      // about to write here.
      const previous = plan.toAdd[dupIndex];
      if (previous.row.source_id && addedBySourceId.get(previous.row.source_id) === dupIndex) {
        addedBySourceId.delete(previous.row.source_id);
      }
      const previousKey = normalizedFixtureKey(previous.data);
      if (addedByKey.get(previousKey) === dupIndex) {
        addedByKey.delete(previousKey);
      }

      plan.toAdd[dupIndex] = { row, data };
      if (row.source_id) addedBySourceId.set(row.source_id, dupIndex);
      addedByKey.set(key, dupIndex);
    } else {
      const idx = plan.toAdd.push({ row, data }) - 1;
      if (row.source_id) addedBySourceId.set(row.source_id, idx);
      addedByKey.set(key, idx);
    }
  }

  if (mode === 'replace' && range && range.start && range.end && range.start <= range.end) {
    plan.toDelete = existing.filter(e =>
      !!e.id && !matchedIds.has(e.id) && e.date >= range.start && e.date <= range.end
    );
  }

  return plan;
}

export const dateRangeOf = (rows: ImportRow[]): { start: string; end: string } | null => {
  const dates = rows.map(r => r.date).filter(isRealDate).sort();
  if (dates.length === 0) return null;
  return { start: dates[0], end: dates[dates.length - 1] };
};

// ── Downloadable helpers ────────────────────────────────────────────────
const csvEscape = (v: string): string =>
  /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

const toCsvText = (rows: string[][]): string =>
  rows.map(r => r.map(csvEscape).join(',')).join('\r\n') + '\r\n';

export const CSV_TEMPLATE = toCsvText([[...IMPORT_CSV_COLUMNS]]);

export const CSV_EXAMPLE = toCsvText([
  [...IMPORT_CSV_COLUMNS],
  ['2026-07-25', '21:00', 'Football', 'Premier League', 'Liverpool vs Arsenal', '10', '20260725-football-liv-ars'],
  ['2026-07-26', '18:30', 'Rugby', 'Six Nations', 'Ireland vs France', '20', '20260726-rugby-ire-fra'],
  ['2026-07-26', '23:00', 'UFC / MMA', '', 'Fight Night: Main Card', '30', ''],
]);

export const downloadTextFile = (filename: string, content: string, mimeType = 'text/csv;charset=utf-8') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
