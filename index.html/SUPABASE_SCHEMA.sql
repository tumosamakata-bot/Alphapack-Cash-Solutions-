-- ================================================================
-- ALPHA PACK CASH SOLUTIONS v5.0
-- Supabase PostgreSQL Schema + RLS Policies
-- Run this ENTIRE script in: Supabase Dashboard → SQL Editor
-- ================================================================

-- ── 1. PROFILES ──────────────────────────────────────────────
create table if not exists public.profiles (
  id                uuid references auth.users(id) on delete cascade primary key,
  email             text not null,
  full_name         text,
  phone             text,
  institution       text,
  program           text,
  year_of_study     int,
  student_id_no     text,
  role              text not null default 'user',         -- 'user' | 'admin'
  kyc_status        text not null default 'not_started',  -- 'not_started' | 'pending' | 'approved' | 'rejected'
  kyc_front_url     text,
  kyc_back_url      text,
  kyc_submitted_at  timestamptz,
  kyc_decided_at    timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ── 2. LOANS ─────────────────────────────────────────────────
create table if not exists public.loans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete cascade not null,
  package_id      text not null,
  package_label   text not null,
  principal       numeric(10,2) not null,
  interest        numeric(10,2) not null,
  interest_rate   numeric(5,4) not null default 0.30,
  total_repayable numeric(10,2) not null,
  repayment_days  int not null default 30,
  due_date        date,
  purpose         text,
  contact_phone   text,
  status          text not null default 'pending',  -- 'pending' | 'approved' | 'declined'
  decided_at      timestamptz,
  created_at      timestamptz default now()
);

-- ── 3. SETTINGS ───────────────────────────────────────────────
create table if not exists public.settings (
  id                  uuid primary key default gen_random_uuid(),
  interest_rate_min   numeric(5,4) default 0.25,
  interest_rate_max   numeric(5,4) default 0.30,
  repayment_days      int default 30,
  pkg_starter_max     int default 500,
  pkg_boost_max       int default 1000,
  pkg_advance_max     int default 2000,
  pkg_premium_max     int default 5000,
  helpdesk_phone1     text default '26776807549',
  helpdesk_phone2     text default '26778322911',
  updated_at          timestamptz default now()
);

-- ── 4. ADS ────────────────────────────────────────────────────
create table if not exists public.ads (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  cta_url      text,
  cta_text     text default 'Learn More',
  price_label  text,
  price_period text,
  phone        text,
  active       boolean default true,
  sort_order   int default 0,
  created_at   timestamptz default now()
);

-- ── 5. AUDIT LOG ──────────────────────────────────────────────
create table if not exists public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  event      text not null,
  meta       jsonb default '{}',
  created_at timestamptz default now()
);

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================

alter table public.profiles  enable row level security;
alter table public.loans     enable row level security;
alter table public.settings  enable row level security;
alter table public.ads       enable row level security;
alter table public.audit_log enable row level security;

-- Helper function: check if current user is admin
create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- PROFILES
create policy "profile: users read own"    on public.profiles for select using (auth.uid() = id);
create policy "profile: users update own"  on public.profiles for update using (auth.uid() = id);
create policy "profile: users insert own"  on public.profiles for insert with check (auth.uid() = id);
create policy "profile: admin read all"    on public.profiles for select using (is_admin());
create policy "profile: admin update all"  on public.profiles for update using (is_admin());

-- LOANS
create policy "loan: users read own"    on public.loans for select using (auth.uid() = user_id);
create policy "loan: users insert own"  on public.loans for insert with check (auth.uid() = user_id);
create policy "loan: admin read all"    on public.loans for select using (is_admin());
create policy "loan: admin update all"  on public.loans for update using (is_admin());

-- SETTINGS
create policy "settings: anyone read"    on public.settings for select using (true);
create policy "settings: admin manage"   on public.settings for all   using (is_admin());

-- ADS
create policy "ads: anyone read active"  on public.ads for select using (active = true);
create policy "ads: admin manage all"    on public.ads for all   using (is_admin());

-- AUDIT
create policy "audit: admin read"        on public.audit_log for select using (is_admin());
create policy "audit: authed insert"     on public.audit_log for insert with check (auth.uid() is not null);

-- ================================================================
-- SEED DATA (optional)
-- ================================================================

-- Default settings row
insert into public.settings default values;

-- Default ad (shown until you create real ads)
insert into public.ads (title, description, cta_text, price_label, price_period, active, sort_order)
values (
  'Advertise to Botswana Students',
  'Reach thousands of verified student borrowers directly on Alpha Pack. Homepage banner slots are limited.',
  'Contact us to advertise',
  'P350', 'per month / slot', true, 0
);

-- ================================================================
-- STORAGE BUCKET SETUP
-- Do this manually in Supabase Dashboard → Storage
-- ================================================================
-- 1. Click "New bucket"
-- 2. Name: kyc-docs
-- 3. Public: OFF (private)
-- 4. Click Create
--
-- Then add Storage Policies in Dashboard → Storage → kyc-docs → Policies:
--
-- Policy: "Users upload own KYC"
--   Operation: INSERT
--   Expression: (auth.uid()::text = (storage.foldername(name))[1])
--
-- Policy: "Users read own KYC"
--   Operation: SELECT
--   Expression: (auth.uid()::text = (storage.foldername(name))[1])
--
-- Policy: "Admins read all KYC"
--   Operation: SELECT
--   Expression: is_admin()

-- ================================================================
-- DONE.
-- Next: Go to admin/provision.html to create your admin account
-- Then DELETE provision.html from GitHub immediately after.
-- ================================================================
