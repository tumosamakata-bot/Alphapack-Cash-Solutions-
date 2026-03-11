# Alpha Pack Cash Solutions — v5.0
## Student Loans · Botswana · GitHub Pages + Supabase

---

## ⚡ Quick Start (5 steps)

### Step 1 — Set up Supabase database

1. Open [supabase.com](https://supabase.com) and sign in
2. Select your project (`faxmrfpxotcoidpxxtsk`)
3. Go to **SQL Editor** (left sidebar)
4. Click **New query**
5. Paste the ENTIRE contents of `SUPABASE_SCHEMA.sql`
6. Click **Run** — all tables, policies, and seed data will be created

### Step 2 — Create the storage bucket

1. Supabase → **Storage** (left sidebar)
2. Click **New bucket**
3. Name: `kyc-docs` | Public: **OFF** | Click Create
4. Click the `kyc-docs` bucket → **Policies** tab
5. Add these policies:

| Name | Operation | Expression |
|------|-----------|------------|
| Users upload own | INSERT | `(auth.uid()::text = (storage.foldername(name))[1])` |
| Users read own | SELECT | `(auth.uid()::text = (storage.foldername(name))[1])` |
| Admins read all | SELECT | `is_admin()` |

### Step 3 — Add your Supabase anon key

1. Supabase → **Project Settings** → **API**
2. Copy the **anon / public** key (the long JWT string)
3. Open `assets/js/modules/config.js`
4. Replace `PASTE_YOUR_ANON_KEY_HERE` with your real key:

```js
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

### Step 4 — Deploy to GitHub Pages

1. Create a new GitHub repository (e.g. `alphapack`)
2. Push all project files to the `main` branch root
3. GitHub repo → **Settings** → **Pages**
4. Source: **Deploy from a branch** → Branch: `main` → Folder: `/ (root)`
5. Click Save — your site will be live in ~60 seconds at:
   `https://yourusername.github.io/alphapack`

> **Critical:** GitHub Pages serves over HTTPS — required for camera capture on verify.html

### Step 5 — Create your admin account

1. Visit `https://yourusername.github.io/alphapack/admin/provision.html`
2. Enter your admin email and a strong password (10+ chars)
3. Click Create
4. **IMMEDIATELY delete `admin/provision.html` from your GitHub repo**
5. Log in at `admin/login.html`

---

## 🔐 Supabase Auth Settings

In Supabase → **Authentication** → **Settings**:

| Setting | Value |
|---------|-------|
| Site URL | `https://yourusername.github.io` |
| Redirect URLs | `https://yourusername.github.io/alphapack/**` |
| Email confirmations | Enable for production, disable for testing |

---

## 📁 Project Structure

```
alphapack/
├── index.html              ← Homepage (hero, packages, calculator, ads, FAQ)
├── register.html           ← Student registration
├── login.html              ← Student login
├── dashboard.html          ← Student dashboard (auth protected)
├── apply.html              ← Loan application (auth + KYC required)
├── verify.html             ← Student ID upload + camera (auth required)
├── faq.html                ← Full FAQ page
├── terms.html              ← Terms & conditions
├── privacy.html            ← Privacy policy
├── SUPABASE_SCHEMA.sql     ← Run in Supabase SQL Editor
├── README.md               ← This file
├── assets/
│   ├── css/
│   │   └── main.css        ← Full design system (dark navy + amber gold)
│   └── js/
│       ├── app.js          ← Page router + all page logic
│       └── modules/
│           ├── config.js   ← ⚠ PUT YOUR ANON KEY HERE
│           ├── db.js       ← Supabase Auth/DB/Storage helpers
│           └── ui.js       ← Toast, particles, modals, upload zones, etc.
└── admin/
    ├── provision.html      ← ⚠ ONE-TIME SETUP — DELETE AFTER USE
    ├── login.html          ← Admin authentication
    ├── dashboard.html      ← KYC queue + loan queue + KPIs
    ├── insights.html       ← Charts + analytics
    ├── settings.html       ← Business configuration
    ├── ads.html            ← Create/manage homepage ads
    └── users.html          ← All registered students
```

---

## 💰 Business Rules

| Parameter | Value |
|-----------|-------|
| Currency | Pula (BWP, P) |
| Interest — small loans (≤ P1,000) | 30% flat |
| Interest — large loans (> P1,000) | 25% flat |
| Repayment options | 14 days, 21 days, 30 days |
| Starter package | P100 – P500 |
| Boost package | P500 – P1,000 |
| Advance package | P1,000 – P2,000 |
| Premium package | P2,000 – P5,000 |
| Eligible borrowers | Enrolled students only |
| WhatsApp / Phone 1 | +267 76 807 549 |
| WhatsApp / Phone 2 | +267 78 322 911 |
| Helpdesk hours | Mon–Fri 08:00–17:00 |

---

## 🧭 Student Flow

```
Register → Confirm email → Log in → Verify Student ID → Admin reviews (1-2 days)
→ Approved → Apply for loan → Admin reviews → Approved/Declined → Repay
```

### Guards enforced:
- **Cannot apply** without logging in → redirected to login
- **Cannot apply** without KYC approved → redirected to verify
- **Cannot access dashboard** without being logged in

---

## 🛡 Admin Flow

```
provision.html (once, then DELETE) → login.html → dashboard.html
```

### Admin can:
- ✅ Approve / reject Student ID submissions (with photo viewer)
- ✅ Approve / decline loan applications (with detail modal)
- ✅ View business KPIs (total, pending, approved, disbursed, interest)
- ✅ View analytics charts (package distribution, monthly trend)
- ✅ Create, activate, pause, delete homepage ads
- ✅ Update business settings (rates, limits, contacts)
- ✅ Browse all registered students

---

## 📢 Ad System

Charge businesses to reach your student audience:

- Recommended rate: **P350/month per slot**
- Create ads in `admin/ads.html`
- Ads appear in the homepage promotional banner
- Multiple active ads supported
- Toggle active/paused without deleting

---

## 🔧 Customise Business Constants

Edit `assets/js/modules/config.js` to change:
- Package names, min/max amounts
- Interest rates
- Repayment day options
- Contact numbers
- Business name / tagline

Redeploy to GitHub Pages after any change to config.js.

---

## 🗄 Supabase Project

```
Project URL:  https://faxmrfpxotcoidpxxtsk.supabase.co
Anon Key:     assets/js/modules/config.js → SUPABASE_ANON_KEY
```

Tables created by SUPABASE_SCHEMA.sql:
- `profiles` — student accounts + KYC status
- `loans` — all loan applications
- `settings` — configurable business rules
- `ads` — homepage promotional banners
- `audit_log` — admin action history

---

## 🚀 Update & Redeploy

After editing any file:
```bash
git add .
git commit -m "Update site"
git push
```
GitHub Pages redeploys automatically within ~60 seconds.

---

*Alpha Pack Cash Solutions v5.0 · Built for Botswana students · Pula (BWP)*
