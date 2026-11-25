// Scroll story for /austin-311-visual/. The step that has crossed the
// trigger line sets the stage's data-step and data-scene; CSS does the rest.
const story = typeof document === "undefined" ? null : document.getElementById("story");
const stage = story?.querySelector(".sv-stage");
const steps = story ? [...story.querySelectorAll(".sv-step")] : [];

export function activeStep(tops, line) {
  let index = 0;
  tops.forEach((top, i) => { if (top < line) index = i; });
  return index;
}

if (stage && steps.length && "IntersectionObserver" in window) {
  story.classList.add("is-live");
  let current = -1;
  let queued = false;
  const pick = () => {
    queued = false;
    const wide = window.matchMedia("(min-width: 900px)").matches;
    const line = window.innerHeight * (wide ? 0.6 : 0.78);
    const index = activeStep(steps.map((s) => s.getBoundingClientRect().top), line);
    if (index === current) return;
    steps[current]?.classList.remove("is-active");
    current = index;
    const step = steps[index];
    step.classList.add("is-active");
    stage.dataset.step = step.dataset.step;
    stage.dataset.scene = step.dataset.scene;
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(pick); } };
  const io = new IntersectionObserver(queue, { rootMargin: "0px 0px -22% 0px", threshold: [0, 1] });
  steps.forEach((s) => io.observe(s));
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  pick();
}
