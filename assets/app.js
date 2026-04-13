const EMAIL = "you@example.com";

function $(sel, root = document) {
  return root.querySelector(sel);
}

function showToast(message) {
  const el = $(".toast");
  if (!el) return;
  el.textContent = message;
  el.dataset.show = "true";
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => {
    el.dataset.show = "false";
  }, 1600);
}

function setupYear() {
  const y = new Date().getFullYear();
  const el = document.querySelector("[data-year]");
  if (el) el.textContent = String(y);
}

function setupNav() {
  const nav = $(".nav");
  const toggle = $(".nav__toggle");
  const links = $("#nav-links");
  if (!nav || !toggle || !links) return;

  function setOpen(open) {
    nav.dataset.open = open ? "true" : "false";
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  toggle.addEventListener("click", () => {
    setOpen(nav.dataset.open !== "true");
  });

  links.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (a) setOpen(false);
  });

  document.addEventListener("click", (e) => {
    if (!nav.contains(e.target)) setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
}

async function copyEmail() {
  try {
    await navigator.clipboard.writeText(EMAIL);
    showToast("Đã copy email.");
  } catch {
    const ok = window.prompt("Copy email:", EMAIL);
    if (ok !== null) showToast("Bạn có thể dán email vừa copy.");
  }
}

function setupCopyEmail() {
  const btn = document.querySelector("[data-copy-email]");
  if (!btn) return;
  btn.addEventListener("click", copyEmail);
}

function setupReveal() {
  const targets = document.querySelectorAll(
    [
      ".hero__content",
      ".hero__card",
      ".section__head",
      ".panel",
      ".proj",
      ".contact",
      ".meta__item",
      ".stat",
    ].join(",")
  );

  for (const el of targets) el.classList.add("reveal");

  if (!("IntersectionObserver" in window)) {
    for (const el of targets) el.classList.add("is-visible");
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.18, rootMargin: "0px 0px -10% 0px" }
  );

  for (const el of targets) io.observe(el);
}

setupYear();
setupNav();
setupCopyEmail();
setupReveal();
