// A small XML reader for the Atom build test. It accepts the markup this
// site emits: a declaration, elements, attributes, comments, and the five
// predefined XML entities. It rejects a bare "&" and an unknown entity.

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'" };

function assertEntities(text) {
  if (/&(?!(?:#\d+|#x[0-9a-fA-F]+|[A-Za-z]+);)/.test(text)) {
    throw new Error("bare ampersand in XML");
  }
}

function decodeEntity(_all, body) {
  if (body[0] !== "#") {
    if (!Object.hasOwn(ENTITIES, body)) throw new Error(`unknown entity &${body};`);
    return ENTITIES[body];
  }
  const hex = body[1] === "x" || body[1] === "X";
  const code = Number.parseInt(hex ? body.slice(2) : body.slice(1), hex ? 16 : 10);
  if (!Number.isInteger(code) || code < 0) throw new Error(`bad character reference &#${body};`);
  return String.fromCodePoint(code);
}

export function decodeXml(text) {
  assertEntities(text);
  return text.replace(/&(#(?:x[0-9a-fA-F]+|\d+)|[A-Za-z]+);/g, decodeEntity);
}

function skipSpace(state) {
  while (state.i < state.source.length && /\s/.test(state.source[state.i])) state.i += 1;
}

function skipProlog(state) {
  skipSpace(state);
  if (!state.source.startsWith("<?xml", state.i)) return;
  const end = state.source.indexOf("?>", state.i);
  if (end < 0) throw new Error("unclosed xml declaration");
  state.i = end + 2;
}

function readName(state) {
  const match = /^[^\s/>=]+/.exec(state.source.slice(state.i));
  if (!match) throw new Error(`missing name at ${state.i}`);
  state.i += match[0].length;
  return match[0];
}

function readQuoted(state) {
  const quote = state.source[state.i];
  if (quote !== "\"" && quote !== "'") throw new Error(`unquoted attribute at ${state.i}`);
  const end = state.source.indexOf(quote, state.i + 1);
  if (end < 0) throw new Error("unclosed attribute");
  const value = decodeXml(state.source.slice(state.i + 1, end));
  state.i = end + 1;
  return value;
}

function readAttributes(state) {
  const attrs = {};
  for (;;) {
    skipSpace(state);
    const next = state.source[state.i];
    if (next === ">" || state.source.startsWith("/>", state.i)) return attrs;
    const name = readName(state);
    skipSpace(state);
    if (state.source[state.i] !== "=") throw new Error(`missing = after ${name}`);
    state.i += 1;
    skipSpace(state);
    attrs[name] = readQuoted(state);
  }
}

function readUntil(state, marker, label) {
  const end = state.source.indexOf(marker, state.i);
  if (end < 0) throw new Error(`unclosed ${label}`);
  const value = state.source.slice(state.i, end);
  state.i = end + marker.length;
  return value;
}

function readComment(state) {
  state.i += "<!--".length;
  readUntil(state, "-->", "comment");
  return { type: "comment" };
}

function readCdata(state) {
  state.i += "<![CDATA[".length;
  return { type: "text", value: readUntil(state, "]]>", "cdata") };
}

function readPi(state) {
  state.i += "<?".length;
  readUntil(state, "?>", "processing instruction");
  return { type: "pi" };
}

function readText(state) {
  const value = decodeXml(readUntil(state, "<", "text"));
  state.i -= 1;
  return { type: "text", value };
}

function isClose(state, name) {
  const token = `</${name}`;
  if (!state.source.startsWith(token, state.i)) return false;
  const next = state.source[state.i + token.length];
  return next === ">" || /\s/.test(next ?? "");
}

function closeTag(state, name) {
  const match = new RegExp(`^</${name}\\s*>`).exec(state.source.slice(state.i));
  if (!match) throw new Error(`bad close tag for ${name}`);
  state.i += match[0].length;
}

function elementText(children) {
  const text = children.filter((child) => child.type === "text");
  return text.map((child) => child.value).join("").trim();
}

function readNode(state) {
  if (state.source.startsWith("<!--", state.i)) return readComment(state);
  if (state.source.startsWith("<![CDATA[", state.i)) return readCdata(state);
  if (state.source.startsWith("<?", state.i)) return readPi(state);
  if (state.source[state.i] === "<") return readElement(state);
  return readText(state);
}

function readChildren(state, name) {
  const children = [];
  while (state.i < state.source.length) {
    if (isClose(state, name)) {
      closeTag(state, name);
      return children;
    }
    children.push(readNode(state));
  }
  throw new Error(`unclosed ${name}`);
}

function readElement(state) {
  if (state.source[state.i] !== "<") throw new Error(`expected element at ${state.i}`);
  state.i += 1;
  const name = readName(state);
  const attrs = readAttributes(state);
  skipSpace(state);
  if (state.source.startsWith("/>", state.i)) {
    state.i += 2;
    return { name, attrs, children: [], text: "" };
  }
  if (state.source[state.i] !== ">") throw new Error(`unclosed start tag ${name}`);
  state.i += 1;
  const children = readChildren(state, name);
  return { name, attrs, children, text: elementText(children) };
}

export function parseXml(source) {
  if (!source || !source.trim()) throw new Error("empty document");
  const state = { source, i: 0 };
  skipProlog(state);
  skipSpace(state);
  const root = readElement(state);
  skipSpace(state);
  if (state.i !== source.length) throw new Error(`trailing markup at ${state.i}`);
  return root;
}

export function elements(node, name) {
  return node.children.filter((child) => child.name === name);
}

export function one(node, name) {
  const found = elements(node, name);
  if (found.length !== 1) {
    throw new Error(`${node.name} has ${found.length} <${name}> elements`);
  }
  return found[0];
}
