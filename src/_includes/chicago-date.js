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
export function deadlineStillOpen(expiresOn, today = new Date()) {
  const day = today instanceof Date ? chicagoDate(today) : today;
  return !(expiresOn && expiresOn < day);
}
