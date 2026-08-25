import { describe, expect, it } from 'vitest';
import type { SportsEvent } from '../types';
import { groupSportsEvents, sportsGroupFor } from './sportsGrouping';

const event = (overrides: Partial<SportsEvent>): SportsEvent => ({
  date: '2026-08-28',
  time: '20:00',
  sport: 'Football',
  competition: '',
  participants: 'Home vs Away',
  order: 0,
  ...overrides,
});

describe('sportsGroupFor', () => {
  it('combines boxing and MMA under Combat Sports', () => {
    expect(sportsGroupFor(event({ sport: 'Boxing' }))).toBe('Combat Sports');
    expect(sportsGroupFor(event({ sport: 'UFC / MMA' }))).toBe('Combat Sports');
  });

  it('recognises horse racing stored under Other', () => {
    expect(sportsGroupFor(event({
      sport: 'Other',
      competition: 'Australian Horse Racing',
      participants: 'Shown daily',
    }))).toBe('Horse Racing');
  });

  it('recognises rugby and fight competitions stored under Other', () => {
    expect(sportsGroupFor(event({
      sport: 'Other',
      competition: 'NRL',
      participants: 'Broncos vs Storm',
    }))).toBe('Rugby');
    expect(sportsGroupFor(event({
      sport: 'Other',
      competition: 'ONE Friday Fights 168',
      participants: 'ONE Friday Fights 168',
    }))).toBe('Combat Sports');
  });

  it('keeps major imported sports as their own customer-facing categories', () => {
    expect(sportsGroupFor(event({ sport: 'Golf' }))).toBe('Golf');
    expect(sportsGroupFor(event({ sport: 'Tennis' }))).toBe('Tennis');
    expect(sportsGroupFor(event({ sport: 'Cycling' }))).toBe('Cycling');
    expect(sportsGroupFor(event({ sport: 'Snooker' }))).toBe('Snooker');
  });

  it('recognises current import aliases', () => {
    expect(sportsGroupFor(event({ sport: 'MotoGP' }))).toBe('Motorsport');
    expect(sportsGroupFor(event({ sport: 'NRL' }))).toBe('Rugby');
    expect(sportsGroupFor(event({ sport: 'AFL' }))).toBe('Australian Rules');
    expect(sportsGroupFor(event({ sport: 'NFL' }))).toBe('American Football');
  });
});

describe('groupSportsEvents', () => {
  it('uses the intended group order and sorts fixtures by date and time', () => {
    const groups = groupSportsEvents([
      event({ sport: 'Cricket', date: '2026-08-29', time: '17:00', participants: 'Second' }),
      event({ sport: 'Rugby', date: '2026-08-28' }),
      event({ sport: 'Cricket', date: '2026-08-28', time: '21:00', participants: 'First' }),
    ]);

    expect(groups.map(group => group.name)).toEqual(['Rugby', 'Cricket']);
    expect(groups[1].events.map(item => item.participants)).toEqual(['First', 'Second']);
  });

  it('creates alphabetised competition subgroups within each sport', () => {
    const [football] = groupSportsEvents([
      event({ sport: 'Football', competition: 'German Bundesliga', participants: 'Dortmund vs Hamburg' }),
      event({ sport: 'Football', competition: 'English Premier League', participants: 'Liverpool vs Arsenal' }),
      event({ sport: 'Football', competition: 'English Premier League', participants: 'Chelsea vs Brighton' }),
    ]);

    expect(football.competitions.map(competition => competition.name)).toEqual([
      'English Premier League',
      'German Bundesliga',
    ]);
    expect(football.competitions[0].events).toHaveLength(2);
  });
});
