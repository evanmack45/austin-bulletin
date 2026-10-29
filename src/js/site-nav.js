function setExpanded(button, open) {
  button.setAttribute("aria-expanded", open ? "true" : "false");
}

function bindMenu(button, panel) {
  const toggle = (open) => {
    setExpanded(button, open);
    panel.classList.toggle("is-open", open);
  };
  toggle(button.getAttribute("aria-expanded") === "true");
  button.addEventListener("click", (event) => {
    event.preventDefault();
    toggle(button.getAttribute("aria-expanded") !== "true");
  });
  button.addEventListener("keydown", (event) => {
    if (event.key !== " " && event.key !== "Escape") return;
    event.preventDefault();
    toggle(event.key === " " && button.getAttribute("aria-expanded") !== "true");
  });
}

function bindTopics(details) {
  const summary = details.querySelector(".topics-button");
  if (!summary) return;
  const sync = () => setExpanded(summary, details.open);
  sync();
  details.addEventListener("toggle", sync);
}

const menuButton = document.querySelector(".site-menu-button");
const menuPanel = document.getElementById("site-menu-panel");
if (menuButton && menuPanel) bindMenu(menuButton, menuPanel);

const topicsMenu = document.querySelector(".topics-menu");
if (topicsMenu) bindTopics(topicsMenu);
