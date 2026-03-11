// ═══════════════════════════════════════════════════════════════
// ALPHA PACK CASH SOLUTIONS — App Router v5.0
// ═══════════════════════════════════════════════════════════════
import { UI }                          from "./modules/ui.js";
import { Auth, Loans, KYC, Ads, Admin, sb } from "./modules/db.js";
import { BIZ, P, calcLoan }            from "./modules/config.js";

window.addEventListener("unhandledrejection", e =>
  UI.toast(e.reason?.message || "Unexpected error.", "error")
);

document.addEventListener("DOMContentLoaded", async () => {
  UI.init();
  const page = document.body.dataset.page || "";

  const pages = {
    home:              initHome,
    register:          initRegister,
    login:             initLogin,
    dashboard:         initDashboard,
    apply:             initApply,
    verify:            initVerify,
    admin_provision:   initAdminProvision,
    admin_login:       initAdminLogin,
    admin_dashboard:   initAdminDashboard,
    admin_insights:    initAdminInsights,
    admin_settings:    initAdminSettings,
    admin_ads:         initAdminAds,
    admin_users:       initAdminUsers,
  };

  try {
    if (pages[page]) await pages[page]();
  } catch (e) {
    console.error("[Page Init Error]", e);
    UI.toast(e.message || "Page failed to load.", "error");
  } finally {
    setTimeout(() => {
      const L = document.getElementById("pageLoader");
      if (L) { L.classList.add("fade"); setTimeout(() => L?.remove(), 400); }
    }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════
//  HOME
// ═══════════════════════════════════════════════════════════════
async function initHome() {
  // Dynamic nav auth
  const session = await Auth.session();
  const navArea = document.getElementById("navAuthArea");
  if (navArea && session) {
    navArea.innerHTML = `<a href="dashboard.html" class="btn btn-ghost btn-sm">My Account</a>`;
  }

  // Live calculator
  const amtInput  = document.getElementById("calcAmount");
  const pkgSelect = document.getElementById("calcPkg");
  const resultEl  = document.getElementById("calcResult");

  const updateCalc = () => {
    const amt = parseFloat(amtInput?.value) || 300;
    const { rate, interest, total } = calcLoan(amt);
    if (resultEl) {
      resultEl.innerHTML = `
        <div class="calc-result"><span class="l">Borrow</span><span class="v">${P(amt)}</span></div>
        <div class="calc-result"><span class="l">Interest (${(rate*100).toFixed(0)}%)</span><span class="v">${P(interest)}</span></div>
        <div class="calc-result total"><span class="l">Total repayable</span><span class="v">${P(total)}</span></div>
        <div class="calc-result"><span class="l">Due in</span><span class="v">${BIZ.repaymentDays} days</span></div>`;
    }
  };
  amtInput?.addEventListener("input", updateCalc);
  pkgSelect?.addEventListener("change", () => {
    const pkg = BIZ.packages.find(p => p.id === pkgSelect.value);
    if (pkg && amtInput) { amtInput.min = pkg.min; amtInput.max = pkg.max; amtInput.value = pkg.min; updateCalc(); }
  });
  updateCalc();

  // Load ads from Supabase
  try {
    const ads = await Ads.active();
    const slot = document.getElementById("adSlot");
    if (slot && ads.length > 0) {
      const ad = ads[0];
      slot.innerHTML = `
        <div class="ad-slot reveal">
          <div class="ad-label">✦ Sponsored</div>
          <div class="ad-badge"><span class="badge badge-amber">Ad</span></div>
          <h3 style="font-family:var(--display);font-size:clamp(1.4rem,3vw,2rem);font-weight:700;margin-bottom:10px;position:relative;z-index:1;">${UI.esc(ad.title)}</h3>
          <p style="color:var(--tx-2);max-width:520px;margin-bottom:24px;position:relative;z-index:1;font-size:.9rem;line-height:1.7">${UI.esc(ad.description)}</p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;position:relative;z-index:1;">
            ${ad.cta_url ? `<a href="${UI.esc(ad.cta_url)}" target="_blank" rel="noopener" class="btn btn-primary">${UI.esc(ad.cta_text||"Learn More")}</a>` : ""}
            ${ad.phone   ? `<a href="tel:${UI.esc(ad.phone)}" class="btn btn-outline">${UI.esc(ad.phone)}</a>` : ""}
          </div>
          ${ad.price_label ? `<div style="position:absolute;top:28px;right:40px;text-align:right;z-index:1"><div style="font-family:var(--display);font-size:2.2rem;font-weight:300;color:var(--amber-2)">${UI.esc(ad.price_label)}</div><div style="font-size:.78rem;color:var(--tx-3)">${UI.esc(ad.price_period||"")}</div></div>` : ""}
        </div>`;
      UI.initReveal();
    }
  } catch (e) { console.warn("Ads:", e.message); }

  // Smooth scroll CTA
  document.getElementById("btnHowItWorks")?.addEventListener("click", e => {
    e.preventDefault();
    document.getElementById("howItWorks")?.scrollIntoView({ behavior: "smooth" });
  });
}

// ═══════════════════════════════════════════════════════════════
//  REGISTER
// ═══════════════════════════════════════════════════════════════
async function initRegister() {
  if (await Auth.isAuthed()) { window.location.href = "dashboard.html"; return; }

  const form = document.getElementById("registerForm");
  form?.addEventListener("submit", UI.safe(async (e) => {
    e.preventDefault();
    const btn = form.querySelector("[type=submit]");
    UI.setBtnLoading(btn, true, "Creating your account…");

    const fd = new FormData(form);
    const get = k => fd.get(k)?.trim();
    const pw = fd.get("password"), pw2 = fd.get("confirm_pw");

    if (pw !== pw2)       { UI.setBtnLoading(btn, false); UI.toast("Passwords do not match.", "warn"); return; }
    if (pw.length < 8)    { UI.setBtnLoading(btn, false); UI.toast("Password must be at least 8 characters.", "warn"); return; }
    if (!get("institution")) { UI.setBtnLoading(btn, false); UI.toast("Please enter your institution.", "warn"); return; }

    await Auth.register({
      email: get("email"), password: pw,
      name: get("name"), phone: get("phone"),
      institution: get("institution"), program: get("program"),
      yearOfStudy: get("year"), studentIdNo: get("student_id")
    });

    UI.toast("Account created! Please check your email, then log in.", "success", 7000);
    setTimeout(() => { window.location.href = "login.html"; }, 2000);
  }));
}

// ═══════════════════════════════════════════════════════════════
//  LOGIN
// ═══════════════════════════════════════════════════════════════
async function initLogin() {
  if (await Auth.isAuthed()) {
    const back = sessionStorage.getItem("ap_back") || "dashboard.html";
    sessionStorage.removeItem("ap_back");
    window.location.href = back; return;
  }

  document.getElementById("loginForm")?.addEventListener("submit", UI.safe(async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("[type=submit]");
    UI.setBtnLoading(btn, true, "Signing in…");
    await Auth.login({ email: e.target.email.value.trim(), password: e.target.password.value });
    UI.toast("Welcome back! 👋", "success");
    const back = sessionStorage.getItem("ap_back") || "dashboard.html";
    sessionStorage.removeItem("ap_back");
    setTimeout(() => { window.location.href = back; }, 600);
  }));
}

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════
async function initDashboard() {
  const user = await Auth.requireAuth("login.html");
  if (!user) return;

  const profile = await Auth.profile(user.id);
  const loans   = await Loans.forUser(user.id);

  // Populate header
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("dName",        profile.full_name || user.email);
  set("dEmail",       user.email);
  set("dInstitution", profile.institution || "—");
  set("dProgram",     profile.program || "—");
  set("dYear",        profile.year_of_study ? `Year ${profile.year_of_study}` : "—");
  set("dStudentId",   profile.student_id_no || "—");

  // KYC badge
  const kycBadge = document.getElementById("dKycBadge");
  if (kycBadge) {
    const map = { not_started:"Not verified", pending:"Under review", approved:"Verified ✓", rejected:"Rejected" };
    kycBadge.className = `status status-${profile.kyc_status || "not_started"}`;
    kycBadge.textContent = map[profile.kyc_status] || profile.kyc_status;
  }

  // Next step
  const nextEl = document.getElementById("nextStep");
  if (nextEl) {
    if (profile.kyc_status === "approved") {
      nextEl.innerHTML = `<div class="badge badge-green mb12">✓ Identity verified</div><p class="caption mb16">You're approved to apply for a student loan right now.</p><a href="apply.html" class="btn btn-primary btn-full">Apply for a loan →</a>`;
    } else if (profile.kyc_status === "pending") {
      nextEl.innerHTML = `<div class="badge badge-orange mb12">⏳ Under review</div><p class="caption mb16">Your Student ID is with our team. Typically 1–2 business days.</p><a href="verify.html" class="btn btn-ghost btn-full">Check verification status</a>`;
    } else if (profile.kyc_status === "rejected") {
      nextEl.innerHTML = `<div class="badge badge-red mb12">Verification rejected</div><p class="caption mb16">Your ID was unclear. Please resubmit sharper photos.</p><a href="verify.html" class="btn btn-outline btn-full">Resubmit ID →</a>`;
    } else {
      nextEl.innerHTML = `<div class="badge badge-muted mb12">Step 1 of 3</div><p class="caption mb16">Verify your Student ID to unlock loan applications. It takes about 2 minutes.</p><a href="verify.html" class="btn btn-primary btn-full">Verify Student ID →</a>`;
    }
  }

  // Stats
  const approved = loans.filter(l => l.status === "approved");
  const pending  = loans.filter(l => l.status === "pending");
  set("statTotal",    loans.length);
  set("statApproved", approved.length);
  set("statPending",  pending.length);
  set("statBorrowed", approved.length ? P(approved.reduce((s,l) => s + +l.principal, 0)) : "P 0");

  // Loans table
  const tbody = document.getElementById("loansBody");
  if (tbody) {
    tbody.innerHTML = loans.length ? loans.map(l => `
      <tr>
        <td>${UI.fmtDate(l.created_at)}</td>
        <td class="bold">${P(l.principal)}</td>
        <td>${UI.esc(l.package_label)}</td>
        <td>${P(l.total_repayable)}</td>
        <td>${l.due_date ? UI.fmtDate(l.due_date) : "—"}</td>
        <td>${l.purpose ? `<span title="${UI.esc(l.purpose)}" style="cursor:help">${UI.esc(l.purpose.length > 28 ? l.purpose.slice(0,28)+"…" : l.purpose)}</span>` : "—"}</td>
        <td><span class="status status-${l.status}">${l.status}</span></td>
      </tr>`).join("")
    : `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--tx-4)">No applications yet. <a href="apply.html" style="color:var(--amber-2)">Apply now →</a></td></tr>`;
  }

  document.getElementById("logoutBtn")?.addEventListener("click", UI.safe(() => Auth.logout()));
}

// ═══════════════════════════════════════════════════════════════
//  APPLY
// ═══════════════════════════════════════════════════════════════
async function initApply() {
  const user = await Auth.requireAuth("login.html");
  if (!user) return;

  const profile = await Auth.profile(user.id);

  if (profile.kyc_status !== "approved") {
    UI.toast("Student ID verification required before applying.", "warn", 6000);
    setTimeout(() => { window.location.href = "verify.html"; }, 2200);
    return;
  }

  // Populate package select
  const pkgSel = document.getElementById("applyPkg");
  if (pkgSel) {
    BIZ.packages.forEach(p => {
      const o = document.createElement("option");
      o.value = p.id;
      o.textContent = `${p.icon} ${p.label} — ${P(p.min)} to ${P(p.max)}`;
      pkgSel.appendChild(o);
    });
  }

  // Populate repayment options
  const repSel = document.getElementById("applyRepayment");
  if (repSel) {
    BIZ.repaymentDaysAlt.forEach(d => {
      const o = document.createElement("option");
      o.value = d; o.textContent = `${d} days`;
      if (d === BIZ.repaymentDays) o.selected = true;
      repSel.appendChild(o);
    });
  }

  const amtInput  = document.getElementById("applyAmount");
  const breakdown = document.getElementById("applyBreakdown");
  const dueEl     = document.getElementById("applyDueDate");

  const refresh = () => {
    const pkg = BIZ.packages.find(p => p.id === pkgSel?.value) || BIZ.packages[0];
    const amt = parseFloat(amtInput?.value || pkg.min);
    const days = parseInt(repSel?.value || BIZ.repaymentDays);
    const { rate, interest, total } = calcLoan(amt);
    if (amtInput) { amtInput.min = pkg.min; amtInput.max = pkg.max; }
    if (breakdown) {
      breakdown.innerHTML = `
        <div class="breakdown-row"><span class="l">Principal</span><span class="r">${P(amt)}</span></div>
        <div class="breakdown-row"><span class="l">Interest (${(rate*100).toFixed(0)}%)</span><span class="r">${P(interest)}</span></div>
        <div class="breakdown-row total"><span class="l">Total repayable</span><span class="r">${P(total)}</span></div>
        <div class="breakdown-row"><span class="l">Repayment in</span><span class="r">${days} days</span></div>`;
    }
    if (dueEl) {
      const due = new Date(); due.setDate(due.getDate() + days);
      dueEl.textContent = UI.fmtDate(due);
    }
    return { pkg, amt, days, interest, total, rate };
  };

  pkgSel?.addEventListener("change", () => { if (amtInput) amtInput.value = BIZ.packages.find(p=>p.id===pkgSel.value)?.min || 100; refresh(); });
  amtInput?.addEventListener("input", refresh);
  repSel?.addEventListener("change", refresh);
  refresh();

  document.getElementById("applyForm")?.addEventListener("submit", UI.safe(async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("[type=submit]");
    const { pkg, amt, days, interest, total, rate } = refresh();

    if (isNaN(amt) || amt < pkg.min || amt > pkg.max) {
      UI.toast(`Amount must be between ${P(pkg.min)} and ${P(pkg.max)}.`, "warn"); return;
    }
    UI.setBtnLoading(btn, true, "Submitting application…");

    await Loans.submit({
      userId: user.id, packageId: pkg.id, packageLabel: pkg.label,
      principal: amt, interest, total, repaymentDays: days,
      purpose: e.target.purpose.value,
      phone: e.target.contact_phone.value
    });

    UI.toast("Application submitted! We'll review it shortly.", "success", 5000);
    setTimeout(() => { window.location.href = "dashboard.html"; }, 1500);
  }));

  document.getElementById("logoutBtn")?.addEventListener("click", UI.safe(() => Auth.logout()));
}

// ═══════════════════════════════════════════════════════════════
//  VERIFY
// ═══════════════════════════════════════════════════════════════
async function initVerify() {
  const user = await Auth.requireAuth("login.html");
  if (!user) return;

  const profile = await Auth.profile(user.id);
  const badge = document.getElementById("kycBadge");
  if (badge) {
    const map = { not_started:"Not started", pending:"Under review", approved:"Verified ✓", rejected:"Rejected" };
    badge.className = `status status-${profile.kyc_status || "not_started"}`;
    badge.textContent = map[profile.kyc_status] || profile.kyc_status;
  }

  if (profile.kyc_front_url) { const el = document.getElementById("frontPreview"); if (el) { el.src = profile.kyc_front_url; el.classList.add("on"); } }
  if (profile.kyc_back_url)  { const el = document.getElementById("backPreview");  if (el) { el.src = profile.kyc_back_url;  el.classList.add("on"); } }

  if (profile.kyc_status === "approved") {
    const form = document.getElementById("kycForm");
    if (form) form.innerHTML = `<div style="text-align:center;padding:40px 20px"><div style="font-size:3rem;margin-bottom:16px">✅</div><div class="h4 text-amber mb12">You're fully verified</div><p class="caption mb24">Student identity confirmed. Apply for your loan now.</p><a href="apply.html" class="btn btn-primary">Apply for a loan →</a></div>`;
    return;
  }

  let frontFile = null, backFile = null;
  UI.initUpload("frontZone", "frontInput", "frontPreview", f => { frontFile = f; });
  UI.initUpload("backZone",  "backInput",  "backPreview",  f => { backFile  = f; });

  // Camera
  let stream = null, camTarget = "front";
  const camVideo  = document.getElementById("camVideo");
  const camCanvas = document.getElementById("camCanvas");

  const openCam = async (target) => {
    camTarget = target;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      camVideo.srcObject = stream; await camVideo.play();
      UI.openModal("camModal");
    } catch (e) { UI.toast("Camera not available. Please upload a photo file instead.", "warn"); }
  };

  document.getElementById("camFrontBtn")?.addEventListener("click", () => openCam("front"));
  document.getElementById("camBackBtn")?.addEventListener("click",  () => openCam("back"));
  document.getElementById("closeCam")?.addEventListener("click", () => { stream?.getTracks().forEach(t=>t.stop()); UI.closeModal("camModal"); });

  document.getElementById("snapBtn")?.addEventListener("click", UI.safe(() => {
    const ctx = camCanvas.getContext("2d");
    camCanvas.width = camVideo.videoWidth; camCanvas.height = camVideo.videoHeight;
    ctx.drawImage(camVideo, 0, 0);
    camCanvas.toBlob(blob => {
      const file = new File([blob], `${camTarget}.jpg`, { type: "image/jpeg" });
      const url  = camCanvas.toDataURL();
      if (camTarget === "front") { frontFile = file; const el = document.getElementById("frontPreview"); if (el) { el.src = url; el.classList.add("on"); } }
      else                       { backFile  = file; const el = document.getElementById("backPreview");  if (el) { el.src = url; el.classList.add("on"); } }
      UI.toast(`${camTarget === "front" ? "Front" : "Back"} photo captured.`, "success");
    }, "image/jpeg", 0.92);
  }));

  document.getElementById("submitKyc")?.addEventListener("click", UI.safe(async () => {
    if (!frontFile) { UI.toast("Please upload or capture the front of your Student ID.", "warn"); return; }
    if (!backFile)  { UI.toast("Please upload or capture the back of your Student ID.", "warn"); return; }
    const btn = document.getElementById("submitKyc");
    UI.setBtnLoading(btn, true, "Uploading…");
    await KYC.submit(user.id, frontFile, backFile);
    UI.toast("Verification submitted! We'll review within 1–2 business days.", "success", 7000);
    setTimeout(() => window.location.reload(), 1800);
  }));

  document.getElementById("logoutBtn")?.addEventListener("click", UI.safe(() => Auth.logout()));
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN — PROVISION
// ═══════════════════════════════════════════════════════════════
async function initAdminProvision() {
  document.getElementById("provisionForm")?.addEventListener("submit", UI.safe(async e => {
    e.preventDefault();
    const btn = e.target.querySelector("[type=submit]");
    UI.setBtnLoading(btn, true, "Creating admin…");
    const pw = e.target.password.value, pw2 = e.target.confirm.value;
    if (pw !== pw2)     { UI.setBtnLoading(btn,false); UI.toast("Passwords don't match.","warn"); return; }
    if (pw.length < 10) { UI.setBtnLoading(btn,false); UI.toast("Password must be 10+ characters.","warn"); return; }

    const email = e.target.email.value.trim();
    const { data, error } = await sb.auth.signUp({ email, password: pw });
    if (error) throw new Error(error.message);
    if (data.user) {
      await sb.from("profiles").insert({ id: data.user.id, email, full_name: "Admin", role: "admin", kyc_status: "approved" });
    }
    UI.toast("Admin created! DELETE this file from GitHub now.", "success", 10000);
    setTimeout(() => { window.location.href = "login.html"; }, 2500);
  }));
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN — LOGIN
// ═══════════════════════════════════════════════════════════════
async function initAdminLogin() {
  document.getElementById("adminLoginForm")?.addEventListener("submit", UI.safe(async e => {
    e.preventDefault();
    const btn = e.target.querySelector("[type=submit]");
    UI.setBtnLoading(btn, true, "Authenticating…");
    await Auth.login({ email: e.target.email.value.trim(), password: e.target.password.value });
    const u = await Auth.user();
    const p = await Auth.profile(u.id);
    if (p?.role !== "admin") { await Auth.logout(); UI.setBtnLoading(btn,false); UI.toast("Access denied — not an admin account.", "error"); return; }
    window.location.href = "dashboard.html";
  }));
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN — DASHBOARD
// ═══════════════════════════════════════════════════════════════
async function initAdminDashboard() {
  const ctx = await Auth.requireAdmin(); if (!ctx) return;

  const [stats, kycQ, loanQ] = await Promise.all([
    Loans.stats(), KYC.pending(), Loans.all("pending")
  ]);

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("aTotal",    stats.total);
  set("aPending",  stats.pending);
  set("aApproved", stats.approved);
  set("aDisbursed",P(stats.totalDisbursed));
  set("aInterest", P(stats.totalInterest));

  // KYC table
  const kycT = document.getElementById("kycTableBody");
  if (kycT) kycT.innerHTML = kycQ.length
    ? kycQ.map(u => `<tr>
        <td class="bold">${UI.esc(u.full_name||"—")}</td>
        <td>${UI.esc(u.email)}</td>
        <td>${UI.esc(u.institution||"—")}</td>
        <td>${UI.fmtAgo(u.kyc_submitted_at)}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-ghost btn-sm" onclick="viewKyc('${u.id}','${UI.esc(u.full_name||"")}','${UI.esc(u.email)}','${u.kyc_front_url||""}','${u.kyc_back_url||""}')">View ID</button>
          <button class="btn btn-success btn-sm" onclick="kycDecide('${u.id}','approved')">Approve</button>
          <button class="btn btn-danger btn-sm"  onclick="kycDecide('${u.id}','rejected')">Reject</button>
        </td>
      </tr>`).join("")
    : `<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--tx-4)">No pending verifications.</td></tr>`;

  // Loan table
  const loanT = document.getElementById("loanTableBody");
  if (loanT) loanT.innerHTML = loanQ.length
    ? loanQ.map(l => `<tr>
        <td>${UI.fmtDate(l.created_at)}</td>
        <td class="bold">${UI.esc(l.profiles?.full_name||"—")}</td>
        <td>${UI.esc(l.profiles?.phone||"—")}</td>
        <td class="bold">${P(l.principal)}</td>
        <td>${UI.esc(l.package_label)}</td>
        <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${UI.esc(l.purpose||"")}">${UI.esc(l.purpose||"—")}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-ghost btn-sm" onclick="viewLoan('${l.id}')">Details</button>
          <button class="btn btn-success btn-sm" onclick="loanDecide('${l.id}','approved')">Approve</button>
          <button class="btn btn-danger btn-sm"  onclick="loanDecide('${l.id}','declined')">Decline</button>
        </td>
      </tr>`).join("")
    : `<tr><td colspan="7" style="text-align:center;padding:28px;color:var(--tx-4)">No pending loans.</td></tr>`;

  // Global handlers
  window.kycDecide = UI.safe(async (uid, status) => {
    if (!confirm(`${status === "approved" ? "Approve" : "Reject"} this KYC?`)) return;
    await KYC.decide(uid, status);
    await Admin.log("kyc_decision", { uid, status });
    UI.toast(`KYC ${status}.`, "success");
    setTimeout(() => location.reload(), 700);
  });
  window.loanDecide = UI.safe(async (id, status) => {
    if (!confirm(`${status === "approved" ? "Approve" : "Decline"} this loan?`)) return;
    await Loans.decision(id, status);
    await Admin.log("loan_decision", { id, status });
    UI.toast(`Loan ${status}.`, "success");
    setTimeout(() => location.reload(), 700);
  });
  window.viewKyc = (id, name, email, front, back) => {
    document.getElementById("modalContent").innerHTML = `
      <p class="fw-700 mb4">${UI.esc(name)}</p><p class="caption mb20">${UI.esc(email)}</p>
      <div class="g2 gap16">
        <div><div class="caption mb8">Front</div>${front ? `<img src="${front}" style="width:100%;border-radius:var(--r-sm);border:1px solid var(--bdr)">` : "<span class='caption'>No image</span>"}</div>
        <div><div class="caption mb8">Back</div>${back  ? `<img src="${back}"  style="width:100%;border-radius:var(--r-sm);border:1px solid var(--bdr)">` : "<span class='caption'>No image</span>"}</div>
      </div>`;
    UI.openModal("detailModal");
  };
  window.viewLoan = async (id) => {
    const all = await Loans.all(); const l = all.find(x => x.id === id); if (!l) return;
    document.getElementById("modalContent").innerHTML = `
      <div class="breakdown">
        <div class="breakdown-row"><span class="l">Applicant</span><span class="r">${UI.esc(l.profiles?.full_name||"—")}</span></div>
        <div class="breakdown-row"><span class="l">Email</span><span class="r">${UI.esc(l.profiles?.email||"—")}</span></div>
        <div class="breakdown-row"><span class="l">Phone</span><span class="r">${UI.esc(l.profiles?.phone||"—")}</span></div>
        <div class="breakdown-row"><span class="l">Package</span><span class="r">${UI.esc(l.package_label)}</span></div>
        <div class="breakdown-row"><span class="l">Principal</span><span class="r">${P(l.principal)}</span></div>
        <div class="breakdown-row"><span class="l">Interest</span><span class="r">${P(l.interest)}</span></div>
        <div class="breakdown-row total"><span class="l">Total repayable</span><span class="r">${P(l.total_repayable)}</span></div>
        <div class="breakdown-row"><span class="l">Due date</span><span class="r">${UI.fmtDate(l.due_date)}</span></div>
        <div class="breakdown-row"><span class="l">Purpose</span><span class="r" style="max-width:200px;text-align:right">${UI.esc(l.purpose||"—")}</span></div>
        <div class="breakdown-row"><span class="l">Contact</span><span class="r">${UI.esc(l.contact_phone||"—")}</span></div>
      </div>`;
    UI.openModal("detailModal");
  };

  document.getElementById("closeModal")?.addEventListener("click", () => UI.closeModal("detailModal"));
  document.getElementById("adminLogout")?.addEventListener("click", UI.safe(() => Auth.logout()));
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN — INSIGHTS
// ═══════════════════════════════════════════════════════════════
async function initAdminInsights() {
  const ctx = await Auth.requireAdmin(); if (!ctx) return;
  const [stats, all] = await Promise.all([Loans.stats(), Loans.all()]);

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("iTotal",    stats.total);       set("iPending",  stats.pending);
  set("iApproved", stats.approved);    set("iDeclined", stats.declined);
  set("iDisbursed",P(stats.totalDisbursed)); set("iInterest",P(stats.totalInterest));

  // Package distribution
  const pkgCount = {};
  all.forEach(l => pkgCount[l.package_label] = (pkgCount[l.package_label]||0)+1);
  const pkgLabels = Object.keys(pkgCount), pkgData = pkgLabels.map(k => pkgCount[k]);

  // Monthly disbursements
  const monthly = {};
  all.filter(l => l.status==="approved").forEach(l => {
    const m = new Date(l.created_at).toLocaleDateString("en-BW",{month:"short",year:"2-digit"});
    monthly[m] = (monthly[m]||0) + +l.principal;
  });
  const mLabels = Object.keys(monthly), mData = mLabels.map(k => monthly[k]);

  if (window.Chart) {
    Chart.defaults.color = "rgba(244,237,224,.45)";
    Chart.defaults.font  = { family: "Plus Jakarta Sans" };
    Chart.defaults.borderColor = "rgba(255,255,255,.06)";

    const donut = document.getElementById("pkgChart")?.getContext("2d");
    if (donut && pkgLabels.length) new Chart(donut, {
      type: "doughnut",
      data: { labels: pkgLabels, datasets: [{ data: pkgData, backgroundColor: ["rgba(240,168,50,.8)","rgba(248,197,100,.75)","rgba(253,226,152,.7)","rgba(240,168,50,.5)"], borderColor: "rgba(240,168,50,.2)", borderWidth: 1 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { padding: 16, usePointStyle: true } } }, cutout: "65%" }
    });

    const bar = document.getElementById("trendChart")?.getContext("2d");
    if (bar && mLabels.length) new Chart(bar, {
      type: "bar",
      data: { labels: mLabels, datasets: [{ label: "Disbursed (P)", data: mData, backgroundColor: "rgba(240,168,50,.35)", borderColor: "rgba(240,168,50,.8)", borderWidth: 1.5, borderRadius: 6, hoverBackgroundColor: "rgba(240,168,50,.55)" }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: "rgba(255,255,255,.04)" } }, y: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { callback: v => "P"+v.toLocaleString() } } } }
    });
  }

  document.getElementById("adminLogout")?.addEventListener("click", UI.safe(() => Auth.logout()));
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN — SETTINGS
// ═══════════════════════════════════════════════════════════════
async function initAdminSettings() {
  const ctx = await Auth.requireAdmin(); if (!ctx) return;
  document.getElementById("adminLogout")?.addEventListener("click", UI.safe(() => Auth.logout()));
  // Settings form
  document.getElementById("settingsForm")?.addEventListener("submit", UI.safe(async e => {
    e.preventDefault();
    const btn = e.target.querySelector("[type=submit]");
    UI.setBtnLoading(btn, true, "Saving…");
    const fd = new FormData(e.target);
    await Admin.saveSettings({
      interest_rate_min: +fd.get("rate_min")/100,
      interest_rate_max: +fd.get("rate_max")/100,
      repayment_days:    +fd.get("repayment_days"),
      pkg_starter_max:   +fd.get("pkg_starter_max"),
      pkg_boost_max:     +fd.get("pkg_boost_max"),
      pkg_advance_max:   +fd.get("pkg_advance_max"),
      pkg_premium_max:   +fd.get("pkg_premium_max"),
      helpdesk_phone1:   fd.get("phone1"),
      helpdesk_phone2:   fd.get("phone2"),
    });
    UI.toast("Settings saved.", "success");
    UI.setBtnLoading(btn, false);
  }));
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN — ADS
// ═══════════════════════════════════════════════════════════════
async function initAdminAds() {
  const ctx = await Auth.requireAdmin(); if (!ctx) return;

  const renderAds = async () => {
    const ads = await Ads.all();
    const el = document.getElementById("adsList");
    if (!el) return;
    el.innerHTML = ads.length ? ads.map(ad => `
      <div class="card" style="margin-bottom:14px">
        <div class="card-body" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <div style="flex:1;min-width:0">
            <div class="flex f-align gap8 mb4">
              <span class="badge ${ad.active?"badge-green":"badge-muted"}">${ad.active?"Active":"Paused"}</span>
              ${ad.price_label ? `<span class="badge badge-amber">${UI.esc(ad.price_label)}</span>` : ""}
            </div>
            <div class="fw-600 truncate">${UI.esc(ad.title)}</div>
            <div class="caption mt4 truncate">${UI.esc(ad.description||"")}</div>
            ${ad.cta_url ? `<div class="caption mt4 truncate" style="color:var(--blue)">${UI.esc(ad.cta_url)}</div>` : ""}
          </div>
          <div class="flex gap8 shrink-0">
            <button class="btn btn-ghost btn-sm" onclick="toggleAd('${ad.id}',${!ad.active})">${ad.active?"Pause":"Activate"}</button>
            <button class="btn btn-danger btn-sm" onclick="deleteAd('${ad.id}')">Delete</button>
          </div>
        </div>
      </div>`).join("")
    : `<div class="text-center caption p24">No ads yet.</div>`;
  };
  await renderAds();

  window.toggleAd = UI.safe(async (id,active) => { await Ads.update(id,{active}); UI.toast(active?"Ad activated.":"Ad paused.","success"); await renderAds(); });
  window.deleteAd = UI.safe(async (id) => { if(!confirm("Delete this ad?")) return; await Ads.remove(id); UI.toast("Deleted.","success"); await renderAds(); });

  document.getElementById("createAdForm")?.addEventListener("submit", UI.safe(async e => {
    e.preventDefault();
    const btn = e.target.querySelector("[type=submit]");
    UI.setBtnLoading(btn, true, "Publishing…");
    const fd = new FormData(e.target);
    await Ads.create({ title: fd.get("title"), description: fd.get("description"), cta_url: fd.get("cta_url"), cta_text: fd.get("cta_text"), price_label: fd.get("price_label"), price_period: fd.get("price_period"), phone: fd.get("phone"), active: true, sort_order: 0 });
    UI.toast("Ad published!", "success");
    e.target.reset(); UI.setBtnLoading(btn, false);
    await renderAds();
  }));

  document.getElementById("adminLogout")?.addEventListener("click", UI.safe(() => Auth.logout()));
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN — USERS
// ═══════════════════════════════════════════════════════════════
async function initAdminUsers() {
  const ctx = await Auth.requireAdmin(); if (!ctx) return;
  const users = await Admin.allUsers();
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set("uTotal",    users.length);
  set("uVerified", users.filter(u=>u.kyc_status==="approved").length);
  set("uPending",  users.filter(u=>u.kyc_status==="pending").length);

  const tbody = document.getElementById("usersBody");
  if (tbody) tbody.innerHTML = users.map(u => `
    <tr>
      <td class="bold">${UI.esc(u.full_name||"—")}</td>
      <td>${UI.esc(u.email)}</td>
      <td>${UI.esc(u.phone||"—")}</td>
      <td>${UI.esc(u.institution||"—")}</td>
      <td><span class="status status-${u.kyc_status||"not_started"}">${{not_started:"Not started",pending:"Pending",approved:"Verified",rejected:"Rejected"}[u.kyc_status||"not_started"]}</span></td>
      <td class="caption">${UI.fmtDate(u.created_at)}</td>
    </tr>`).join("") || `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--tx-4)">No users yet.</td></tr>`;

  document.getElementById("adminLogout")?.addEventListener("click", UI.safe(() => Auth.logout()));
}
