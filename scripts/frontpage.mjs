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

export function selectFrontpage({
	curation,
	editionDate,
	editionUrl,
	editionHTML,
	records,
	today,
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
			sourceHash(record.raw) !== card.sourceHash ||
			(card.image && !record.raw.includes(card.image)) ||
			card.sources.some((s) => !record.raw.includes(s.url) && !record.urls?.includes(s.url))
		) {
			notices.push(`Source review needed: ${card.key}`);
			return null;
		}
		return card;
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
	return {
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
}

// A dated NWS snapshot, never an assertion that an alert is still active now.
export function forecastAlerts(glance, today = chicagoDate()) {
	if (glance?.date !== today || !Number.isFinite(Date.parse(glance.fetchedAt))) return [];
	if (chicagoDate(new Date(glance.fetchedAt)) !== today) return [];
	if (glance.weather?.source !== "https://www.weather.gov/ewx/") return [];
	return Array.isArray(glance.weather.alerts) ? glance.weather.alerts.filter(plain) : [];
}
