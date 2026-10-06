import { test } from "node:test";
import assert from "node:assert/strict";
import {
	chicagoDate,
	sourceHash,
	validateCuration,
	selectFrontpage,
} from "../scripts/frontpage.mjs";
const date = "2026-10-04",
	url = "/2026/10/04/";
const raw = "Source https://example.org/report";
const html =
	'<section class="big-story"><h3 id="park">The park restoration contract</h3><p>The city describes restoration work.</p><p class="source-line">Sources: <a href="https://example.org/report">City</a></p></section>';
const records = {
	[url]: { raw, html },
	"/vote-2026/": { raw, html },
	"/zilker-park-access/": { raw, html },
};
const item = (key, record = url) => ({
	key,
	record,
	sourceHash: sourceHash(raw),
	title: "A dated useful story",
	summary: "A reviewed factual summary.",
	asOf: "October 4, 2026",
	sources: [{ name: "City", url: "https://example.org/report" }],
	action: { label: "Read the record", url: record },
});
const bundle = () => ({
	date,
	reviewedAt: "2026-10-04T12:00:00Z",
	lead: { ...item("deadline", "/vote-2026/"), expiresOn: "2026-10-05" },
	access: item("park-access", "/zilker-park-access/"),
	developments: [item("school")],
	feature: item("park-contract"),
	goodThing: item("community"),
});
const select = (curation, today = date, r = records) =>
	selectFrontpage({
		curation,
		editionDate: date,
		editionUrl: url,
		editionHTML: html,
		records: r,
		today,
	});
test("Chicago calendar changes at local midnight including DST", () => {
	assert.equal(chicagoDate(new Date("2026-10-05T00:30:00Z")), "2026-10-04");
	assert.equal(chicagoDate(new Date("2026-10-05T05:00:00Z")), "2026-10-05");
	assert.equal(chicagoDate(new Date("2026-11-02T05:30:00Z")), "2026-11-01");
	assert.equal(chicagoDate(new Date("2026-11-02T06:00:00Z")), "2026-11-02");
});
test("reviewed curation is selected without duplicating story keys", () => {
	const front = select(bundle());
	assert.equal(front.lead.key, "deadline");
	assert.equal(front.developments.length, 1);
	assert.equal(front.curated, true);
	const bad = bundle();
	bad.feature.key = bad.lead.key;
	assert.throws(() => validateCuration(bad), /duplicate/i);
});
test(
	"structural validation rejects unsafe actions, malformed dates " +
		"and missing source attribution",
	() => {
		for (const change of [
			(b) => (b.date = "2026-02-30"),
			(b) => (b.lead.sources = []),
			(b) => (b.lead.action.url = "javascript:alert(1)"),
			(b) => (b.lead.summary = "<script>bad</script>"),
			(b) => (b.reviewedAt = "invented"),
		]) {
			const b = bundle();
			change(b);
			assert.throws(() => validateCuration(b));
		}
	},
);
test("missing fresh curation uses only actual edition lead, paragraph and sources", () => {
	const front = select(undefined);
	assert.equal(front.lead.title, "The park restoration contract");
	assert.equal(front.lead.summary, "The city describes restoration work.");
	assert.deepEqual(front.lead.sources, [{ name: "City", url: "https://example.org/report" }]);
	assert.equal(front.curated, false);
});
test("expired deadline cannot return through fallback to the same source record", () => {
	const b = bundle();
	b.lead.record = url;
	b.developments = [];
	b.feature = null;
	b.goodThing = null;
	const front = select(b, "2026-10-06");
	assert.notEqual(front.lead.title, b.lead.title);
	assert.equal(front.lead.neutral, true);
	assert.equal(front.lead.action.url, url);
});
test("deadline remains on its stated date and is retired on following Chicago build", () => {
	assert.equal(select(bundle(), "2026-10-05").lead.key, "deadline");
	assert.notEqual(select(bundle(), "2026-10-06").lead.key, "deadline");
});
test("missing source records and changed review hashes use a safe fallback", () => {
	const b = bundle();
	b.lead.sourceHash = "0".repeat(64);
	const front = select(b);
	assert.notEqual(front.lead.key, "deadline");
	assert(front.notices.length);
	const missing = { ...records };
	delete missing["/vote-2026/"];
	assert.notEqual(select(bundle(), date, missing).lead.key, "deadline");
});
test("source URLs must occur in reviewed records, not merely look like HTTPS", () => {
	const b = bundle();
	b.lead.sources[0].url = "https://unrelated.example/";
	assert.notEqual(select(b).lead.key, "deadline");
});
test("old/future curation never gets called a current editorial selection", () => {
	const old = bundle();
	old.date = "2026-10-03";
	assert.equal(select(old).curated, false);
	const future = bundle();
	future.date = "2026-10-05";
	assert.equal(select(future).curated, false);
	assert.equal(select(undefined, "2026-10-06").lead.neutral, true);
});
test("different arrays and optional slots cannot force unverified filler", () => {
	const b = bundle();
	b.developments = [];
	b.feature = null;
	b.goodThing = null;
	assert.equal(select(b).developments.length, 0);
	const bad = bundle();
	bad.developments = Array.from({ length: 4 }, (_, n) => item("x" + n));
	assert.throws(() => validateCuration(bad));
});

