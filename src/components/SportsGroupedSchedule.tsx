import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SportsEvent } from '../types';
import {
  groupSportsEvents,
  type SportsGroupName,
} from '../utils/sportsGrouping';

type SportsFilter = 'All' | SportsGroupName;

const formatFixtureDate = (iso: string) => {
  const dt = new Date(`${iso}T00:00:00`);
  if (isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

const FixtureRow = ({ event, today }: { event: SportsEvent; today: string }) => (
  <div className="sports-fixture-row">
    <div className="sports-fixture-when">
      <div className="sports-fixture-time">{event.time}</div>
      <div className="sports-fixture-date">{event.date === today ? 'Today' : formatFixtureDate(event.date)}</div>
      <div className="sports-fixture-zone">Thailand time</div>
    </div>

    <div className="sports-fixture-copy">
      <div className="sports-fixture-name">{event.participants}</div>
      <div className="sports-fixture-sport">{event.sport}</div>
    </div>

    {event.date === today && (
      <span className="hw-badge hw-badge-live sports-fixture-today">
        <span className="hw-pulse sports-fixture-pulse" />
        Today
      </span>
    )}
  </div>
);

export const SportsGroupedSchedule = ({
  events,
  today,
}: {
  events: SportsEvent[];
  today: string;
}) => {
  const [activeFilter, setActiveFilter] = useState<SportsFilter>('All');
  const groups = useMemo(() => groupSportsEvents(events), [events]);
  const visibleGroups = activeFilter === 'All'
    ? groups
    : groups.filter(group => group.name === activeFilter);

  if (groups.length === 0) {
    return (
      <p className="sports-empty-state">
        No fixtures posted yet — check back soon, or ask us about your match below.
      </p>
    );
  }

  return (
    <div>
      <div className="sports-filter-heading">
        <div>
          <div className="sports-filter-eyebrow">Browse the schedule</div>
          <h2 className="sports-filter-title">Fixtures by sport</h2>
        </div>
        <div className="sports-filter-count">
          {events.length} fixture{events.length === 1 ? '' : 's'} · {groups.length} sport group{groups.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="sports-filter-list" role="group" aria-label="Filter fixtures by sport">
        {(['All', ...groups.map(group => group.name)] as SportsFilter[]).map(filter => (
          <button
            key={filter}
            type="button"
            className={`sports-filter-button${activeFilter === filter ? ' is-active' : ''}`}
            aria-pressed={activeFilter === filter}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
            {filter !== 'All' && (
              <span className="sports-filter-button-count">
                {groups.find(group => group.name === filter)?.events.length || 0}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="sports-groups">
        {visibleGroups.map(group => (
          <details className="sports-group" key={group.name} open>
            <summary className="sports-group-summary">
              <span>{group.name}</span>
              <span className="sports-group-summary-meta">
                {group.events.length} fixture{group.events.length === 1 ? '' : 's'}
                <ChevronDown className="sports-group-chevron" size={18} aria-hidden="true" />
              </span>
            </summary>
            <div className="sports-competitions">
              {group.competitions.map(competition => (
                <details className="sports-competition" key={competition.name} open>
                  <summary className="sports-competition-summary">
                    <span>{competition.name}</span>
                    <span className="sports-competition-summary-meta">
                      {competition.events.length} fixture{competition.events.length === 1 ? '' : 's'}
                      <ChevronDown className="sports-competition-chevron" size={16} aria-hidden="true" />
                    </span>
                  </summary>
                  <div className="sports-group-fixtures">
                    {competition.events.map((event, index) => (
                      <FixtureRow key={event.id || `${event.date}-${event.time}-${index}`} event={event} today={today} />
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
};
