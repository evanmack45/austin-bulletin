import { chicagoDate } from "./chicago-date.js";

// Reader-facing "today" is the America/Chicago calendar day.
export function chicagoToday(now = new Date()) {
  return now instanceof Date ? chicagoDate(now) : now;
}

// Keep items whose YYYY-MM-DD is today or later in Chicago.
export function upcomingOnly(items, today = chicagoToday()) {
  const day = today instanceof Date ? chicagoToday(today) : String(today);
  return items.filter((item) => item.date >= day);
}
