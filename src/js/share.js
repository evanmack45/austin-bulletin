export async function shareOrCopy({ title, url, canShare, share, writeText }) {
  if (canShare) {
    try {
      await share({ title, url });
      return "";
    } catch (error) {
      if (error?.name === "AbortError") return "";
    }
  }
  await writeText(url);
  return "Story link copied";
}

function showCopied(status) {
  if (!status) return;
  status.textContent = "Story link copied";
  window.setTimeout(() => {
    if (status.textContent === "Story link copied") status.textContent = "";
  }, 4000);
}

async function onClick(button) {
  const url = button.getAttribute("data-share-url") || "";
  const title = button.getAttribute("data-share-title") || "";
  const block = button.closest(".story-share");
  try {
    const message = await shareOrCopy({
      title,
      url,
      canShare: typeof navigator.share === "function",
      share: (data) => navigator.share(data),
      writeText: (value) => navigator.clipboard.writeText(value)
    });
    if (message) showCopied(block?.querySelector(".story-share-status"));
  } catch {
    const link = block?.querySelector(".story-share-link");
    if (link) link.hidden = false;
  }
}

async function onAnchor(link) {
  const url = link.href;
  const title = link.getAttribute("data-share-title") || "";
  const word = link.querySelector(".share-word");
  const previous = word ? word.textContent : "";
  try {
    const message = await shareOrCopy({
      title,
      url,
      canShare: typeof navigator.share === "function",
      share: (data) => navigator.share(data),
      writeText: (value) => navigator.clipboard.writeText(value)
    });
    if (message && word) {
      word.textContent = "Copied";
      window.setTimeout(() => {
        if (word.textContent === "Copied") word.textContent = previous;
      }, 4000);
    }
  } catch {
    window.location.assign(url);
  }
}

function boot() {
  for (const link of document.querySelectorAll("a.share")) {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      onAnchor(link);
    });
  }
  for (const block of document.querySelectorAll(".story-share")) {
    const link = block.querySelector(".story-share-link");
    const button = block.querySelector(".story-share-button");
    if (!button) continue;
    if (link) link.hidden = true;
    button.hidden = false;
    button.addEventListener("click", () => {
      onClick(button);
    });
  }
}

if (typeof document !== "undefined") boot();
