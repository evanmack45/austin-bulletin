import { createHash } from "node:crypto";

export const sourceHash = (text) => createHash("sha256").update(text).digest("hex");
const iso = (value) =>
	typeof value === "string" &&
	/^\d{4}-\d{2}-\d{2}$/.test(value) &&
	Number.isFinite(Date.parse(value)) &&
	new Date(value).toISOString().slice(0, 10) === value;
const plain = (value) =>
	typeof value === "string" && value.trim().length > 0 && !/[<>]/.test(value);
const local = (value) => typeof value === "string" && /^\/(?!\/)[^\s]*$/.test(value);
const https = (value) => {
	try {
		return new URL(value).protocol === "https:";
	} catch {
		return false;
	}
};

export function chicagoDate(now = new Date()) {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: "America/Chicago",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(now);
	return ["year", "month", "day"]
		.map((type) => parts.find((p) => p.type === type).value)
		.join("-");
}

// Shape, reference and source-version checks are not factual verification.
// Editorial source reading and independent copy review remain separate gates.
export function validateCuration(bundle) {
	if (
		!bundle ||
		!iso(bundle.date) ||
		!/^\d{4}-\d{2}-\d{2}T/.test(bundle.reviewedAt ?? "") ||
		!Number.isFinite(Date.parse(bundle.reviewedAt))
	)
		throw new Error("Invalid curation date/review record");
	if (!Array.isArray(bundle.developments) || bundle.developments.length > 3)
		throw new Error("At most three developments");
	const seen = new Set();
	for (const card of [
		bundle.lead,
		bundle.access,
		...bundle.developments,
		bundle.feature,
		bundle.goodThing,
	].filter(Boolean)) {
		if (!plain(card.key) || seen.has(card.key))
			throw new Error("Missing or duplicate story key");
		seen.add(card.key);
		if (
			!local(card.record) ||
			!/^[a-f0-9]{64}$/.test(card.sourceHash ?? "") ||
			!plain(card.title) ||
			card.title.length > 130 ||
			!plain(card.summary) ||
			card.summary.length > 600 ||
			!plain(card.asOf)
		)
			throw new Error("Invalid curation card/reference");
		if (card.photo !== undefined) {
			const p = card.photo;
			if (!p || !local(p.src) || !local(p.smallSrc) ||
				!Number.isInteger(p.width) || p.width <= 0 ||
				!Number.isInteger(p.height) || p.height <= 0 ||
				!Number.isInteger(p.smallWidth) || p.smallWidth <= 0 || p.smallWidth >= p.width ||
				![p.alt, p.caption, p.credit, p.license].every(plain) ||
				!https(p.source) || !https(p.licenseUrl))
				throw new Error("Invalid story photo/rights");
		}
		if (card.image !== undefined && (!local(card.image) || !plain(card.imageAlt)))
			throw new Error("Invalid story image");
		if (card.detail !== undefined && (!plain(card.detail) || card.detail.length > 500))
			throw new Error("Invalid detail");
		if (card.next !== undefined && !plain(card.next)) throw new Error("Invalid next step");
		if (card.expiresOn !== undefined && !iso(card.expiresOn))
			throw new Error("Invalid expiry date");
		if (
			!Array.isArray(card.sources) ||
			card.sources.length < 1 ||
			card.sources.length > 3 ||
			card.sources.some((s) => !plain(s.name) || !https(s.url))
		)
			throw new Error("Missing/invalid source attribution");
		if (
			!card.action ||
			!plain(card.action.label) ||
			!(local(card.action.url) || card.sources.some((s) => s.url === card.action.url))
		)
			throw new Error("Invalid action destination");
	}
	return bundle;
}