test("official weather alert snapshots appear only for the current Chicago date", async () => {
	const { forecastAlerts } = await import("../scripts/frontpage.mjs");
	const glance = {
		date,
		fetchedAt: "2026-10-04T11:56:20Z",
		weather: {
			source: "https://www.weather.gov/ewx/",
			alerts: ["Flood Watch until Sunday evening"],
		},
	};
	assert.deepEqual(forecastAlerts(glance, date), glance.weather.alerts);
	assert.deepEqual(forecastAlerts(glance, "2026-10-05"), []);
	assert.deepEqual(forecastAlerts({ ...glance, fetchedAt: "2026-10-04T00:00:00Z" }, date), []);
	assert.deepEqual(
		forecastAlerts(
			{
				...glance,
				weather: {
					...glance.weather,
					source: "https://example.org/weather",
				},
			},
			date,
		),
		[],
	);
	assert.deepEqual(forecastAlerts(undefined, date), []);
	assert.deepEqual(forecastAlerts({ ...glance, fetchedAt: "invalid" }, date), []);
});

test("practical guide actions point to existing answer sections", async () => {
	const { readFileSync } = await import("node:fs");
	const curated = JSON.parse(readFileSync("src/_data/frontpages/2026-10-04.json", "utf8"));
	assert.equal(curated.lead.action.url, "/vote-2026/#do-these-first");
	assert.equal(curated.access.action.url, "/zilker-park-access/#what-can-you-use");
	for (const card of [curated.lead, curated.access]) {
		const [route, fragment] = card.action.url.split("#");
		const html = readFileSync(`_site${route}index.html`, "utf8");
		assert.match(html, new RegExp(`id="${fragment}" tabindex="-1"`));
		assert.equal(card.record, route, "source reference remains the guide top");
	}
});

