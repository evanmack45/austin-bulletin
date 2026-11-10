const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const params = new URLSearchParams(location.search);
const path = location.pathname.replace(/\/index\.html$/, "/");
if (params.get("v") === "b" && !path.endsWith("/b/")) location.replace("/b/");
else if (params.get("v") === "a" && path.endsWith("/b/")) location.replace("/");

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

function countTo(node, end) {
  const start = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - start) / 900);
    node.textContent = String(t === 1 ? end : Math.round(end * (1 - (1 - t) ** 3)));
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (!reduce) {
  const seen = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.intersectionRatio < 0.4) continue;
      entry.target.classList.add("is-in");
      const num = entry.target.querySelector("[data-count]");
      if (num) countTo(num, Number(num.dataset.count));
      seen.unobserve(entry.target);
    }
  }, { threshold: [0.4] });
  document.querySelectorAll("[data-animate]").forEach((el) => seen.observe(el));
}
