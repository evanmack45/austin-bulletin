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
