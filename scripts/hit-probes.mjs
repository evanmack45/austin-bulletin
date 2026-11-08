const TARGETS = ".council-did a, .about-page main a";

export function expandedHitAt(index) {
  const links = [...document.querySelectorAll(".council-did a, .about-page main a")];
  const link = links[index];
  if (!link) return { count: links.length, misses: [], points: [] };
  link.scrollIntoView({ block: "center", inline: "nearest" });
  const samples = [];
  [...link.getClientRects()].forEach((rect, line) => {
    const x = rect.left + Math.min(12, rect.width / 2);
    const mid = rect.top + rect.height / 2;
    const named = [
      [`line${line}-center`, rect.left + rect.width / 2, mid],
      [`line${line}-left`, rect.left + 1, mid],
      [`line${line}-right`, Math.max(rect.left + 1, rect.right - 1), mid],
      [`line${line}-top`, x, rect.top + 1],
      [`line${line}-bottom`, x, rect.bottom - 1]
    ];
    named.forEach(([name, px, py]) => samples.push({ name, x: px, y: py }));
  });
  const href = link.getAttribute("href");
  const text = link.textContent.trim().replace(/\s+/g, " ").slice(0, 60);
  const misses = [];
  const points = [];
  for (const sample of samples) {
    const top = document.elementFromPoint(sample.x, sample.y);
    const stack = document.elementsFromPoint(sample.x, sample.y).slice(0, 3).map((el) => (
      el === link ? "self" : String(el.className || el.tagName).slice(0, 40)
    ));
    const covered = Boolean(top) && (top === link || link.contains(top));
    if (covered) points.push(sample);
    else misses.push({ name: sample.name, text, top: top ? stack[0] : "none", stack });
  }
  return {
    count: links.length,
    href,
    text,
    lines: link.getClientRects().length,
    misses,
    points
  };
}

export async function coverExpandedHits(page) {
  await page.evaluate(() => {
    document.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.__clicked = event.target.closest("a")?.getAttribute("href") || "";
    }, true);
  });
  const count = await page.evaluate(
    (selector) => document.querySelectorAll(selector).length,
    TARGETS
  );
  const misses = [];
  let clicks = 0;
  for (let index = 0; index < count; index += 1) {
    const probe = await page.evaluate(expandedHitAt, index);
    misses.push(...probe.misses);
    for (const point of probe.points) {
      await page.evaluate(() => { window.__clicked = ""; });
      await page.mouse.click(point.x, point.y);
      const clicked = await page.evaluate(() => window.__clicked);
      clicks += 1;
      if (clicked !== probe.href) {
        misses.push({ name: `${point.name}-click`, text: probe.text, clicked });
      }
    }
  }
  return { count, clicks, misses };
}
