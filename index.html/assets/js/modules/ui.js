// ═══════════════════════════════════════════════════════════════
// ALPHA PACK — UI Utilities v5.0
// ═══════════════════════════════════════════════════════════════

export const UI = (() => {
  // ── DOM helpers ─────────────────────────────────────────────
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

  // ── Toast ─────────────────────────────────────────────────────
  const TOAST_ICO = { success:"✓", error:"✕", warn:"⚠", info:"ℹ" };
  const toast = (msg, type = "info", ms = 4500) => {
    let host = $("#toastHost");
    if (!host) { host = document.createElement("div"); host.id = "toastHost"; document.body.appendChild(host); }
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span class="toast-ico">${TOAST_ICO[type]||"ℹ"}</span><div class="toast-body"><div class="toast-title">${{success:"Done",error:"Error",warn:"Heads up",info:"Info"}[type]||type}</div><div class="toast-msg">${esc(msg)}</div></div><button class="toast-x" aria-label="close">✕</button>`;
    host.appendChild(el);
    el.querySelector(".toast-x").onclick = () => dismiss(el);
    el._t = setTimeout(() => dismiss(el), ms);
    return el;
  };
  const dismiss = (el) => {
    clearTimeout(el._t); el.classList.add("out");
    setTimeout(() => el.remove(), 300);
  };

  // ── Loader ───────────────────────────────────────────────────
  const loader = {
    show() {
      let el = $("#pageLoader");
      if (!el) {
        el = document.createElement("div"); el.id = "pageLoader";
        el.innerHTML = `<div class="loader-mark">AP</div><div class="loader-track"><div class="loader-bar"></div></div><div class="loader-label">Loading</div>`;
        document.body.appendChild(el);
      }
      el.classList.remove("fade");
    },
    hide() {
      const el = $("#pageLoader");
      if (el) { el.classList.add("fade"); setTimeout(() => el.remove(), 380); }
    }
  };

  // ── Nav ──────────────────────────────────────────────────────
  const initNav = () => {
    const nav = $(".nav");
    if (!nav) return;
    const onScroll = () => nav.classList.toggle("solid", window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const burger = $("#navBurger"), drawer = $("#navDrawer");
    if (burger && drawer) {
      burger.addEventListener("click", () => {
        burger.classList.toggle("active"); drawer.classList.toggle("open");
        document.body.style.overflow = drawer.classList.contains("open") ? "hidden" : "";
      });
      $$("#navDrawer a").forEach(a => a.addEventListener("click", () => {
        burger.classList.remove("active"); drawer.classList.remove("open"); document.body.style.overflow = "";
      }));
    }

    // Active link
    const path = location.pathname.split("/").pop() || "index.html";
    $$(".nav-link, .nav-drawer-link").forEach(a => {
      const href = (a.getAttribute("href") || "").split("/").pop();
      a.classList.toggle("active", href === path);
    });
  };

  // ── Particles canvas ─────────────────────────────────────────
  const initParticles = () => {
    const c = $("#particleCanvas");
    if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let w, h;

    const resize = () => {
      w = innerWidth; h = innerHeight;
      c.width = Math.floor(w * dpr); c.height = Math.floor(h * dpr);
      c.style.width = w + "px"; c.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * 1920, y: Math.random() * 1080,
      vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25,
      r: .6 + Math.random() * 1.2
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(240,168,50,.38)"; ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.hypot(dx, dy);
          if (d < 120) {
            ctx.strokeStyle = `rgba(240,168,50,${(1 - d/120) * .055})`;
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    resize(); window.addEventListener("resize", resize, { passive: true }); draw();
    return () => cancelAnimationFrame(raf);
  };

  // ── Reveal on scroll ─────────────────────────────────────────
  const initReveal = () => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: "0px 0px -32px 0px" });
    $$(".reveal").forEach(el => io.observe(el));
  };

  // ── FAQ accordion ─────────────────────────────────────────────
  const initFAQ = () => {
    $$(".faq-item").forEach(item => {
      item.querySelector(".faq-q")?.addEventListener("click", () => {
        const was = item.classList.contains("open");
        $$(".faq-item").forEach(i => i.classList.remove("open"));
        if (!was) item.classList.add("open");
      });
    });
  };

  // ── Password toggles ─────────────────────────────────────────
  const initPwToggles = () => {
    $$(".pw-eye").forEach(btn => {
      const inp = btn.previousElementSibling;
      if (!inp) return;
      btn.addEventListener("click", () => {
        const show = inp.type === "password";
        inp.type = show ? "text" : "password";
        btn.textContent = show ? "🙈" : "👁";
      });
    });
  };

  // ── Upload zone ───────────────────────────────────────────────
  const initUpload = (zoneId, inputId, previewId, cb) => {
    const zone = $(`#${zoneId}`), inp = $(`#${inputId}`), prev = $(`#${previewId}`);
    if (!zone) return;
    zone.addEventListener("click", () => inp?.click());
    zone.addEventListener("dragover", e => { e.preventDefault(); zone.classList.add("drag"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag"));
    zone.addEventListener("drop", e => { e.preventDefault(); zone.classList.remove("drag"); handle(e.dataTransfer.files?.[0]); });
    inp?.addEventListener("change", () => handle(inp.files?.[0]));
    const handle = (file) => {
      if (!file?.type.startsWith("image/")) { toast("Please upload an image file.", "warn"); return; }
      const r = new FileReader();
      r.onload = e => {
        if (prev) { prev.src = e.target.result; prev.classList.add("on"); }
        zone.style.borderColor = "var(--amber)";
        cb?.(file, e.target.result);
      };
      r.readAsDataURL(file);
    };
  };

  // ── Modal ─────────────────────────────────────────────────────
  const openModal = id => {
    const el = $(`#${id}`); if (!el) return;
    el.classList.add("open"); document.body.style.overflow = "hidden";
    el.addEventListener("click", e => { if (e.target === el) closeModal(id); }, { once: true });
  };
  const closeModal = id => {
    const el = $(`#${id}`); if (!el) return;
    el.classList.remove("open"); document.body.style.overflow = "";
  };

  // ── Ticker duplicate ──────────────────────────────────────────
  const initTicker = () => {
    const t = $(".ticker-inner"); if (t) t.innerHTML += t.innerHTML;
  };

  // ── Set year ──────────────────────────────────────────────────
  const setYear = () => $$(".ap-year").forEach(el => el.textContent = new Date().getFullYear());

  // ── Btn loading ───────────────────────────────────────────────
  const setBtnLoading = (btn, on, txt) => {
    if (!btn) return;
    if (on) { btn._orig = btn.innerHTML; btn.innerHTML = `<span class="btn-label">${txt||"Please wait"}</span>`; btn.classList.add("loading"); btn.disabled = true; }
    else    { btn.innerHTML = btn._orig || btn.innerHTML; btn.classList.remove("loading"); btn.disabled = false; }
  };

  // ── Format ────────────────────────────────────────────────────
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-BW", { day:"2-digit", month:"short", year:"numeric" }) : "—";
  const fmtAgo  = (d) => {
    if (!d) return "—";
    const s = (Date.now() - new Date(d)) / 1000;
    if (s < 60)   return "just now";
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  };

  // ── Safe async wrapper ────────────────────────────────────────
  const safe = (fn) => async (...args) => {
    try { return await fn(...args); }
    catch (e) { console.error("[AP]", e); toast(e?.message || "Something went wrong. Please try again.", "error"); }
  };

  // ── WhatsApp link ─────────────────────────────────────────────
  const waLink = (phone, msg = "") => `https://wa.me/${phone.replace(/\D/g,"")}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;

  // ── Init all ──────────────────────────────────────────────────
  const init = () => { initNav(); initReveal(); initParticles(); initFAQ(); initPwToggles(); initTicker(); setYear(); };

  return { $, $$, esc, toast, loader, initNav, initReveal, initParticles, initFAQ, initPwToggles, initUpload, openModal, closeModal, initTicker, setYear, setBtnLoading, fmtDate, fmtAgo, safe, waLink, init };
})();
