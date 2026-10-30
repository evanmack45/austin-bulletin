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
  return "Link copied";
}

function showCopied(status) {
  if (!status) return;
  status.textContent = "Link copied";
  window.setTimeout(() => {
    if (status.textContent === "Link copied") status.textContent = "";
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

function boot() {
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
