const EMAIL = "duchoa0741@gmail.com";
const CONTACT_ENDPOINT = "/api/contact";

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

async function submitContactForm(form) {
  const fd = new FormData(form);
  const payload = {
    name: String(fd.get("name") || "").trim(),
    email: String(fd.get("email") || "").trim(),
    message: String(fd.get("message") || "").trim(),
  };

  const btn = form.querySelector('button[type="submit"]');
  const prevText = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Đang gửi...";
  }

  try {
    const res = await fetch(CONTACT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || "Gửi thất bại. Vui lòng thử lại.");
    }

    form.reset();
    showToast("Đã gửi. Mình sẽ phản hồi sớm.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = prevText || "Gửi";
    }
  }
}

function setupContactForm() {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await submitContactForm(form);
    } catch (err) {
      showToast(err?.message || "Gửi thất bại. Vui lòng thử lại.");
    }
  });
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
setupContactForm();
setupReveal();
