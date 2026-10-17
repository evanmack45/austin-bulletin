// Voter module window and official links for the November 2026 election.
// This file exposes global data used by templates, including whether to
// surface a navigation link during the election window.
//
// Dates verified 2026-10-04; official links checked in local Chrome:
// - Texas SOS: 2026 November General Election — Tuesday, Nov 3, 2026
// - Registration deadline: Monday, Oct 5, 2026 (postmarked/received)
// - Early voting: Mon, Oct 19 – Fri, Oct 30, 2026
// - Travis County Elections (VoteTravis.gov) calendar confirms same
//
// The nav link displays from Sep 15 through Nov 4, 2026 (inclusive).
// Static builds run daily; this date gate makes the link appear only
// near and during the election period and then naturally disappear.
export default {
  window: {
    start: "2026-09-15",
    registrationDeadline: "2026-10-05",
    earlyVoteStart: "2026-10-19",
    earlyVoteEnd: "2026-10-30",
    electionDay: "2026-11-03",
    end: "2026-11-04"
  },
  links: {
    voteTexasHome: "https://www.votetexas.gov/",
    register: "https://www.votetexas.gov/register-to-vote/",
    myVoterPortal: "https://goelect.txelections.civixapps.com/ivis-mvp-ui/#/login",
    travisCurrentElection: "https://votetravis.gov/current-election-information/current-election/",
    registrationInstructions: "https://www.votetexas.gov/register-to-vote/update-voter-registration.html",
    cityVoterResources: "https://www.austintexas.gov/voterresources",
    travisRegistrationDeadline: "https://tax-office.traviscountytx.gov/about-us/newsroom/2026/272-voter-registration-ends-monday-for-nov-3-election",
    travisHome: "https://votetravis.gov/",
    earlyVotingFAQ: "https://www.votetexas.gov/faq/early-voting.html",
    registrationFAQ: "https://www.votetexas.gov/faq/registration.html",
    earlyVotingSites: "https://votetravis.gov/wp-content/uploads/G26-Early-Voting-Flyer-9.21.pdf",
    electionDaySites: "https://votetravis.gov/wp-content/uploads/G26-Election-Day-Flyer-FINAL-Website-wNotice.pdf",
    consolidatedBallot: "https://votetravis.gov/wp-content/uploads/G26-Bedsheet-Ballot-Corrected-Final2.pdf",
    voterIdTexas: "https://www.votetexas.gov/voting/need-id.html",
    voterIdTravis: "https://votetravis.gov/voter-information/voter-id-requirements/",
    atThePolls: "https://www.votetexas.gov/voting/allowed-at-the-polling-place.html",
    curbside: "https://www.votetexas.gov/voting/curbside-voting.html",
    ballotByMail: "https://votetravis.gov/voter-information/ballot-by-mail/"
  },
  showNav: (() => {
    const today = new Date();
    const start = new Date("2026-09-15T00:00:00-05:00"); // CDT
    const end = new Date("2026-11-05T00:00:00-06:00");   // CST, day after
    return today >= start && today < end;
  })()
};

