import type { SportsEvent } from '../types';

export const SPORTS_GROUP_ORDER = [
  'Football',
  'Rugby',
  'Cricket',
  'Golf',
  'Tennis',
  'Combat Sports',
  'Motorsport',
  'Horse Racing',
  'Cycling',
  'Darts',
  'Hockey',
  'Snooker',
  'American Football',
  'Australian Rules',
  'Other Sports',
] as const;

export type SportsGroupName = typeof SPORTS_GROUP_ORDER[number];

const horseRacingTerms = /\b(horse racing|race day|race meeting)\b/i;
const rugbyTerms = /\b(rugby|nrl|super league|currie cup|hilux npc)\b/i;
const combatTerms = /\b(ufc|mma|boxing|fight night|one friday fights|one championship)\b/i;
const golfTerms = /\b(golf|pga|lpga|liv golf|british masters|tour championship)\b/i;
const tennisTerms = /\b(tennis|atp|wta|wimbledon|cincinnati open|national bank open)\b/i;
const cyclingTerms = /\b(cycling|vuelta a espana|tour de france|giro d'italia)\b/i;
const dartsTerms = /\b(darts)\b/i;
const hockeyTerms = /\b(ice hockey|hockey|shl)\b/i;
const snookerTerms = /\b(snooker)\b/i;
const americanFootballTerms = /\b(nfl|ncaa american football|american football)\b/i;
const australianRulesTerms = /\b(afl|australian rules)\b/i;

/**
 * Converts the dashboard's detailed sport labels into a shorter set of
 * customer-facing groups. Existing records are classified at render time, so
 * this does not require a migration or any change to the CSV format.
 */
export const sportsGroupFor = (
  event: Pick<SportsEvent, 'sport' | 'competition' | 'participants'>
): SportsGroupName => {
  const sport = event.sport.trim().toLowerCase();

  if (sport === 'football') return 'Football';
  if (['rugby', 'rugby union', 'rugby league', 'nrl'].includes(sport)) return 'Rugby';
  if (['ufc / mma', 'ufc', 'mma', 'boxing', 'muay thai'].includes(sport)) {
    return 'Combat Sports';
  }
  if (sport === 'cricket') return 'Cricket';
  if (sport === 'golf') return 'Golf';
  if (sport === 'tennis') return 'Tennis';
  if (['motorsport', 'motor sport', 'motogp', 'formula 1'].includes(sport)) {
    return 'Motorsport';
  }
  if (sport === 'horse racing') return 'Horse Racing';
  if (sport === 'cycling') return 'Cycling';
  if (sport === 'darts') return 'Darts';
  if (sport === 'hockey' || sport === 'ice hockey') return 'Hockey';
  if (sport === 'snooker') return 'Snooker';
  if (sport === 'nfl') return 'American Football';
  if (sport === 'afl') return 'Australian Rules';

  const searchableText = `${event.sport} ${event.competition} ${event.participants}`;
  if (rugbyTerms.test(searchableText)) return 'Rugby';
  if (combatTerms.test(searchableText)) return 'Combat Sports';
  if (golfTerms.test(searchableText)) return 'Golf';
  if (tennisTerms.test(searchableText)) return 'Tennis';
  if (horseRacingTerms.test(searchableText)) return 'Horse Racing';
  if (cyclingTerms.test(searchableText)) return 'Cycling';
  if (dartsTerms.test(searchableText)) return 'Darts';
  if (hockeyTerms.test(searchableText)) return 'Hockey';
  if (snookerTerms.test(searchableText)) return 'Snooker';
  if (americanFootballTerms.test(searchableText)) return 'American Football';
  if (australianRulesTerms.test(searchableText)) return 'Australian Rules';

  return 'Other Sports';
};

const compareFixtures = (a: SportsEvent, b: SportsEvent) =>
  a.date.localeCompare(b.date) ||
  a.time.localeCompare(b.time) ||
  (a.order ?? 0) - (b.order ?? 0) ||
  a.participants.localeCompare(b.participants);

export interface SportsEventGroup {
  name: SportsGroupName;
  events: SportsEvent[];
  competitions: SportsCompetitionGroup[];
}

export interface SportsCompetitionGroup {
  name: string;
  events: SportsEvent[];
}

const groupByCompetition = (events: SportsEvent[]): SportsCompetitionGroup[] => {
  const grouped = new Map<string, SportsEvent[]>();

  events.forEach(event => {
    const competition = event.competition.trim() || 'Other fixtures';
    grouped.set(competition, [...(grouped.get(competition) || []), event]);
  });

  return [...grouped.entries()]
    .map(([name, competitionEvents]) => ({
      name,
      events: [...competitionEvents].sort(compareFixtures),
    }))
    .sort((a, b) => {
      if (a.name === 'Other fixtures') return 1;
      if (b.name === 'Other fixtures') return -1;
      return a.name.localeCompare(b.name);
    });
};

export const groupSportsEvents = (events: SportsEvent[]): SportsEventGroup[] => {
  const grouped = new Map<SportsGroupName, SportsEvent[]>();

  events.forEach(event => {
    const group = sportsGroupFor(event);
    grouped.set(group, [...(grouped.get(group) || []), event]);
  });

  return SPORTS_GROUP_ORDER.flatMap(name => {
    const groupEvents = grouped.get(name);
    const sortedEvents = groupEvents?.length ? [...groupEvents].sort(compareFixtures) : [];
    return sortedEvents.length
      ? [{ name, events: sortedEvents, competitions: groupByCompetition(sortedEvents) }]
      : [];
  });
};
