/* =========================
   Alpha Pack v2.0 App JS
   - Skins + theme toggle
   - Register -> Login -> KYC -> Apply
   - Admin (role gated) + analytics
   - CMS settings (edit homepage without code)
   - Robust error handling (no crashing)
   ========================= */

(() => {
  "use strict";

  // ---------- Storage Keys ----------
  const K = {
    THEME: "apcs_theme",     // locked single theme
    SESSION: "apcs_session",
    USERS: "apcs_users",
    LOANS: "apcs_loans",
    CMS: "apcs_cms",
    AUDIT: "apcs_audit",
  };

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const nowISO = () => new Date().toISOString();

  function safeJSONParse(raw, fallback) {
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  function read(key, fallback) {
    return safeJSONParse(localStorage.getItem(key), fallback);
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function uid() {
    return (crypto?.randomUUID ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`);
  }

  function escapeHTML(s) {
    return String(s)
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  // ---------- Toasts ----------
  function ensureToastHost() {
    let host = $("#toastHost");
    if (!host) {
      host = document.createElement("div");
      host.id = "toastHost";
      host.className = "toast-container position-fixed top-0 end-0 p-3";
      host.style.zIndex = "1100";
      document.body.appendChild(host);
    }
    return host;
  }

  function toast(msg, type = "info") {
    try {
      const host = ensureToastHost();
      const el = document.createElement("div");
      const bg =
        type === "success" ? "text-bg-success" :
        type === "error" ? "text-bg-danger" :
        type === "warn" ? "text-bg-warning" : "text-bg-dark";

      el.className = `toast align-items-center ${bg} border-0`;
      el.role = "alert";
      el.ariaLive = "assertive";
      el.ariaAtomic = "true";
      el.innerHTML = `
        <div class="d-flex">
          <div class="toast-body">${escapeHTML(msg)}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>`;
      host.appendChild(el);

      // bootstrap.Toast exists because pages load bootstrap bundle
      const t = new bootstrap.Toast(el, { delay: 3200 });
      t.show();

      el.addEventListener("hidden.bs.toast", () => el.remove());
    } catch {
      // fallback
      alert(msg);
    }
  }

  function safeRun(fn) {
    return (...args) => {
      try { return fn(...args); }
      catch (e) {
        console.error(e);
        toast("Something went wrong. Please try again.", "error");
      }
    };
  }

  // ---------- Global error handling ----------
  window.addEventListener("error", (e) => {
    console.error("Global error:", e.error || e.message);
    toast("Unexpected error occurred. Refresh the page if needed.", "error");
  });
  window.addEventListener("unhandledrejection", (e) => {
    console.error("Unhandled promise:", e.reason);
    toast("Network or processing error. Try again.", "error");
  });

  // ---------- Theme + Skin ----------
  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(K.THEME, theme);
  }
  function initTheme() {
    const singleTheme = "dark";
    setTheme(singleTheme);
    document.documentElement.setAttribute("data-skin", "professional");
    localStorage.setItem(K.THEME, singleTheme);

    ["#themeToggle", "#themeToggleMobile", "#skinSelect"].forEach((sel) => {
      $$(sel).forEach((el) => {
        el.setAttribute("hidden", "hidden");
        el.setAttribute("aria-hidden", "true");
      });
    });
  }
  function themeNow() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }

  // ---------- FX Background (particles) ----------
  function initFX() {
    const wrap = $(".fx-wrap");
    const canvas = $("#fxCanvas");
    if (!wrap || !canvas) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduced) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      w = wrap.clientWidth;
      h = wrap.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const N = 70;
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: 1 + Math.random() * 1.6
    }));

    function frame() {
      ctx.clearRect(0, 0, w, h);

      // soft dots
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fill();
      }

      // subtle lines
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 110) {
            const alpha = (1 - dist / 110) * 0.09;
            ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    requestAnimationFrame(frame);
  }

  // ---------- Reveal ----------
  function initReveal() {
    const items = $$(".reveal");
    if (!items.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("is-visible"); });
    }, { threshold: 0.12 });
    items.forEach(el => io.observe(el));
  }

  // ---------- Data model ----------
  function initDataOnce() {
    const users = read(K.USERS, []);
    const cms = read(K.CMS, null);

    // Default CMS (editable from admin-settings.html)
    if (!cms) {
      write(K.CMS, {
        heroTitle: "Fast and secure personal loans for salaried and self-employed clients.",
        heroHighlight: "secure",
        heroSubtitle: "AlphaPack Cash Solutions provides transparent micro-loans, structured repayments, and trusted support for households and small businesses.",
        heroCtaPrimary: "Start your loan application",
        heroCtaSecondary: "Open client dashboard",
        heroImageDataUrl: "",
        contactPhone: "+267 71 000 000",
        contactEmail: "support@alphapackcash.co.bw",
        officeAddress: "Plot 2457, Gaborone CBD, Botswana",
        adHeadline: "Promote your business to our active borrower network.",
        adCopy: "Reserve ad slots on our homepage and dashboard for paid monthly campaigns.",
        features: [
          { icon: "bi-shield-check", title: "Transparent pricing", desc: "No hidden fees, just clear repayment plans." },
          { icon: "bi-speedometer2", title: "Fast approvals", desc: "Most eligible borrowers get a decision the same day." },
          { icon: "bi-phone", title: "Built for mobile money", desc: "Repay from your phone with reminders and progress alerts." }
        ]
      });
    }

    // Ensure arrays exist
    if (!Array.isArray(users)) write(K.USERS, []);
    if (!Array.isArray(read(K.LOANS, []))) write(K.LOANS, []);
    if (!Array.isArray(read(K.AUDIT, []))) write(K.AUDIT, []);
  }

  // ---------- Auth (Prototype) ----------
  async function sha256(text) {
    // WebCrypto requires localhost/https
    if (!crypto?.subtle) return null;
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function session() {
    return read(K.SESSION, null);
  }

  function setSession(s) {
    write(K.SESSION, s);
  }

  function clearSession() {
    localStorage.removeItem(K.SESSION);
  }

  function audit(event, meta = {}) {
    const log = read(K.AUDIT, []);
    log.push({ id: uid(), at: nowISO(), event, meta });
    write(K.AUDIT, log);
  }

  async function registerUser({ name, email, password }) {
    const users = read(K.USERS, []);
    const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) throw new Error("Account already exists. Log in instead.");

    const hash = await sha256(password);
    if (!hash) {
      // fallback (prototype only)
      console.warn("WebCrypto not available. Password not hashed. Run on localhost.");
    }

    const user = {
      id: uid(),
      name,
      email,
      pwHash: hash || password,
      role: "user",
      kyc: { status: "not_started", docs: {} }, // not_started | pending | approved | rejected
      createdAt: nowISO(),
    };

    users.push(user);
    write(K.USERS, users);

    setSession({ userId: user.id, role: user.role });
    audit("register", { email: user.email });
    return user;
  }

  async function loginUser({ email, password }) {
    const users = read(K.USERS, []);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new Error("No account found. Please create an account first.");

    const hash = await sha256(password);
    const ok = (user.pwHash === (hash || password));
    if (!ok) throw new Error("Invalid password.");

    setSession({ userId: user.id, role: user.role });
    audit("login", { email: user.email, role: user.role });
    return user;
  }

  function currentUser() {
    const s = session();
    if (!s?.userId) return null;
    const users = read(K.USERS, []);
    return users.find(u => u.id === s.userId) || null;
  }

  function updateUser(updated) {
    const users = read(K.USERS, []);
    const idx = users.findIndex(u => u.id === updated.id);
    if (idx >= 0) {
      users[idx] = updated;
      write(K.USERS, users);
    }
  }

  // ---------- Guards ----------
  function requireAuth() {
    if (!session()?.userId) {
      toast("Please log in first.", "warn");
      location.href = "login.html";
      return false;
    }
    return true;
  }

  function requireKycApproved() {
    const user = currentUser();
    if (!user) return false;

    if (user.kyc?.status !== "approved") {
      toast("Verification required before applying.", "warn");
      location.href = "verify.html";
      return false;
    }
    return true;
  }

  function requireAdmin() {
    const s = session();
    if (!s?.userId || s.role !== "admin") {
      toast("Admin access only.", "error");
      location.href = "login.html";
      return false;
    }
    return true;
  }

  // ---------- Loans ----------
  function createLoanRequest(payload) {
    const user = currentUser();
    if (!user) throw new Error("Not authenticated.");

    const loans = read(K.LOANS, []);
    const item = {
      id: uid(),
      userId: user.id,
      amount: payload.amount,
      term: payload.term,
      employer: payload.employer,
      income: payload.income,
      purpose: payload.purpose,
      status: "pending", // pending | approved | declined
      createdAt: nowISO(),
      decision: null,
      rate: 0.12, // demo rate (12%)
      feeRate: 0.00
    };
    loans.push(item);
    write(K.LOANS, loans);
    audit("loan_submit", { loanId: item.id, amount: item.amount });
    return item;
  }

  function loansForUser(userId) {
    return read(K.LOANS, []).filter(l => l.userId === userId);
  }

  // ---------- CMS apply to homepage ----------
  function applyCMS() {
    const cms = read(K.CMS, null);
    if (!cms) return;

    const titleEl = $("#heroTitle");
    const subEl = $("#heroSubtitle");
    const cta1 = $("#heroCtaPrimary");
    const cta2 = $("#heroCtaSecondary");
    const img = $("#heroImage");
    const phone = $("#businessPhone");
    const email = $("#businessEmail");
    const address = $("#businessAddress");
    const adHeadline = $("#adHeadline");
    const adCopy = $("#adCopy");

    if (titleEl) titleEl.innerHTML = escapeHTML(cms.heroTitle).replace(
      escapeHTML(cms.heroHighlight || ""),
      `<span class="gradient-text">${escapeHTML(cms.heroHighlight || "")}</span>`
    );
    if (subEl) subEl.textContent = cms.heroSubtitle || "";
    if (cta1) cta1.textContent = cms.heroCtaPrimary || "Start application";
    if (cta2) cta2.textContent = cms.heroCtaSecondary || "Dashboard demo";

    if (img && cms.heroImageDataUrl) {
      img.src = cms.heroImageDataUrl;
      img.classList.remove("d-none");
    }

    if (phone) phone.textContent = cms.contactPhone || "";
    if (email) email.textContent = cms.contactEmail || "";
    if (address) address.textContent = cms.officeAddress || "";
    if (adHeadline) adHeadline.textContent = cms.adHeadline || "";
    if (adCopy) adCopy.textContent = cms.adCopy || "";

    // features
    const feats = cms.features || [];
    feats.forEach((f, i) => {
      const card = $(`[data-feature="${i}"]`);
      if (!card) return;
      const icon = card.querySelector("[data-f-icon]");
      const t = card.querySelector("[data-f-title]");
      const d = card.querySelector("[data-f-desc]");
      if (icon) icon.className = `bi ${f.icon} fs-4`;
      if (t) t.textContent = f.title || "";
      if (d) d.textContent = f.desc || "";
    });
  }

  // ---------- KYC (verify.html) ----------
  async function fileToDataUrl(file) {
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("Failed to read file"));
      r.readAsDataURL(file);
    });
  }

  function initVerifyPage() {
    const form = $("#kycForm");
    if (!form) return;

    if (!requireAuth()) return;

    const user = currentUser();
    const statusEl = $("#kycStatus");
    const frontPrev = $("#frontPreview");
    const backPrev = $("#backPreview");
    const saveBtn = $("#kycSave");
    const camBtn = $("#openCam");
    const snapBtn = $("#snap");
    const closeCamBtn = $("#closeCam");
    const video = $("#camVideo");
    const canvas = $("#camCanvas");
    const useSnapFront = $("#useSnapFront");
    const useSnapBack = $("#useSnapBack");

    function renderStatus() {
      const u = currentUser();
      const s = u?.kyc?.status || "not_started";
      if (!statusEl) return;
      statusEl.textContent = `Status: ${s}`;
      statusEl.className = "pill";
    }

    // preload previews
    if (user?.kyc?.docs?.front && frontPrev) frontPrev.src = user.kyc.docs.front;
    if (user?.kyc?.docs?.back && backPrev) backPrev.src = user.kyc.docs.back;

    renderStatus();

    // camera
    let stream = null;
    async function openCam() {
      if (!video) return;
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      video.srcObject = stream;
      video.play();
      $("#camModal")?.classList.remove("d-none");
    }
    function closeCam() {
      if (stream) stream.getTracks().forEach(t => t.stop());
      stream = null;
      $("#camModal")?.classList.add("d-none");
    }
    function snap() {
      if (!video || !canvas) return;
      const ctx = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      toast("Snapshot captured. Choose Front/Back.", "success");
    }
    function snapDataUrl() {
      if (!canvas) return "";
      return canvas.toDataURL("image/jpeg", 0.9);
    }

    if (camBtn) camBtn.addEventListener("click", safeRun(async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast("Camera not supported. Use upload.", "warn");
        return;
      }
      await openCam();
    }));
    if (closeCamBtn) closeCamBtn.addEventListener("click", safeRun(closeCam));
    if (snapBtn) snapBtn.addEventListener("click", safeRun(snap));

    if (useSnapFront) useSnapFront.addEventListener("click", safeRun(() => {
      const d = snapDataUrl();
      if (!d) return toast("No snapshot yet.", "warn");
      if (frontPrev) frontPrev.src = d;
      frontPrev.dataset.dataurl = d;
      toast("Front set from camera.", "success");
    }));
    if (useSnapBack) useSnapBack.addEventListener("click", safeRun(() => {
      const d = snapDataUrl();
      if (!d) return toast("No snapshot yet.", "warn");
      if (backPrev) backPrev.src = d;
      backPrev.dataset.dataurl = d;
      toast("Back set from camera.", "success");
    }));

    // uploads
    const frontFile = $("#frontFile");
    const backFile = $("#backFile");

    if (frontFile) frontFile.addEventListener("change", safeRun(async () => {
      const f = frontFile.files?.[0];
      if (!f) return;
      const d = await fileToDataUrl(f);
      if (frontPrev) frontPrev.src = d;
      frontPrev.dataset.dataurl = d;
    }));
    if (backFile) backFile.addEventListener("change", safeRun(async () => {
      const f = backFile.files?.[0];
      if (!f) return;
      const d = await fileToDataUrl(f);
      if (backPrev) backPrev.src = d;
      backPrev.dataset.dataurl = d;
    }));

    if (saveBtn) saveBtn.addEventListener("click", safeRun(() => {
      const u = currentUser();
      if (!u) return;
      const idType = $("#idType")?.value || "Omang";
      const front = frontPrev?.dataset.dataurl || u.kyc?.docs?.front || "";
      const back = backPrev?.dataset.dataurl || u.kyc?.docs?.back || "";

      if (!front) return toast("Upload/capture FRONT image.", "warn");
      if (!back) return toast("Upload/capture BACK image.", "warn");

      u.kyc = {
        status: "pending",
        docs: { idType, front, back },
        submittedAt: nowISO()
      };
      updateUser(u);
      audit("kyc_submit", { userId: u.id, idType });
      toast("Verification submitted. Await admin approval.", "success");
      renderStatus();
    }));

    $("#logoutBtn")?.addEventListener("click", safeRun(() => {
      clearSession();
      location.href = "login.html";
    }));
  }

  // ---------- Admin setup ----------
  function initAdminSetup() {
    const form = $("#adminSetupForm");
    if (!form) return;

    const users = read(K.USERS, []);
    const hasAdmin = users.some(u => u.role === "admin");

    if (hasAdmin) {
      toast("Admin already exists. Setup disabled.", "warn");
      $("#setupDisabled")?.classList.remove("d-none");
      form.querySelectorAll("input,button").forEach(el => el.disabled = true);
      return;
    }

    form.addEventListener("submit", safeRun(async (e) => {
      e.preventDefault();
      const name = String(form.name.value || "").trim();
      const email = String(form.email.value || "").trim();
      const password = String(form.password.value || "");

      if (name.length < 2) return toast("Name required.", "warn");
      if (!/^\S+@\S+\.\S+$/.test(email)) return toast("Valid email required.", "warn");
      if (password.length < 8) return toast("Use 8+ character password.", "warn");

      const hash = await sha256(password);

      const admin = {
        id: uid(), name, email,
        pwHash: hash || password,
        role: "admin",
        kyc: { status: "approved", docs: {} },
        createdAt: nowISO()
      };

      users.push(admin);
      write(K.USERS, users);
      setSession({ userId: admin.id, role: "admin" });
      audit("admin_setup", { email });

      toast("Admin created. Redirecting…", "success");
      setTimeout(() => (location.href = "admin.html"), 700);
    }));
  }

  // ---------- Admin dashboard ----------
  function adminAnalytics() {
    const loans = read(K.LOANS, []);
    const approved = loans.filter(l => l.status === "approved");
    const pending = loans.filter(l => l.status === "pending");
    const declined = loans.filter(l => l.status === "declined");

    // demo profit calc (rate on principal)
    const profit = approved.reduce((sum, l) => sum + Math.round(l.amount * (l.rate || 0.12)), 0);
    const disbursed = approved.reduce((sum, l) => sum + (l.amount || 0), 0);

    return { loans, approved, pending, declined, profit, disbursed };
  }

  function initAdminDashboard() {
    if (!$("#adminPage")) return;
    if (!requireAdmin()) return;

    const users = read(K.USERS, []);
    const { loans, approved, pending, declined, profit, disbursed } = adminAnalytics();

    $("#kpiPending") && ($("#kpiPending").textContent = String(pending.length));
    $("#kpiApproved") && ($("#kpiApproved").textContent = String(approved.length));
    $("#kpiDisbursed") && ($("#kpiDisbursed").textContent = `P ${disbursed.toLocaleString()}`);
    $("#kpiProfit") && ($("#kpiProfit").textContent = `P ${profit.toLocaleString()}`);

    // KYC pending table
    const kycPending = users.filter(u => u.role !== "admin" && u.kyc?.status === "pending");
    const kycT = $("#kycTable");
    if (kycT) {
      kycT.innerHTML = kycPending.length ? kycPending.map(u => `
        <tr>
          <td>${escapeHTML(u.name)}</td>
          <td class="text-muted small">${escapeHTML(u.email)}</td>
          <td>${escapeHTML(u.kyc.docs?.idType || "")}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-success" data-kyc-approve="${u.id}">Approve</button>
            <button class="btn btn-sm btn-danger ms-1" data-kyc-reject="${u.id}">Reject</button>
          </td>
        </tr>
      `).join("") : `<tr><td colspan="4" class="text-muted small py-3">No pending verifications.</td></tr>`;
    }

    // Loans table
    const loanT = $("#loanTable");
    if (loanT) {
      loanT.innerHTML = pending.length ? pending.map(l => {
        const u = users.find(x => x.id === l.userId);
        return `
          <tr>
            <td class="text-muted small">${new Date(l.createdAt).toLocaleString()}</td>
            <td>${escapeHTML(u?.name || "Unknown")}</td>
            <td class="text-muted small">${escapeHTML(u?.email || "")}</td>
            <td class="fw-semibold">P ${Number(l.amount).toLocaleString()}</td>
            <td>${escapeHTML(String(l.term))}m</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-secondary" data-loan-view="${l.id}">View</button>
              <button class="btn btn-sm btn-success ms-1" data-loan-approve="${l.id}">Approve</button>
              <button class="btn btn-sm btn-danger ms-1" data-loan-decline="${l.id}">Decline</button>
            </td>
          </tr>
        `;
      }).join("") : `<tr><td colspan="6" class="text-muted small py-3">No pending loan requests.</td></tr>`;
    }

    // handlers
    document.addEventListener("click", safeRun((e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;

      const kycApprove = t.getAttribute("data-kyc-approve");
      const kycReject = t.getAttribute("data-kyc-reject");
      const loanApprove = t.getAttribute("data-loan-approve");
      const loanDecline = t.getAttribute("data-loan-decline");
      const loanView = t.getAttribute("data-loan-view");

      if (kycApprove) return kycDecision(kycApprove, "approved");
      if (kycReject) return kycDecision(kycReject, "rejected");
      if (loanApprove) return loanDecision(loanApprove, "approved");
      if (loanDecline) return loanDecision(loanDecline, "declined");
      if (loanView) return showLoanModal(loanView);
    }));

    function kycDecision(userId, status) {
      const users = read(K.USERS, []);
      const u = users.find(x => x.id === userId);
      if (!u) return;
      u.kyc.status = status;
      u.kyc.reviewedAt = nowISO();
      write(K.USERS, users);
      audit("kyc_decision", { userId, status });
      toast(`KYC ${status} for ${u.email}`, "success");
      location.reload();
    }

    function loanDecision(loanId, status) {
      const loans = read(K.LOANS, []);
      const l = loans.find(x => x.id === loanId);
      if (!l) return;
      l.status = status;
      l.decision = { status, at: nowISO() };
      write(K.LOANS, loans);
      audit("loan_decision", { loanId, status });
      toast(`Loan ${status}`, "success");
      location.reload();
    }

    function showLoanModal(loanId) {
      const loans = read(K.LOANS, []);
      const l = loans.find(x => x.id === loanId);
      const u = users.find(x => x.id === l?.userId);
      if (!l) return;

      $("#loanModalBody").innerHTML = `
        <div class="row g-2">
          <div class="col-6 text-muted">Applicant</div><div class="col-6 fw-semibold text-end">${escapeHTML(u?.name || "")}</div>
          <div class="col-6 text-muted">Email</div><div class="col-6 fw-semibold text-end">${escapeHTML(u?.email || "")}</div>
          <div class="col-6 text-muted">Amount</div><div class="col-6 fw-semibold text-end">P ${Number(l.amount).toLocaleString()}</div>
          <div class="col-6 text-muted">Term</div><div class="col-6 fw-semibold text-end">${escapeHTML(String(l.term))} months</div>
          <div class="col-6 text-muted">Employer</div><div class="col-6 fw-semibold text-end">${escapeHTML(l.employer || "")}</div>
          <div class="col-6 text-muted">Income</div><div class="col-6 fw-semibold text-end">P ${Number(l.income).toLocaleString()}</div>
          <div class="col-12 text-muted mt-2">Purpose</div><div class="col-12">${escapeHTML(l.purpose || "")}</div>
        </div>
      `;

      const modal = new bootstrap.Modal($("#loanModal"));
      modal.show();
    }

    $("#logoutBtn")?.addEventListener("click", safeRun(() => {
      clearSession();
      location.href = "login.html";
    }));
  }

  // ---------- Admin Settings (CMS) ----------
  function initAdminSettings() {
    if (!$("#adminSettingsPage")) return;
    if (!requireAdmin()) return;

    const cms = read(K.CMS, {});
    const form = $("#cmsForm");

    // Fill
    form.heroTitle.value = cms.heroTitle || "";
    form.heroHighlight.value = cms.heroHighlight || "";
    form.heroSubtitle.value = cms.heroSubtitle || "";
    form.heroCtaPrimary.value = cms.heroCtaPrimary || "";
    form.heroCtaSecondary.value = cms.heroCtaSecondary || "";
    form.contactPhone.value = cms.contactPhone || "";
    form.contactEmail.value = cms.contactEmail || "";
    form.officeAddress.value = cms.officeAddress || "";
    form.adHeadline.value = cms.adHeadline || "";
    form.adCopy.value = cms.adCopy || "";

    // feature fields
    for (let i = 0; i < 3; i++) {
      const f = cms.features?.[i] || {};
      form[`f${i}_icon`].value = f.icon || "bi-shield-check";
      form[`f${i}_title`].value = f.title || "";
      form[`f${i}_desc`].value = f.desc || "";
    }

    const imgPrev = $("#cmsHeroPreview");
    if (cms.heroImageDataUrl && imgPrev) imgPrev.src = cms.heroImageDataUrl;

    $("#heroImageFile")?.addEventListener("change", safeRun(async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const d = await fileToDataUrl(file);
      imgPrev.src = d;
      imgPrev.dataset.dataurl = d;
      toast("Image loaded. Save to apply.", "success");
    }));

    form.addEventListener("submit", safeRun((e) => {
      e.preventDefault();

      const heroImageDataUrl = imgPrev?.dataset.dataurl || cms.heroImageDataUrl || "";

      const next = {
        heroTitle: form.heroTitle.value.trim(),
        heroHighlight: form.heroHighlight.value.trim(),
        heroSubtitle: form.heroSubtitle.value.trim(),
        heroCtaPrimary: form.heroCtaPrimary.value.trim(),
        heroCtaSecondary: form.heroCtaSecondary.value.trim(),
        contactPhone: form.contactPhone.value.trim(),
        contactEmail: form.contactEmail.value.trim(),
        officeAddress: form.officeAddress.value.trim(),
        adHeadline: form.adHeadline.value.trim(),
        adCopy: form.adCopy.value.trim(),
        heroImageDataUrl,
        features: [
          { icon: form.f0_icon.value.trim(), title: form.f0_title.value.trim(), desc: form.f0_desc.value.trim() },
          { icon: form.f1_icon.value.trim(), title: form.f1_title.value.trim(), desc: form.f1_desc.value.trim() },
          { icon: form.f2_icon.value.trim(), title: form.f2_title.value.trim(), desc: form.f2_desc.value.trim() },
        ]
      };

      write(K.CMS, next);
      audit("cms_update", { by: session()?.userId });
      toast("Homepage updated ✅", "success");
    }));

    $("#logoutBtn")?.addEventListener("click", safeRun(() => {
      clearSession();
      location.href = "login.html";
    }));
  }

  // ---------- Page initializers ----------
  function initAuthPages() {
    const s = session();
    const onLoginPage = Boolean($("#loginForm"));
    const onRegisterPage = Boolean($("#registerForm"));

    if (s?.userId && (onLoginPage || onRegisterPage)) {
      location.href = (s.role === "admin") ? "admin.html" : "dashboard.html";
      return;
    }

    // Register
    const reg = $("#registerForm");
    if (reg) {
      reg.addEventListener("submit", safeRun(async (e) => {
        e.preventDefault();
        const name = reg.name.value.trim();
        const email = reg.email.value.trim();
        const password = reg.password.value;

        if (name.length < 2) return toast("Name required.", "warn");
        if (!/^\S+@\S+\.\S+$/.test(email)) return toast("Valid email required.", "warn");
        if (password.length < 6) return toast("Password must be 6+ chars.", "warn");

        await registerUser({ name, email, password });
        toast("Account created ✅", "success");
        location.href = "dashboard.html";
      }));
    }

    // Login
    const login = $("#loginForm");
    if (login) {
      login.addEventListener("submit", safeRun(async (e) => {
        e.preventDefault();
        const email = login.email.value.trim();
        const password = login.password.value;
        await loginUser({ email, password });
        toast("Logged in ✅", "success");
        // admin redirects
        const s = session();
        location.href = (s?.role === "admin") ? "admin.html" : "dashboard.html";
      }));
    }

    $("#logoutBtn")?.addEventListener("click", safeRun(() => {
      clearSession();
      location.href = "login.html";
    }));
  }

  function initDashboard() {
    if (!$("#dashboardPage")) return;
    if (!requireAuth()) return;

    const user = currentUser();
    if (!user) return;

    $("#userName") && ($("#userName").textContent = user.name);
    $("#userEmail") && ($("#userEmail").textContent = user.email);
    $("#userInitials") && ($("#userInitials").textContent = (user.name.split(" ").map(x => x[0]).slice(0,2).join("") || "AP").toUpperCase());

    $("#kycBadge") && ($("#kycBadge").textContent = `KYC: ${user.kyc?.status || "not_started"}`);

    const list = $("#myLoans");
    if (list) {
      const loans = loansForUser(user.id).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
      list.innerHTML = loans.length ? loans.map(l => `
        <tr>
          <td class="text-muted small">${new Date(l.createdAt).toLocaleString()}</td>
          <td class="fw-semibold">P ${Number(l.amount).toLocaleString()}</td>
          <td>${escapeHTML(String(l.term))}m</td>
          <td>
            <span class="badge ${
              l.status === "approved" ? "text-bg-success" :
              l.status === "declined" ? "text-bg-danger" : "text-bg-warning"
            }">${escapeHTML(l.status)}</span>
          </td>
        </tr>
      `).join("") : `<tr><td colspan="4" class="text-muted small py-3">No loan requests yet.</td></tr>`;
    }

    $("#logoutBtn")?.addEventListener("click", safeRun(() => {
      clearSession();
      location.href = "login.html";
    }));
  }

  function initApply() {
    if (!$("#applyPage")) return;
    if (!requireAuth()) return;
    if (!requireKycApproved()) return;

    const form = $("#applyForm");
    const steps = $$(".step", form);
    const progress = $("#applyProgress");
    const prevBtn = $("#prevStep");
    const nextBtn = $("#nextStep");
    const submitBtn = $("#submitApply");

    let step = 1;

    function showStep(n){
      step = n;
      steps.forEach(s => s.classList.toggle("d-none", Number(s.dataset.step) !== step));
      if (progress) progress.style.width = `${Math.round((step/3)*100)}%`;
      if (prevBtn) prevBtn.disabled = step === 1;
      if (nextBtn) nextBtn.classList.toggle("d-none", step === 3);
      if (submitBtn) submitBtn.classList.toggle("d-none", step !== 3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function validate(n){
      if (n === 1){
        const amount = Number(form.amount.value);
        const term = Number(form.term.value);
        if (!(amount >= 100 && amount <= 50000)) return "Amount must be between P100 and P50,000.";
        if (!(term >= 1 && term <= 24)) return "Term must be between 1 and 24 months.";
      }
      if (n === 2){
        const employer = String(form.employer.value || "").trim();
        const income = Number(form.income.value || 0);
        if (employer.length < 2) return "Employer is required.";
        if (income < 500) return "Monthly income must be at least P500.";
      }
      if (n === 3){
        const purpose = String(form.purpose.value || "").trim();
        if (purpose.length < 5) return "Purpose must be at least 5 characters.";
      }
      return null;
    }

    function updateSummary(){
      const amount = Number(form.amount.value || 0);
      const term = Number(form.term.value || 1);
      const total = Math.round(amount * 1.12);
      const monthly = term ? Math.round(total / term) : total;
      $$("[data-sum='amount']").forEach(el => el.textContent = String(amount));
      $$("[data-sum='term']").forEach(el => el.textContent = String(term));
      $$("[data-sum='total']").forEach(el => el.textContent = String(total));
      $$("[data-sum='monthly']").forEach(el => el.textContent = String(monthly));
    }

    nextBtn?.addEventListener("click", safeRun(() => {
      const err = validate(step);
      if (err) return toast(err, "warn");
      if (step === 2) updateSummary();
      showStep(step + 1);
    }));

    prevBtn?.addEventListener("click", safeRun(() => showStep(step - 1)));

    form.addEventListener("submit", safeRun((e) => {
      e.preventDefault();
      const err = validate(3);
      if (err) return toast(err, "warn");

      // prevent spam double submits
      if (submitBtn.disabled) return;
      submitBtn.disabled = true;

      createLoanRequest({
        amount: Number(form.amount.value),
        term: Number(form.term.value),
        employer: String(form.employer.value).trim(),
        income: Number(form.income.value),
        purpose: String(form.purpose.value).trim()
      });

      toast("Loan request submitted ✅ Await admin review.", "success");
      setTimeout(() => (location.href = "dashboard.html"), 600);
    }));

    $("#logoutBtn")?.addEventListener("click", safeRun(() => {
      clearSession();
      location.href = "login.html";
    }));

    showStep(1);
  }

  // ---------- Bind page ----------
  function setYear() {
    const y = $("#year");
    if (y) y.textContent = String(new Date().getFullYear());
  }

  document.addEventListener("DOMContentLoaded", safeRun(() => {
    initDataOnce();
    initTheme();
    initFX();
    initReveal();
    setYear();

    applyCMS();

    initAuthPages();
    initDashboard();
    initApply();

    initVerifyPage();
    initAdminSetup();
    initAdminDashboard();
    initAdminSettings();
  }));
})();
