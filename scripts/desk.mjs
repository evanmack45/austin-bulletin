// Homepage fields read from a bulletin. Markers live in the markdown so the
// homepage and the edition share one copy of each fact.
//
//   <!-- desk:kicker Election -->
//   <!-- desk:figure 25% -->
//   <p class="if-you"><strong>If you haven't voted:</strong> …</p>
//   <!-- desk:closes Nov 20 -->
//   <!-- desk:week Thru Nov 1 -->

function section(text, start, end) {
  const from = text.indexOf(start);
  if (from === -1) return "";
  const to = text.indexOf(end, from + start.length);
  return to === -1 ? "" : text.slice(from + start.length, to);
}

function commentValue(text, key) {
  const match = text.match(new RegExp(`<!--\\s*desk:${key}\\s+([\\s\\S]*?)\\s*-->`));
  return match?.[1]?.trim() || "";
}

function stripTags(value) {
  return String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function firstLink(html) {
  const link = String(html ?? "").match(/<a href="([^"]+)">([\s\S]*?)<\/a>/i);
  if (!link) return null;
  return { href: link[1], name: stripTags(link[2]) };
}

function ifYouInner(block) {
  const match = String(block ?? "").match(/<p class="if-you">([\s\S]*?)<\/p>/i);
  return match ? match[1] : "";
}

function strongLabel(cleaned) {
  const match = cleaned.match(/<strong>([\s\S]*?)<\/strong>/i);
  return stripTags(match ? match[1] : "");
}

function actionText(label, cleaned) {
  const withoutLink = stripTags(cleaned.replace(/<a[\s\S]*?<\/a>/gi, " "));
  const raw = label ? withoutLink.replace(label, " ") : withoutLink;
  // The period after the link is punctuation for the link, not a sentence.
  // trim() runs first, so a line that is only a label and a link used to
  // leave that period behind and the homepage printed "If you want to go: ."
  return raw.replace(/\s+/g, " ").trim().replace(/(?:^|\s+)\.$/, "");
}

function hrefOf(link) {
  return link ? link[1] : "";
}

function labelOf(link) {
  return link ? stripTags(link[2]) : "";
}

export function parseAction(block) {
  const inner = ifYouInner(block);
  if (!inner) return null;
  const cleaned = inner.replace(/<span class="date-tag">[\s\S]*?<\/span>/gi, " ");
  const link = cleaned.match(/<a href="([^"]+)">([\s\S]*?)<\/a>/i);
  const label = strongLabel(cleaned);
  return {
    label,
    text: actionText(label, cleaned),
    href: hrefOf(link),
    linkLabel: labelOf(link)
  };
}

function plainParagraph(value) {
  return Boolean(value) && !/^[<#{%]/.test(value);
}

function deckFrom(big) {
  const stripped = big
    .replace(/^###.*$/m, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<figure[\s\S]*?<\/figure>/gi, "")
    .replace(/<p class="if-you">[\s\S]*?<\/p>/gi, "")
    .replace(/<p class="whats-next">[\s\S]*?<\/p>/gi, "")
    .replace(/<p class="source-line">[\s\S]*?<\/p>/gi, "");
  const paragraph = stripped.split(/\n\s*\n/).map((part) => part.trim()).find(plainParagraph);
  return paragraph ? paragraph.replace(/\s+/g, " ") : "";
}

function fogClock(match) {
  const minute = match[2] ? `:${match[2]}` : "";
  return `${Number(match[1])}${minute}${match[3].toLowerCase().replaceAll(".", "")}`;
}

export function weatherStrip(note) {
  if (!note) return "";
  const high = note.match(/high near (\d+)/i);
  const until = note.match(/until (\d{1,2})(?::(\d{2}))?\s*(a\.m\.|p\.m\.)/i);
  const bits = [];
  if (high) bits.push(`${high[1]}°`);
  if (/fog/i.test(note) && until) bits.push(`fog till ${fogClock(until)}`);
  return bits.join(" ");
}

function sourceSpan(chunk) {
  const tagged = chunk.match(/<span class="src">[\s\S]*?<\/span>/);
  return firstLink(tagged ? tagged[0] : "");
}

function placeChunk(chunk, closes, week) {
  const where = chunk.match(/<!--\s*desk:(closes|week)\s+(.+?)\s*-->/);
  if (!where) return;
  const item = {
    when: where[2].trim(),
    title: chunk.split("\n")[0].trim(),
    action: parseAction(chunk),
    source: sourceSpan(chunk)
  };
  if (where[1] === "closes") closes.push(item);
  else week.push(item);
}

function placeItems(river) {
  const closes = [];
  const week = [];
  for (const chunk of river.split(/^#####\s+/m).slice(1)) placeChunk(chunk, closes, week);
  return { closes, week };
}

function matched(text, pattern) {
  const found = text.match(pattern);
  return found ? found[1] : "";
}

function headlineOf(big) {
  const line = big.match(/^###\s+(.+)$/m);
  return line ? line[1].trim() : "";
}

export function parseDesk(markdown) {
  const text = String(markdown ?? "");
  const big = section(text, "{% bigstory %}", "{% endbigstory %}");
  const placed = placeItems(section(text, "{% river %}", "{% endriver %}"));
  const note = matched(text, /<p class="morning-note">([\s\S]*?)<\/p>/i);
  const sources = matched(big, /<p class="source-line">([\s\S]*?)<\/p>/i);
  return {
    kicker: commentValue(big, "kicker"),
    figure: commentValue(big, "figure"),
    headline: headlineOf(big),
    deck: deckFrom(big),
    action: parseAction(big),
    source: firstLink(sources),
    weather: weatherStrip(note),
    closes: placed.closes,
    week: placed.week
  };
}
