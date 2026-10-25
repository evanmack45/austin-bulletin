// Edition photographs declared in bulletin front matter.
// A lead photo renders only when its key is the lead story's heading slug.
// A story with no record renders nothing. fallbackMarkup remains for the
// skyline file; pages do not insert it.

const FALLBACK_SRC = "/images/fallback/austin-skyline.svg";
const FALLBACK_ALT =
  "Illustrated Austin skyline, shown because no photograph is available for this story.";

export function httpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function localImagePath(value) {
  return typeof value === "string" &&
    /^\/images\/[a-z0-9][a-z0-9./-]*\.(webp|svg)$/.test(value) &&
    !value.includes("..");
}

export function storyKey(value) {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function positiveInt(value) {
  return Number.isInteger(value) && value > 0 && value <= 10000;
}

function validDimensions(photo) {
  return [photo.width, photo.height, photo.smallWidth].every(positiveInt) &&
    photo.smallWidth < photo.width;
}

function requirePlain(photo, label, field, problems) {
  const value = photo[field];
  if (typeof value !== "string" || !value.trim() || /[<>]/.test(value)) {
    problems.push(`${label} ${field} must be plain text`);
  }
}

function requireHttps(photo, label, field, problems) {
  if (!httpsUrl(photo[field])) problems.push(`${label} ${field} must be an https link`);
}

function isRecord(photo) {
  return Boolean(photo) && typeof photo === "object" && !Array.isArray(photo);
}

function pushShapeProblems(photo, label, problems) {
  if (!localImagePath(photo.src)) problems.push(`${label} src must be a local image`);
  if (!localImagePath(photo.smallSrc)) problems.push(`${label} smallSrc must be a local image`);
  if (!validDimensions(photo)) problems.push(`${label} dimensions are invalid`);
}

export function photoProblems(photo, label) {
  if (!isRecord(photo)) return [`${label} is not an image record`];
  const problems = [];
  pushShapeProblems(photo, label, problems);
  for (const field of ["alt", "caption", "credit", "license"]) {
    requirePlain(photo, label, field, problems);
  }
  for (const field of ["source", "licenseUrl"]) requireHttps(photo, label, field, problems);
  if (photo.key != null && !storyKey(photo.key)) problems.push(`${label} key is invalid`);
  return problems;
}

function storyRecords(stories) {
  const problems = [];
  const ready = [];
  const seen = new Set();
  if (stories == null) return { problems, ready };
  if (!Array.isArray(stories)) {
    problems.push("stories must be a list");
    return { problems, ready };
  }
  stories.forEach((story, index) => collectStory(story, index, seen, problems, ready));
  return { problems, ready };
}

function collectStory(story, index, seen, problems, ready) {
  const label = `stories[${index}]`;
  const found = photoProblems(story, label);
  problems.push(...found);
  if (!storyKey(story?.key)) {
    problems.push(`${label} needs a story key`);
    return;
  }
  if (seen.has(story.key)) {
    problems.push(`${label} repeats ${story.key}`);
    return;
  }
  seen.add(story.key);
  if (found.length === 0) ready.push(story);
}

export function readEditionImages(images) {
  if (images == null) return { lead: null, stories: [], byKey: {}, errors: [] };
  if (typeof images !== "object" || Array.isArray(images)) {
    return { lead: null, stories: [], byKey: {}, errors: ["images must be a mapping"] };
  }
  const errors = [];
  let lead = null;
  if (images.lead != null) {
    const found = photoProblems(images.lead, "lead");
    errors.push(...found);
    if (found.length === 0) lead = images.lead;
  }
  const parsed = storyRecords(images.stories);
  errors.push(...parsed.problems);
  const byKey = {};
  for (const story of parsed.ready) byKey[story.key] = story;
  return { lead, stories: parsed.ready, byKey, errors };
}

function pushMissingFiles(photo, label, exists, problems) {
  for (const field of ["src", "smallSrc"]) {
    if (localImagePath(photo[field]) && !exists(photo[field])) {
      problems.push(`${label} file not found: src${photo[field]}`);
    }
  }
}

export function editionImageProblems(images, exists = () => true) {
  const read = readEditionImages(images);
  const problems = [...read.errors];
  if (read.lead) pushMissingFiles(read.lead, "lead", exists, problems);
  read.stories.forEach((story, index) => {
    pushMissingFiles(story, `stories[${index}]`, exists, problems);
  });
  return problems;
}

function listedPhotos(images) {
  const photos = [];
  if (images?.lead) photos.push(images.lead);
  if (Array.isArray(images?.stories)) photos.push(...images.stories);
  return photos;
}

function linkFields(photo) {
  const fields = ["source", "licenseUrl"].filter((field) => httpsUrl(photo?.[field]));
  return fields.map((field) => photo[field]);
}

export function editionImageLinks(images) {
  return listedPhotos(images).flatMap((photo) => linkFields(photo));
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadingAttr(loading) {
  return loading === "eager" ? "eager" : "lazy";
}

export function photoMarkup(photo, options) {
  const srcset = `${photo.smallSrc} ${photo.smallWidth}w, ${photo.src} ${photo.width}w`;
  const priority = options.fetchPriority === "high" ? ' fetchpriority="high"' : "";
  return `<figure class="${esc(options.className)}">` +
    `<img src="${esc(photo.src)}" srcset="${esc(srcset)}" sizes="${esc(options.sizes)}" ` +
    `width="${photo.width}" height="${photo.height}" alt="${esc(photo.alt)}" ` +
    `loading="${loadingAttr(options.loading)}" decoding="async"${priority}>` +
    `<figcaption>${esc(photo.caption)} <a href="${esc(photo.source)}">${esc(photo.credit)}</a> ` +
    `· <a href="${esc(photo.licenseUrl)}">${esc(photo.license)}</a></figcaption></figure>`;
}

export function fallbackMarkup(options) {
  const loading = loadingAttr(options.loading);
  return `<figure class="${esc(options.className)}">` +
    `<img src="${FALLBACK_SRC}" width="800" height="450" alt="${esc(FALLBACK_ALT)}" ` +
    `loading="${loading}" decoding="async">` +
    `<figcaption>Illustration: <a href="/about/">The Austin Bulletin</a> · ` +
    `<a href="/about/">Original illustration</a></figcaption></figure>`;
}

function checked(images, exists) {
  const read = readEditionImages(images);
  const problems = editionImageProblems(images, exists);
  if (problems.length) throw new Error(problems.join("; "));
  return read;
}

function renderLead(photo) {
  return photoMarkup(photo, {
    className: "lead-photo",
    loading: "eager",
    fetchPriority: "high",
    sizes: "(max-width: 760px) calc(100vw - 40px), 760px",
  });
}

// An unkeyed lead belongs only to a one-story headline. A keyed lead or a
// story record is used only when the key is that story.
export function leadPhotoFor(images, key, exists) {
  const read = checked(images, exists);
  if (storyKey(key)) {
    if (read.lead?.key === key) return read.lead;
    return read.byKey[key] ?? null;
  }
  if (read.lead && read.lead.key == null) return read.lead;
  return null;
}

export function hasStoryPhoto(images, key, exists = () => true) {
  try {
    return leadPhotoFor(images, key, exists) != null;
  } catch {
    return false;
  }
}

export function leadForStory(images, key, exists) {
  const photo = leadPhotoFor(images, key, exists);
  if (!photo) return "";
  return renderLead(photo);
}

export function leadMarkup(images, exists) {
  return leadForStory(images, "", exists);
}

export function storyThumb(images, url, exists) {
  const read = checked(images, exists);
  const key = String(url ?? "").split("#").pop();
  const photo = key ? read.byKey[key] : null;
  if (!photo) return "";
  return photoMarkup(photo, { className: "rail-thumb", loading: "lazy", sizes: "112px" });
}

function headingId(attrs) {
  return attrs.match(/\sid="([^"]*)"/)?.[1] || "";
}

function storyFigure(photo) {
  if (!photo) return "";
  return photoMarkup(photo, {
    className: "story-thumb",
    loading: "lazy",
    sizes: "(max-width: 640px) calc(100vw - 40px), 220px",
  });
}

function replaceHeading(full, level, attrs, byKey) {
  if (level !== "5") return full;
  const figure = storyFigure(byKey[headingId(attrs)]);
  return figure ? full + figure : full;
}

export function withStoryPhotos(html, images, exists) {
  const read = checked(images, exists);
  return String(html ?? "").replace(/<h([45])\b([^>]*)>[\s\S]*?<\/h\1>/gi, (full, level, attrs) =>
    replaceHeading(full, level, attrs, read.byKey));
}
