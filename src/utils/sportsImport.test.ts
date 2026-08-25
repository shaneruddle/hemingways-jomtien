import { describe, expect, it } from 'vitest';

import { SPORT_OPTIONS, validateRowFields } from './sportsImport';

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
});
