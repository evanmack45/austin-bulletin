const ROW_SELECTOR = ".source-line, .srcline, .src";

function isSourceRow(row) {
  if (row.parentElement?.closest(ROW_SELECTOR)) return false;
  if (row.querySelector(".source-label, .src-k")) return true;
  return /^\s*(?:More sources|Sources?):/.test(row.textContent || "");
}

function onScreen(row) {
  const style = getComputedStyle(row);
  if (style.display === "none" || style.visibility === "hidden") return false;
  return row.getClientRects().length > 0;
}

function showPacked(row) {
  for (const node of row.querySelectorAll("[data-packed]")) {
    node.hidden = false;
    delete node.dataset.packed;
  }
}

function markHidden(node) {
  node.hidden = true;
  node.dataset.packed = "1";
}

function sepBefore(link) {
  const prev = link.previousElementSibling;
  if (prev?.classList.contains("sep")) return prev;
  const group = link.parentElement?.previousElementSibling;
  if (!group || group.querySelector("a")) return null;
  return group.querySelector(".sep");
}

function hideLink(link) {
  markHidden(link);
  const sep = sepBefore(link);
  if (sep) markHidden(sep);
}

function fits(row) {
  return row.scrollWidth <= row.clientWidth + 1;
}

function clipLabel(row, on) {
  const label = row.querySelector(".source-label, .src-k, :scope > span");
  row.classList.toggle("is-clip-label", Boolean(on && label));
}

function openRow(row, button) {
  row.dataset.packedOpen = "1";
  row.classList.add("is-expanded");
  row.classList.remove("is-clip-label");
  showPacked(row);
  button.remove();
}

function ensureButton(row) {
  const existing = row.querySelector(":scope > .src-more");
  if (existing) return existing;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "src-more";
  button.hidden = true;
  button.addEventListener("click", () => openRow(row, button));
  row.append(button);
  return button;
}

function packRow(row) {
  if (row.dataset.packedOpen === "1" || !onScreen(row)) return;
  const button = ensureButton(row);
  const links = [...row.querySelectorAll("a")];
  showPacked(row);
  button.hidden = true;
  clipLabel(row, false);
  if (fits(row)) {
    button.remove();
    return;
  }
  button.hidden = false;
  let hidden = 0;
  for (let index = links.length - 1; index >= 0; index -= 1) {
    hideLink(links[index]);
    hidden += 1;
    button.textContent = `+${hidden} more`;
    if (fits(row)) return;
  }
  clipLabel(row, true);
}

export function packSourceRows(root = document) {
  const scope = root.querySelectorAll ? root : document;
  for (const row of scope.querySelectorAll(ROW_SELECTOR)) {
    if (isSourceRow(row)) packRow(row);
  }
  document.documentElement.dataset.sourcePack = "1";
}

function boot() {
  window.packSourceRows = packSourceRows;
  packSourceRows(document);
  document.fonts?.ready.then(() => packSourceRows(document));
  let frame = 0;
  const packSoon = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => packSourceRows(document));
  };
  window.addEventListener("resize", packSoon);
  document.addEventListener("toggle", (event) => {
    if (event.target?.nodeName === "DETAILS") packSourceRows(event.target);
  }, true);
  const fontWatch = new MutationObserver(() => packSourceRows(document));
  fontWatch.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["style"]
  });
}

boot();
