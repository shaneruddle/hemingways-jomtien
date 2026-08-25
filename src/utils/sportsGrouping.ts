import type { SportsEvent } from '../types';

export const SPORTS_GROUP_ORDER = [
  'Football',
  'Rugby',
  'Combat Sports',
  'Cricket',
  'Motorsport',
  'Racing',
  'Other Sports',
] as const;

export type SportsGroupName = typeof SPORTS_GROUP_ORDER[number];

const racingTerms = /\b(horse racing|racing|races|race day|race meeting)\b/i;
const rugbyTerms = /\b(rugby|nrl|super league|currie cup|hilux npc)\b/i;
const combatTerms = /\b(ufc|mma|boxing|fight night|one friday fights|one championship)\b/i;

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
  if (sport === 'rugby') return 'Rugby';
  if (sport === 'ufc / mma' || sport === 'ufc' || sport === 'mma' || sport === 'boxing') {
    return 'Combat Sports';
  }
  if (sport === 'cricket') return 'Cricket';
  if (sport === 'motorsport' || sport === 'motor sport' || sport === 'motogp' || sport === 'formula 1') {
    return 'Motorsport';
  }

  const searchableText = `${event.sport} ${event.competition} ${event.participants}`;
  if (rugbyTerms.test(searchableText)) return 'Rugby';
  if (combatTerms.test(searchableText)) return 'Combat Sports';
  if (racingTerms.test(searchableText)) return 'Racing';

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
}

export const groupSportsEvents = (events: SportsEvent[]): SportsEventGroup[] => {
  const grouped = new Map<SportsGroupName, SportsEvent[]>();

  events.forEach(event => {
    const group = sportsGroupFor(event);
    grouped.set(group, [...(grouped.get(group) || []), event]);
  });

  return SPORTS_GROUP_ORDER.flatMap(name => {
    const groupEvents = grouped.get(name);
    return groupEvents?.length
      ? [{ name, events: [...groupEvents].sort(compareFixtures) }]
      : [];
  });
};