// Original artwork is independently reviewed and does not alter historical records.
// Invalid optional art is omitted; source-current text can still publish.
export function selectedIllustration(card, editionDate, assets = {}) {
  const art = card?.illustration;
  if (!art || typeof art !== "object" || art.kind !== "editorial-illustration" ||
    ![art.src, art.rightsPath, art.sha256].every(value => typeof value === "string") ||
    !/^\/images\/editorial\/[a-z0-9][a-z0-9._-]*\.(png|webp)$/.test(art.src ?? "") ||
    !/^\/images\/editorial\/[A-Za-z0-9][A-Za-z0-9._-]*\.txt$/.test(art.rightsPath ?? "") ||
    !/^[a-f0-9]{64}$/.test(art.sha256 ?? "") ||
    ![art.alt, art.credit].every(plain) ||
    ![art.width, art.height].every(value =>
      Number.isInteger(value) && value > 0 && value <= 10000) ||
    art.storyKey !== card.key || art.editionDate !== editionDate) return undefined;
  const asset = assets[art.src];
  return asset && asset.sha256 === art.sha256 && asset.width === art.width &&
    asset.height === art.height && asset.rightsPath === art.rightsPath ? { ...art } : undefined;
}

function text(html) {
	return String(html ?? "")
		.replace(/<[^>]*>/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/&#(?:39|x27);|&apos;/g, "'")
		.replace(/&nbsp;/g, " ")
		.replace(/&[a-z]+;/gi, " ")
		.replace(/\s+/g, " ")
		.trim();
}
function editionFallback(editionDate, editionUrl, html, allowLead) {
	const sectionPattern =
		/<section\b[^>]*class="[^"]*\bbig-story\b[^"]*"[^>]*>([\s\S]*?)<\/section>/i;
	const section = html.match(sectionPattern)?.[1] ?? "";
	const title = text(section.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)?.[1]);
	const paragraph = [...section.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi)].find(
		(m) => !/source-line|whats-next/.test(m[1]),
	);
	const sourceLine =
		section.match(/<p\b[^>]*class="[^"]*source-line[^"]*"[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "";
	const sources = [...sourceLine.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
		.filter((m) => https(m[1]))
		.map((m) => ({ url: m[1], name: text(m[2]) }));
	const neutral = !allowLead || !title || !paragraph || !sources.length;
	return {
		key: "edition-fallback",
		record: editionUrl,
		title: neutral ? `Latest available edition — ${editionDate}` : title,
		summary: neutral
			? "Read the dated briefing and its original source links. " +
				"This is the latest available edition, not a fresh deadline or live alert."
			: text(paragraph[2]),
		asOf: `Edition: ${editionDate}`,
		sources: neutral ? [] : sources,
		action: { label: "Read the full edition", url: editionUrl },
		neutral,
	};
}

export function previousPublishedEdition(reference, editionDate) {
  return reference && iso(reference.date) && reference.date < editionDate &&
    reference.url === `/${reference.date.replaceAll("-", "/")}/` &&
    typeof reference.raw === "string" && reference.raw.trim() ? reference : null;
}

// Optional comparison is manually authored; hashes establish versions, not significance.
function comparisonCopy(front, curation, records, previous, showVoteGuide) {
	const comparison = curation?.comparison;
	const timestamp = comparison?.reviewedAt;
	if (
		!comparison ||
		!previous ||
		comparison.previousDate !== previous.date ||
		sourceHash(previous.raw) !== comparison.previousSourceHash ||
		sourceHash(records[front.editionUrl]?.raw ?? "") !== comparison.editionSourceHash ||
		typeof timestamp !== "string" ||
		!/^\d{4}-\d{2}-\d{2}T/.test(timestamp) ||
		!Number.isFinite(Date.parse(timestamp)) ||
		chicagoDate(new Date(timestamp)) !== front.editionDate ||
		!Array.isArray(comparison.entries) ||
		comparison.entries.length > 3
	) {
		if (comparison) front.notices.push("Optional comparison omitted: review/version needed");
		return front;
	}
	const kinds = {
		development: "New reporting",
		guidance: "Guidance updated",
		unresolved: "Still unresolved",
	};
	const slots = ["lead", "access", "voteGuide"];
	for (const slot of slots) {
		const entries = comparison.entries.filter((entry) => entry && entry.slot === slot);
		if (entries.length !== 1) continue;
		const entry = entries[0];
		if (typeof entry.record !== "string" || typeof entry.kind !== "string") {
			front.notices.push(`Optional comparison omitted: ${slot}`);
			continue;
		}
		const card =
			slot === "voteGuide"
				? showVoteGuide
					? {
							key: "voter-guide",
							record: "/vote-2026/",
							action: {
								label: "Check your record and voting dates",
								url: "/vote-2026/#do-these-first",
							},
						}
					: null
				: front[slot];
		const record = records[entry.record];
		if (
			!card ||
			!Object.hasOwn(kinds, entry.kind) ||
			entry.key !== card.key ||
			entry.record !== card.record ||
			!plain(entry.summary) ||
			entry.summary.length > 300 ||
			entry.summary.trim().split(/\s+/).length > 35 ||
			!record ||
			typeof record.raw !== "string" ||
			sourceHash(record.raw) !== entry.sourceHash ||
			!Array.isArray(entry.sources) ||
			entry.sources.length < 1 ||
			entry.sources.length > 3 ||
			entry.sources.some(
				(source) =>
					!source ||
					!plain(source.name) ||
					!https(source.url) ||
					(!record.raw.includes(source.url) && !record.urls?.includes(source.url)),
			)
		) {
			front.notices.push(`Optional comparison omitted: ${slot}`);
			continue;
		}
		front[slot] = {
			...card,
			summary: entry.summary,
			sources: entry.sources,
			comparisonKind: kinds[entry.kind],
		};
	}
	return front;
}

export function selectFrontpage({
	curation,
  illustrationAssets = {},
	editionDate,
	editionUrl,
	editionHTML,
	records,
	today,
	previousEdition,
	showVoteGuide = false,
}) {
	if (!iso(today) || !iso(editionDate)) throw new Error("Invalid build/edition date");
	const notices = [];
	if (curation) validateCuration(curation);
	const matches = curation?.date === editionDate && curation.date <= today;
	const active = (card) => {
		if (!card) return null;
		if (card.expiresOn && card.expiresOn < today) {
			notices.push(`Expired: ${card.key}`);
			return null;
		}
		const record = records[card.record];
		if (
			!record ||
			typeof record.raw !== "string" ||
			sourceHash(record.raw) !== card.sourceHash ||
			(card.image && !record.raw.includes(card.image)) ||
			(card.photo && [card.photo.src, card.photo.smallSrc, card.photo.source]
				.some(value => !record.raw.includes(value))) ||
			card.sources.some((s) => !record.raw.includes(s.url) && !record.urls?.includes(s.url))
		) {
			notices.push(`Source review needed: ${card.key}`);
			return null;
		}
		const reviewedCard = { ...card };
		delete reviewedCard.comparisonKind;
    delete reviewedCard.illustration;
    const illustration = selectedIllustration(card, editionDate, illustrationAssets);
    if (illustration) reviewedCard.illustration = illustration;
		return reviewedCard;
	};
	const developments = matches ? curation.developments.map(active).filter(Boolean) : [];
	let lead = matches ? active(curation.lead) : null;
	const expiredSource =
		matches && curation.lead?.expiresOn < today && curation.lead.record === editionUrl;
	if (!lead && developments.length) lead = developments.shift();
	lead ??= editionFallback(
		editionDate,
		editionUrl,
		editionHTML,
		editionDate === today && !expiredSource,
	);
	const previous = previousPublishedEdition(previousEdition, editionDate);
  const front = {
    voteGuide: null,
    previousEdition: previous ? { date: previous.date, url: previous.url } : null,
		lead,
		access: matches ? active(curation.access) : null,
		developments,
		feature: matches ? active(curation.feature) : null,
		goodThing: matches ? active(curation.goodThing) : null,
		editionDate,
		editionUrl,
		curated: matches,
		notices,
	};
  return comparisonCopy(front, matches ? curation : null, records, previous, showVoteGuide);
}

// A dated NWS snapshot, never an assertion that an alert is still active now.
export function forecastAlerts(glance, today = chicagoDate()) {
	if (glance?.date !== today || !Number.isFinite(Date.parse(glance.fetchedAt))) return [];
	if (chicagoDate(new Date(glance.fetchedAt)) !== today) return [];
	if (glance.weather?.source !== "https://www.weather.gov/ewx/") return [];
	return Array.isArray(glance.weather.alerts) ? glance.weather.alerts.filter(plain) : [];
}
