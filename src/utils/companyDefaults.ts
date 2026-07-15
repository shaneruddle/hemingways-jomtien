import type { CompanyProfile } from '../types';

/**
 * Single source of truth for fallback business info, used only before the
 * Company Profile has loaded (or for a field left genuinely blank).
 *
 * Previously this same fallback text was copy-pasted independently across
 * App.tsx, Reservation.tsx and googlePlaces.ts, and one of those copies had
 * drifted to a different street ("Jomtien Sai 2 Rd") than the dashboard's own
 * initial record ("414/21 Thappraya Rd..."), which is the address
 * inconsistency this file exists to prevent from recurring.
 */
export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  name: "Hemingways Jomtien",
  address: "414/21 Thappraya Rd, Pattaya City, Bang Lamung District, Chon Buri 20150",
  description: "Jomtien's biggest expat sports bar and restaurant. Quality food, cold beer, and all your favourite sports on 15 screens.",
  phone: "+66 64 620 9225",
  whatsapp: "",
  lineId: "",
  email: "info@hemingwaysjomtien.com",
  googlePlaceId: "ChIJ5_lFroqWAjER6HN3niniP9o",
  mapEmbedUrl: "",
  openingHours: {
    monday: "9:30 AM – 12:00 AM",
    tuesday: "9:30 AM – 12:00 AM",
    wednesday: "9:30 AM – 12:00 AM",
    thursday: "9:30 AM – 12:00 AM",
    friday: "9:30 AM – 12:00 AM",
    saturday: "9:30 AM – 12:00 AM",
    sunday: "9:30 AM – 12:00 AM",
  },
  socialLinks: {
    facebook: "https://www.facebook.com/hemingwaysjomtien",
    instagram: "https://www.instagram.com/hemingwaysjomtien",
    tripAdvisor: "",
  },
  updatedAt: '',
};

const DAY_ORDER: (keyof CompanyProfile['openingHours'])[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

/**
 * Formats a stored phone/WhatsApp number into a readable Thai international
 * form, e.g. "+6664620922 5" / "0646209225" -> "+66 64 620 9225". Falls back
 * to the raw value untouched if it doesn't look like a Thai number, so an
 * intentionally different format never gets mangled.
 */
export function formatPhoneDisplay(raw: string | undefined | null): string {
  if (!raw || !raw.trim()) return DEFAULT_COMPANY_PROFILE.phone;
  const cleaned = raw.replace(/[^\d+]/g, '');

  let national = cleaned;
  if (national.startsWith('+66')) national = national.slice(3);
  else if (national.startsWith('0066')) national = national.slice(4);
  else if (national.startsWith('+')) return raw.trim(); // different country code — leave as-is
  else if (national.startsWith('0')) national = national.slice(1);

  if (!/^\d{8,9}$/.test(national)) return raw.trim(); // doesn't look like a TH number

  const groups = national.length === 9
    ? [national.slice(0, 2), national.slice(2, 5), national.slice(5)]
    : [national.slice(0, 1), national.slice(1, 4), national.slice(4)];
  return `+66 ${groups.join(' ')}`;
}

/** Digits only (with leading +), for tel:/wa.me links. */
export function phoneDigits(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw.replace(/[^\d]/g, '');
}

/**
 * Collapses the per-day opening hours from Company Profile into the compact
 * "Open Daily · X" line used across the site, or "Open Today · X" if the
 * days actually differ, so that line reflects the real dashboard-configured
 * hours instead of a hard-coded constant.
 */
export function formatOpeningHoursSummary(hours: CompanyProfile['openingHours'] | undefined | null): string {
  const h = hours || DEFAULT_COMPANY_PROFILE.openingHours;
  const values = DAY_ORDER.map(d => (h[d] || '').trim());
  if (values[0] && values.every(v => v === values[0])) {
    return `Open Daily · ${values[0]}`;
  }

  const todayKey = new Date()
    .toLocaleDateString('en-US', { timeZone: 'Asia/Bangkok', weekday: 'long' })
    .toLowerCase() as keyof CompanyProfile['openingHours'];
  const todayHours = h[todayKey];
  return todayHours ? `Open Today · ${todayHours}` : 'See opening hours below';
}
