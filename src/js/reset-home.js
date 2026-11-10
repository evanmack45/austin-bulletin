const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

const card = document.querySelector("#pin-card");
const pins = JSON.parse(document.querySelector("#week-pins")?.textContent || "[]");

function closePins() {
  document.querySelectorAll(".pin.is-selected").forEach((pin) => {
    pin.classList.remove("is-selected");
    pin.setAttribute("aria-expanded", "false");
  });
  if (card) card.hidden = true;
}

document.querySelectorAll(".pin").forEach((pin) => {
  pin.addEventListener("click", (event) => {
    if (!card || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const same = pin.classList.contains("is-selected");
    closePins();
    if (same) return;
    event.preventDefault();
    const list = card.querySelector("ul");
    list.replaceChildren();
    for (const item of pins[Number(pin.dataset.pin)]?.items || []) {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = item.link;
      link.textContent = item.headline;
      li.append(link);
      list.append(li);
    }
    card.hidden = false;
    pin.classList.add("is-selected");
    pin.setAttribute("aria-expanded", "true");
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePins();
});

function paintCount(node, end) {
  node.textContent = String(end);
}

function countTo(node, end) {
  const start = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - start) / 900);
    if (t === 1) {
      paintCount(node, end);
      return;
    }
    node.textContent = String(Math.round(end * (1 - (1 - t) ** 3)));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

document.querySelectorAll("[data-count]").forEach((node) => {
  const end = Number(node.dataset.count);
  if (Number.isFinite(end)) paintCount(node, end);
});

if (reduce) {
  document.querySelectorAll("[data-animate]").forEach((el) => el.classList.add("is-in"));
} else {
  const seen = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.intersectionRatio < 0.4) continue;
      entry.target.classList.add("is-in");
      const num = entry.target.querySelector("[data-count]");
      const end = Number(num?.dataset.count);
      if (num && Number.isFinite(end)) countTo(num, end);
      seen.unobserve(entry.target);
    }
  }, { threshold: [0.4] });
  document.querySelectorAll("[data-animate]").forEach((el) => seen.observe(el));
}
