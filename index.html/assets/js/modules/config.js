// ═══════════════════════════════════════════════════════════════
// ALPHA PACK CASH SOLUTIONS — v5.0 · Business Config
// ═══════════════════════════════════════════════════════════════

// Supabase
export const SUPABASE_URL = "https://rhrkcfalfahlshvlllwd.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJocmtjZmFsZmFobHNodmxsbHdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMjMxNjEsImV4cCI6MjA4ODc5OTE2MX0.2bVyuZeBdX8ke6GKSXziHG75PgSS-gyxkxCw-lm7oz4";

// ── Business Profile ─────────────────────────────────────────
export const BIZ = {
  name: "Alpha Pack Cash Solutions",
  shortName: "Alpha Pack",
  tagline: "Botswana's student lending partner — clear terms, real money.",
  country: "Botswana",
  currency: "P",
  currencyFull: "BWP (Pula)",

  wa1: "26776807549",
  wa2: "26778322911",
  phone1: "+267 76 807 549",
  phone2: "+267 78 322 911",
  email: "support@alphapackcash.co.bw",
  hours: "Mon–Fri 08:00 – 17:00",

  interestRateMin: 0.25,
  interestRateMax: 0.30,
  interestRateDisplay: "25%–30%",
  repaymentDays: 30,
  repaymentDaysAlt: [14, 21, 30],

  packages: [
    { id: "starter", label: "Starter", icon: "🚀", min: 100, max: 500, desc: "For quick everyday needs" },
    { id: "boost", label: "Boost", icon: "📚", min: 500, max: 1000, desc: "Bigger student expenses" },
    { id: "advance", label: "Advance", icon: "🎓", min: 1000, max: 2000, desc: "Major academic support" },
    { id: "premium", label: "Premium", icon: "💎", min: 2000, max: 5000, desc: "Full-semester coverage" },
  ],

  established: "2022",
  version: "5.0",
  studentOnly: true,

  adPriceMonth: 350,
};

// Format Pula
export const P = (n) =>
  `P ${Number(n).toLocaleString("en-BW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

// Loan calculator
export const calcLoan = (principal) => {
  const p = Number(principal);
  const rate = p >= 1000 ? BIZ.interestRateMin : BIZ.interestRateMax;
  const interest = Math.round(p * rate);
  const total = p + interest;
  return { principal: p, rate, interest, total };
};
