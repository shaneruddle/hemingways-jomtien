import { describe, expect, it } from 'vitest';

import { planImport, SPORT_OPTIONS, validateRowFields, type ImportRow } from './sportsImport';
import type { SportsEvent } from '../types';

const CANONICAL_SPORTS = [
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

describe('sports import category vocabulary', () => {
  it('matches the canonical Monday CSV sport list', () => {
    expect(SPORT_OPTIONS).toEqual(CANONICAL_SPORTS);
  });

  it.each(CANONICAL_SPORTS)('accepts %s without a category warning', sport => {
    const result = validateRowFields({
      date: '2026-08-29',
      time: '18:00',
      sport,
      competition: 'Example competition',
      participants: 'Example fixture',
      display_order: '10',
      source_id: `example-${sport}`,
    });

    expect(result).toEqual({ status: 'valid', issues: [] });
  });

  it('blocks non-canonical sports instead of saving a new label', () => {
    const result = validateRowFields({
      date: '2026-08-29',
      time: '18:00',
      sport: 'Soccer',
      competition: 'Premier League',
      participants: 'Example fixture',
      display_order: '10',
      source_id: 'example-soccer',
    });

    expect(result.status).toBe('error');
    expect(result.issues[0]).toContain('Unsupported sport "Soccer"');
  });
});

describe('replace import scope', () => {
  const row = (date: string, participants: string, sourceId: string): ImportRow => ({
    rowNumber: 1,
    date,
    time: '18:00',
    sport: 'Football',
    competition: 'Premier League',
    participants,
    display_order: '10',
    source_id: sourceId,
    status: 'valid',
    issues: [],
    excluded: false,
  });

  const event = (id: string, date: string, participants: string, sourceId: string): SportsEvent => ({
    id,
    date,
    time: '18:00',
    sport: 'Football',
    competition: 'Premier League',
    participants,
    order: 10,
    source_id: sourceId,
  });

  it('deletes unmatched fixtures only on exact dates represented by the CSV', () => {
    const rows = [
      row('2026-08-29', 'Kept Saturday fixture', 'keep-sat'),
      row('2026-08-31', 'Kept Monday fixture', 'keep-mon'),
    ];
    const existing = [
      event('1', '2026-08-29', 'Kept Saturday fixture', 'keep-sat'),
      event('2', '2026-08-29', 'Old Saturday fixture', 'delete-sat'),
      event('3', '2026-08-30', 'Sunday fixture absent from CSV', 'keep-sun'),
      event('4', '2026-08-31', 'Kept Monday fixture', 'keep-mon'),
    ];

    const plan = planImport(rows, existing, 'replace', ['2026-08-29', '2026-08-31']);

    expect(plan.toDelete.map(item => item.id)).toEqual(['2']);
  });
});
