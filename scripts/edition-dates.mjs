// Edition dates are the bulletin file name and `date:` front matter. Eleventy
// stores those as UTC midnight. Format that calendar day in UTC. America/Chicago
// would print the previous evening. Clock-derived "today" belongs in chicago-time.mjs.

const EDITION_ZONE = "UTC";

function editionDate(value) {
  return new Date(value);
}

export function readableDate(value) {
  return editionDate(value).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: EDITION_ZONE
  });
}

export function monthDay(value) {
  return editionDate(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: EDITION_ZONE
  });
}

export function weekdayName(value) {
  return editionDate(value).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: EDITION_ZONE
  });
}

export function longDate(value) {
  return editionDate(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: EDITION_ZONE
  });
}

export function isoDate(value) {
  return editionDate(value).toISOString().slice(0, 10);
}

const SHORT_MONTHS = ["Jan.", "Feb.", "March", "April", "May", "June",
  "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];

export function shortMonthDay(value) {
  const date = editionDate(value);
  return `${SHORT_MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

// Weekday plus month and day. The day number stays with the month so a
// narrow line cannot leave "4" alone.
export function archiveDate(value) {
  const monthDay = shortMonthDay(value).replace(/ (?=\d+$)/, "\u00a0");
  return `${weekdayName(value)}, ${monthDay}`;
}

const STRIP_WEEKDAYS = ["Sun.", "Mon.", "Tue.", "Wed.", "Thu.", "Fri.", "Sat."];

// "Tue., Nov. 10, 2026". The day number stays with the month.
export function stripDate(value) {
  const date = editionDate(value);
  const month = SHORT_MONTHS[date.getUTCMonth()];
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  return `${STRIP_WEEKDAYS[date.getUTCDay()]}, ${month}\u00a0${day}, ${year}`;
}

// Dates and clock times stay on one line: "Nov. 10", "9 a.m."
export function tightTokens(value) {
  return String(value ?? "")
    .replace(/\b([A-Z][a-z]{2,8}\.) (\d)/g, "$1\u00a0$2")
    .replace(/\b(\d{1,2}(?::\d{2})?) (a\.m\.|p\.m\.)/g, "$1\u00a0$2")
    .replace(/\bitem (\d+)/g, "item\u00a0$1");
}
