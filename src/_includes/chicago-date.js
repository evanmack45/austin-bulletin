// Reader-facing "today" is the America/Chicago calendar day. After 7 p.m.
// Central, UTC is already the next date. A build then must not flip the day.
// Lives under src/ so a fixture that copies only src/ can import it.

export const CHICAGO = "America/Chicago";

export function chicagoDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const value = (type) => parts.find((part) => part.type === type).value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

// expiresOn is an inclusive Chicago calendar day (YYYY-MM-DD). Pass a Date
// to read the clock, or a YYYY-MM-DD string that is already a Chicago day.
export function centralTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO,
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value ?? "";
  const suffix = part("dayPeriod").toLowerCase().startsWith("a") ? "a.m." : "p.m.";
  return `${part("hour")}:${part("minute")} ${suffix}`;
}

export function deadlineStillOpen(expiresOn, today = new Date()) {
  const day = today instanceof Date ? chicagoDate(today) : today;
  return !(expiresOn && expiresOn < day);
}

const DAY_MS = 86400000;

function isoParts(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ""));
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

// Whole Chicago calendar days from `today` to `target`. A Date is read in
// America/Chicago. A YYYY-MM-DD string is already a Chicago day.
export function daysUntil(target, today = new Date()) {
  const start = isoParts(today instanceof Date ? chicagoDate(today) : today);
  const end = isoParts(target);
  if (start === null || end === null) return null;
  return Math.round((end - start) / DAY_MS);
}

// "2 days" while the date is still ahead, "Today" on that Chicago day,
// and "" once the date has passed so the glyph can be left off the card.
export function countdownGlyph(target, today = new Date()) {
  const days = daysUntil(target, today);
  if (days === null || days < 0) return "";
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}
