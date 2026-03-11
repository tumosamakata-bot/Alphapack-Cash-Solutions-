// ═══════════════════════════════════════════════════════════════
// ALPHA PACK — Supabase DB Layer v5.0
// ═══════════════════════════════════════════════════════════════
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
});

// ── AUTH ──────────────────────────────────────────────────────
export const Auth = {
  async session()  { const { data: { session } } = await sb.auth.getSession(); return session; },
  async user()     { const { data: { user } } = await sb.auth.getUser(); return user; },
  async isAuthed() { return Boolean((await this.session())?.user); },

  async register({ email, password, name, phone, institution, program, yearOfStudy, studentIdNo }) {
    const { data, error } = await sb.auth.signUp({ email, password,
      options: { data: { full_name: name, phone, institution, program, year_of_study: +yearOfStudy, student_id_no: studentIdNo, role: "user" } }
    });
    if (error) throw new Error(error.message);
    if (data.user) {
      await sb.from("profiles").insert({
        id: data.user.id, email, full_name: name, phone,
        institution, program, year_of_study: +yearOfStudy,
        student_id_no: studentIdNo, role: "user", kyc_status: "not_started"
      });
    }
    return data;
  },

  async login({ email, password }) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(
      error.message.includes("Invalid") ? "Incorrect email or password. Please try again." : error.message
    );
    return data;
  },

  async logout() { await sb.auth.signOut(); window.location.href = "/login.html"; },

  async profile(uid) {
    const { data, error } = await sb.from("profiles").select("*").eq("id", uid).single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateProfile(uid, updates) {
    const { data, error } = await sb.from("profiles").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", uid).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async requireAuth(to = "/login.html") {
    if (!await this.isAuthed()) {
      sessionStorage.setItem("ap_back", window.location.pathname + window.location.search);
      window.location.href = to; return null;
    }
    return this.user();
  },

  async requireAdmin() {
    const user = await this.requireAuth("/admin/login.html");
    if (!user) return null;
    const profile = await this.profile(user.id);
    if (profile?.role !== "admin") { window.location.href = "/admin/login.html"; return null; }
    return { user, profile };
  }
};

// ── LOANS ─────────────────────────────────────────────────────
export const Loans = {
  async submit({ userId, packageId, packageLabel, principal, interest, total, repaymentDays, purpose, phone }) {
    const due = new Date(); due.setDate(due.getDate() + repaymentDays);
    const { data, error } = await sb.from("loans").insert({
      user_id: userId, package_id: packageId, package_label: packageLabel,
      principal: +principal, interest: +interest, total_repayable: +total,
      repayment_days: repaymentDays, due_date: due.toISOString().split("T")[0],
      purpose, contact_phone: phone, status: "pending"
    }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async forUser(uid) {
    const { data, error } = await sb.from("loans").select("*").eq("user_id", uid).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async all(status) {
    let q = sb.from("loans").select("*, profiles:user_id(full_name,email,phone,institution)").order("created_at", { ascending: false });
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data || [];
  },

  async decision(id, status) {
    const { error } = await sb.from("loans").update({ status, decided_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(error.message);
  },

  async stats() {
    const { data } = await sb.from("loans").select("status,principal,interest,total_repayable");
    const all = data || [];
    const f = (s) => all.filter(l => l.status === s);
    const sum = (arr, k) => arr.reduce((a, l) => a + +l[k], 0);
    return {
      total: all.length,
      pending:  f("pending").length,
      approved: f("approved").length,
      declined: f("declined").length,
      totalDisbursed: sum(f("approved"), "principal"),
      totalInterest:  sum(f("approved"), "interest"),
      totalRepayable: sum(f("approved"), "total_repayable"),
    };
  }
};

// ── KYC ───────────────────────────────────────────────────────
export const KYC = {
  async submit(uid, frontFile, backFile) {
    const ts = Date.now();
    const upload = async (file, side) => {
      const path = `kyc/${uid}/${side}_${ts}${file.name.match(/\.[^.]+$/) || ".jpg"}`;
      const { error } = await sb.storage.from("kyc-docs").upload(path, file, { upsert: true });
      if (error) throw new Error(`Upload ${side} failed: ${error.message}`);
      return sb.storage.from("kyc-docs").getPublicUrl(path).data.publicUrl;
    };
    const [frontUrl, backUrl] = await Promise.all([upload(frontFile, "front"), upload(backFile, "back")]);
    await sb.from("profiles").update({ kyc_status: "pending", kyc_front_url: frontUrl, kyc_back_url: backUrl, kyc_submitted_at: new Date().toISOString() }).eq("id", uid);
    return { frontUrl, backUrl };
  },

  async decide(uid, status) {
    const { error } = await sb.from("profiles").update({ kyc_status: status, kyc_decided_at: new Date().toISOString() }).eq("id", uid);
    if (error) throw new Error(error.message);
  },

  async pending() {
    const { data } = await sb.from("profiles").select("*").eq("kyc_status", "pending").order("kyc_submitted_at");
    return data || [];
  }
};

// ── ADS ───────────────────────────────────────────────────────
export const Ads = {
  async active()    { const { data } = await sb.from("ads").select("*").eq("active", true).order("sort_order"); return data || []; },
  async all()       { const { data } = await sb.from("ads").select("*").order("created_at", { ascending: false }); return data || []; },
  async create(ad)  { const { error } = await sb.from("ads").insert(ad); if (error) throw new Error(error.message); },
  async update(id, d){ const { error } = await sb.from("ads").update(d).eq("id", id); if (error) throw new Error(error.message); },
  async remove(id)  { const { error } = await sb.from("ads").delete().eq("id", id); if (error) throw new Error(error.message); },
};

// ── ADMIN ─────────────────────────────────────────────────────
export const Admin = {
  async allUsers()    { const { data } = await sb.from("profiles").select("*").order("created_at", { ascending: false }); return data || []; },
  async userCount()   { const { count } = await sb.from("profiles").select("*", { count: "exact", head: true }); return count || 0; },
  async auditLog(n=50){ const { data } = await sb.from("audit_log").select("*").order("created_at", { ascending: false }).limit(n); return data || []; },

  async log(event, meta = {}) {
    const user = await Auth.user().catch(() => null);
    await sb.from("audit_log").insert({ user_id: user?.id || null, event, meta }).catch(() => {});
  },

  async getSettings() {
    const { data } = await sb.from("settings").select("*").single();
    return data;
  },
  async saveSettings(s) {
    const existing = await this.getSettings();
    if (existing) { await sb.from("settings").update(s).eq("id", existing.id); }
    else           { await sb.from("settings").insert(s); }
  }
};