test("optional story photos require local responsive assets, dimensions and linked rights", () => {
  const b = bundle();
  b.access.photo = { src: "/images/photos/pool-960.webp", smallSrc: "/images/photos/pool-480.webp", width: 960, height: 320, smallWidth: 480, alt: "Archival pool photograph", caption: "File photo, March 2016", credit: "Fredlyfish4", source: "https://commons.wikimedia.org/wiki/File:Pool", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" };
  assert.equal(validateCuration(b), b);
  for (const change of [
    p => p.width = 0, p => p.src = "https://tracker.example/photo",
    p => p.alt = "", p => p.licenseUrl = "javascript:bad",
  ]) {
    const bad = structuredClone(b); change(bad.access.photo);
    assert.throws(() => validateCuration(bad), /photo/i);
  }
  assert.equal(select(b).access, null, "unbound photo cannot follow a story source");
  const boundRaw = [raw, b.access.photo.src, b.access.photo.smallSrc,
    b.access.photo.source].join(" ");
  b.access.sourceHash = sourceHash(boundRaw);
  const boundRecords = { ...records, "/zilker-park-access/": { raw: boundRaw, html } };
  assert.equal(select(b, date, boundRecords).access.photo.src, b.access.photo.src);
  const changedRecords = { ...records,
    "/zilker-park-access/": { raw: boundRaw + " Changed.", html } };
  assert.equal(select(b, date, changedRecords).access, null);
  b.access.expiresOn = "2026-10-04";
  assert.equal(select(b, "2026-10-05", boundRecords).access, null);
});

const previous = {
	date: "2026-10-02",
	url: "/2026/10/02/",
	raw: "The preceding published edition",
};
const comparisonBundle = () => ({
	...bundle(),
	comparison: {
		previousDate: previous.date,
		previousSourceHash: sourceHash(previous.raw),
		editionSourceHash: sourceHash(raw),
		reviewedAt: "2026-10-04T12:00:00Z",
		entries: [
			{
				slot: "lead",
				key: "deadline",
				kind: "development",
				record: "/vote-2026/",
				sourceHash: sourceHash(raw),
				summary: "A newly reported proposal remains pending.",
				sources: [{ name: "City", url: "https://example.org/report" }],
			},
			{
				slot: "access",
				key: "park-access",
				kind: "unresolved",
				record: "/zilker-park-access/",
				sourceHash: sourceHash(raw),
				summary: "The reopening date remains unconfirmed.",
				sources: [{ name: "City", url: "https://example.org/report" }],
			},
			{
				slot: "voteGuide",
				key: "voter-guide",
				kind: "guidance",
				record: "/vote-2026/",
				sourceHash: sourceHash(raw),
				summary: "The dated deadline passed; check your registration record.",
				sources: [{ name: "City", url: "https://example.org/report" }],
			},
		],
	},
});
const compare = (curation, p = previous, r = records) =>
	selectFrontpage({
		curation,
		editionDate: date,
		editionUrl: url,
		editionHTML: html,
		records: r,
		today: date,
		previousEdition: p,
		showVoteGuide: true,
	});
test("reviewed comparisons replace selected copy across a publication gap", () => {
	const front = compare(comparisonBundle());
	assert.equal(front.lead.summary, "A newly reported proposal remains pending.");
	assert.equal(front.lead.comparisonKind, "New reporting");
	assert.equal(front.access.comparisonKind, "Still unresolved");
	assert.equal(front.voteGuide.comparisonKind, "Guidance updated");
	assert.equal(front.voteGuide.action.url, "/vote-2026/#do-these-first");
	assert.equal(front.lead.action.url, bundle().lead.action.url);
	assert.equal(front.developments[0].summary, bundle().developments[0].summary);
	assert.deepEqual(front.previousEdition, { date: previous.date, url: previous.url });
});
test("missing or malformed optional comparison cannot break ordinary curation", () => {
	for (const mutate of [
		(b) => delete b.comparison,
		(b) => (b.comparison = null),
		(b) => (b.comparison.reviewedAt = "invented"),
		(b) => (b.comparison.previousDate = "2026-10-03"),
		(b) => (b.comparison.previousSourceHash = "a".repeat(64)),
		(b) => (b.comparison.editionSourceHash = "a".repeat(64)),
		(b) => b.comparison.entries.push(b.comparison.entries[0]),
		(b) => (b.comparison.entries = "not reviewed"),
	]) {
		const b = comparisonBundle();
		mutate(b);
		const front = compare(b);
		assert.equal(front.lead.summary, bundle().lead.summary);
		assert.equal(front.lead.comparisonKind, undefined);
		assert.equal(front.voteGuide, null);
	}
	for (const p of [null, { ...previous, date }, { ...previous, url: "//example.org" }]) {
		const front = compare(comparisonBundle(), p);
		assert.equal(front.lead.comparisonKind, undefined);
		assert.equal(front.previousEdition, null);
	}
});
test("unsafe stale or unknown comparison entries omit independently", () => {
	for (const mutate of [
		(e) => (e.key = "unknown"),
		(e) => (e.slot = "invented"),
		(e) => (e.kind = "breaking"),
		(e) => (e.kind = { toString: null }),
		(e) => (e.record = { toString: null }),
		(e) => (e.record = "/unknown/"),
		(e) => (e.sourceHash = "a".repeat(64)),
		(e) => (e.summary = "<img src=x>"),
		(e) => (e.summary = "Long ".repeat(50)),
		(e) => (e.sources = [{ name: "Unsafe", url: "javascript:alert(1)" }]),
		(e) => (e.sources = [{ name: "Unknown", url: "https://example.org/unreviewed" }]),
	]) {
		const b = comparisonBundle();
		mutate(b.comparison.entries[0]);
		const front = compare(b);
		assert.equal(front.lead.summary, bundle().lead.summary);
		assert.equal(front.lead.comparisonKind, undefined);
		assert.equal(front.access.comparisonKind, "Still unresolved");
	}
	const b = comparisonBundle();
	b.comparison.entries[1].slot = "lead";
	const front = compare(b);
	assert.equal(front.lead.comparisonKind, undefined);
	assert.equal(front.voteGuide.comparisonKind, "Guidance updated");
});
test("changed guides and hidden voter navigation suppress comparison", () => {
	const changed = { ...records, "/vote-2026/": { raw: "Revised source" } };
	assert.equal(compare(comparisonBundle(), previous, changed).voteGuide, null);
	assert.equal(compare(undefined).lead.comparisonKind, undefined);
	const front = selectFrontpage({
		curation: comparisonBundle(),
		editionDate: date,
		editionUrl: url,
		editionHTML: html,
		records,
		today: date,
		previousEdition: previous,
		showVoteGuide: false,
	});
	assert.equal(front.voteGuide, null);
});

test("ordinary cards cannot smuggle an unreviewed comparison label", () => {
  const b = bundle();
  b.lead.comparisonKind = "New reporting";
  b.access.comparisonKind = "Still unresolved";
  const front = compare(b);
  assert.equal(front.lead.comparisonKind, undefined);
  assert.equal(front.access.comparisonKind, undefined);
});
