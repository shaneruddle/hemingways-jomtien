import { Special } from '../types';

/**
 * A Special is considered active unless explicitly set to false. This keeps
 * every pre-existing record (which has no isActive field at all) visible
 * immediately after this feature deploys — see Phase 2 handover, section 1.
 */
export const isSpecialActive = (special: Pick<Special, 'isActive'>): boolean =>
  special.isActive !== false;

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Today's day name in Thailand time (UTC+7), independent of the viewer's own timezone. */
export const bangkokDayName = (): string => {
  const bangkokMs = Date.now() + 7 * 60 * 60 * 1000;
  return DAYS[new Date(bangkokMs).getUTCDay()];
};

/**
 * A Special is scheduled for "today" if its day matches today's day name,
 * or it's Daily/Every Day, or it's Weekend and today is Saturday/Sunday.
 */
export const isSpecialScheduledToday = (
  special: Pick<Special, 'day'>,
  todayDayName: string = bangkokDayName()
): boolean =>
  special.day === todayDayName ||
  special.day === 'Daily' ||
  special.day === 'Every Day' ||
  (special.day === 'Weekend' && (todayDayName === 'Saturday' || todayDayName === 'Sunday'));

/** Combined public-visibility check: scheduled for today AND currently active. */
export const isSpecialVisibleToday = (
  special: Pick<Special, 'day' | 'isActive'>,
  todayDayName: string = bangkokDayName()
): boolean => isSpecialScheduledToday(special, todayDayName) && isSpecialActive(special);
