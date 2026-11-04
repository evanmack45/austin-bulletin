import { chicagoDate } from "./chicago-date.js";

export const electionWindow = {
  start: "2026-09-15",
  registrationDeadline: "2026-10-05",
  earlyVoteStart: "2026-10-19",
  earlyVoteEnd: "2026-10-30",
  electionDay: "2026-11-03",
  end: "2026-11-04"
};

export function electionNavOpen(now = new Date(), bounds = electionWindow) {
  const today = now instanceof Date ? chicagoDate(now) : now;
  return today >= bounds.start && today <= bounds.end;
}
