/**
 * Demo data for the fictional "Northbank". Everything here is generated; no real people or banks.
 * Deterministic (fixed faker seed) so screenshots and tests stay stable.
 *
 * Demo accounts (password for all: demo1234):
 *   lena.weber@northbank.example    analyst, Europe, clearance 2
 *   omar.haddad@northbank.example   supervisor, Gulf and Türkiye, clearance 3
 *   elif.kaya@northbank.example     compliance manager, all regions, clearance 4
 *   james.carter@northbank.example  system admin, all regions, clearance 4
 */
import { fakerDE, fakerEN_GB, fakerTR, faker as base } from "@faker-js/faker";
import argon2 from "argon2";
import { permissions as allPermissions, type CriteriaGroup } from "@aml/shared";
import { createDb } from "../src/db/prisma";

try {
  process.loadEnvFile();
} catch {
  // use real environment variables
}

const db = createDb(process.env.DATABASE_URL ?? "");
const SEED = 42;
for (const f of [base, fakerDE, fakerEN_GB, fakerTR]) f.seed(SEED);
const f = base;

const DEMO_PASSWORD = "demo1234";
const DAYS = 90;
const TX_COUNT = 150_000;
const NOW = new Date();
const DAY = 86_400_000;

const FX: Record<string, number> = { EUR: 1, USD: 0.92, TRY: 0.027, AED: 0.25 };
const HIGH_RISK = ["XA", "XB", "XC"]; // fictional high-risk jurisdictions

// ---------- helpers ----------
const pick = <T>(items: readonly T[]): T => items[Math.floor(f.number.float({ min: 0, max: 0.999999 }) * items.length)]!;
const chance = (p: number) => f.number.float({ min: 0, max: 1 }) < p;
const between = (min: number, max: number) => f.number.float({ min, max });
const int = (min: number, max: number) => f.number.int({ min, max });
const money = (n: number) => n.toFixed(2);
const weighted = <T>(entries: Array<[T, number]>): T => {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = between(0, total);
  for (const [v, w] of entries) {
    if ((r -= w) <= 0) return v;
  }
  return entries[entries.length - 1]![0];
};
const lognormal = (median: number, spread: number) => median * Math.exp(f.number.float({ min: -1, max: 1 }) * spread + (chance(0.05) ? between(0.5, 2) : 0));

// ---------- time zones: every timestamp is generated in the branch's local time ----------
const formatters = new Map<string, Intl.DateTimeFormat>();
const partsIn = (tz: string, ms: number) => {
  let fmt = formatters.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short" });
    formatters.set(tz, fmt);
  }
  const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month) - 1, d: Number(p.day), h: Number(p.hour), mi: Number(p.minute), s: Number(p.second), weekday: p.weekday as string };
};
/** UTC instant for a wall-clock time in a time zone. */
const zoned = (tz: string, y: number, m: number, d: number, h: number, mi: number, sec: number) => {
  const guess = Date.UTC(y, m, d, h, mi, sec);
  const p = partsIn(tz, guess);
  const offset = Date.UTC(p.y, p.m, p.d, p.h, p.mi, p.s) - guess;
  return new Date(guess - offset);
};
const clampNow = (t: Date) => (t > NOW ? new Date(NOW.getTime() - int(60, 3_600) * 1000) : t);

// 2-hour buckets: weekday activity peaks 10:00-14:00 local time (branch opening hours)
const HOUR_WEIGHTS = [0.2, 0.1, 0.3, 0.8, 1.6, 2.6, 2.8, 2.2, 1.9, 1.3, 0.7, 0.5];
const randomTime = (tz: string, daysBackMax = DAYS, daysBackMin = 0) => {
  const day = partsIn(tz, NOW.getTime() - int(daysBackMin, daysBackMax - 1) * DAY);
  const weekend = day.weekday === "Sat" || day.weekday === "Sun";
  const bucket = weighted(HOUR_WEIGHTS.map((w, i) => [i, weekend ? w * 0.4 : w] as [number, number]));
  const hours = bucket * 2 + between(0, 1.999);
  return clampNow(zoned(tz, day.y, day.m, day.d, Math.floor(hours), Math.floor((hours % 1) * 60), int(0, 59)));
};
/** Same local day as `at`, at a random time between two local hours. */
const sameDay = (tz: string, at: Date, hourFrom: number, hourTo: number) => {
  const p = partsIn(tz, at.getTime());
  return clampNow(zoned(tz, p.y, p.m, p.d, int(hourFrom, hourTo), int(0, 59), int(0, 59)));
};

const iban = (country: string) => `${country}${int(10, 99)}${f.string.numeric(country === "TR" ? 22 : country === "AE" ? 19 : 18)}`;

const GULF_FIRST = ["Omar", "Layla", "Yousef", "Mariam", "Khalid", "Noura", "Hamdan", "Aisha", "Rashid", "Salma", "Tariq", "Hessa", "Faisal", "Reem"];
const GULF_LAST = ["Al Mansouri", "Haddad", "Nasser", "Al Falasi", "Saleh", "Karam", "Rahman", "Farouk", "Al Suwaidi", "Bakr"];

const personName = (country: string) => {
  if (country === "DE") return `${fakerDE.person.firstName()} ${fakerDE.person.lastName()}`;
  if (country === "GB") return `${fakerEN_GB.person.firstName()} ${fakerEN_GB.person.lastName()}`;
  if (country === "TR") return `${fakerTR.person.firstName()} ${fakerTR.person.lastName()}`;
  return `${pick(GULF_FIRST)} ${pick(GULF_LAST)}`;
};
const companyName = (country: string) => {
  const core = (country === "DE" ? fakerDE : country === "TR" ? fakerTR : fakerEN_GB).company.name().split(/[ ,-]/)[0];
  const suffix = { DE: "GmbH", GB: "Ltd", TR: "A.Ş.", AE: pick(["FZE", "LLC"]) }[country] ?? "Ltd";
  return `${core} ${pick(["Trading", "Logistics", "Holding", "Textiles", "Imports", "Group", "Partners", "Capital"])} ${suffix}`;
};

// ---------- reference data ----------
const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  ANALYST: ["overview.view", "alerts.view", "alerts.decide", "cases.view", "cases.create", "transactions.view", "customers.view", "reports.view"],
  SUPERVISOR: ["overview.view", "alerts.view", "alerts.decide", "cases.view", "cases.create", "cases.approve", "transactions.view", "customers.view", "customers.manage", "rules.view", "reports.view", "news.create"],
  COMPLIANCE_MANAGER: allPermissions.filter((p) => p !== "admin.manage"),
  ADMIN: allPermissions,
};
const ROLE_NAMES: Record<string, string> = { ANALYST: "Analyst", SUPERVISOR: "Supervisor", COMPLIANCE_MANAGER: "Compliance manager", ADMIN: "System admin" };

const REGIONS = [
  { code: "EU", name: "Europe" },
  { code: "TR", name: "Türkiye" },
  { code: "GULF", name: "Gulf" },
];
const BRANCHES = [
  { code: "BER", tz: "Europe/Berlin", name: "Berlin Mitte", city: "Berlin", country: "DE", lat: 52.52, lng: 13.405, region: "EU", customers: 500, currencies: ["EUR"] },
  { code: "HAM", tz: "Europe/Berlin", name: "Hamburg Hafen", city: "Hamburg", country: "DE", lat: 53.55, lng: 9.99, region: "EU", customers: 300, currencies: ["EUR"] },
  { code: "LON", tz: "Europe/London", name: "London City", city: "London", country: "GB", lat: 51.507, lng: -0.128, region: "EU", customers: 450, currencies: ["EUR", "USD"] },
  { code: "IST", tz: "Europe/Istanbul", name: "Istanbul Levent", city: "Istanbul", country: "TR", lat: 41.08, lng: 29.01, region: "TR", customers: 500, currencies: ["TRY", "TRY", "EUR"] },
  { code: "IZM", tz: "Europe/Istanbul", name: "Izmir Alsancak", city: "Izmir", country: "TR", lat: 38.43, lng: 27.14, region: "TR", customers: 250, currencies: ["TRY", "EUR"] },
  { code: "DXB", tz: "Asia/Dubai", name: "Dubai DIFC", city: "Dubai", country: "AE", lat: 25.21, lng: 55.28, region: "GULF", customers: 400, currencies: ["AED", "USD"] },
] as const;

const cond = (field: string, operator: string, value: unknown) => ({ kind: "condition", field, operator, value });
const RULES: Array<{ code: string; name: string; description: string; riskLevel: "HIGH" | "MEDIUM" | "LOW"; criteria: CriteriaGroup }> = [
  {
    code: "R-STRUCT", name: "Structuring below limit", riskLevel: "HIGH",
    description: "Several cash deposits just under EUR 10,000 on the same day.",
    criteria: { kind: "group", combinator: "and", children: [cond("channel", "eq", "CASH"), cond("direction", "eq", "IN"), cond("baseAmount", "between", [9000, 9999])] } as CriteriaGroup,
  },
  {
    code: "R-RAPID", name: "Rapid in and out", riskLevel: "HIGH",
    description: "Money leaves the account within 24 hours of arriving.",
    criteria: { kind: "group", combinator: "and", children: [cond("channel", "eq", "WIRE"), cond("baseAmount", "gte", 20000)] } as CriteriaGroup,
  },
  {
    code: "R-HRC", name: "High-risk country transfer", riskLevel: "MEDIUM",
    description: "Transfer to or from a high-risk jurisdiction above EUR 10,000.",
    criteria: { kind: "group", combinator: "and", children: [cond("counterpartyCountry", "in", HIGH_RISK), cond("baseAmount", "gte", 10000)] } as CriteriaGroup,
  },
  {
    code: "R-DORMANT", name: "Dormant account active", riskLevel: "MEDIUM",
    description: "Large movement on an account with no activity for 12 months.",
    criteria: { kind: "group", combinator: "and", children: [cond("baseAmount", "gte", 15000)] } as CriteriaGroup,
  },
  {
    code: "R-ROUND", name: "Repeated round amounts", riskLevel: "LOW",
    description: "Repeated transfers of exact round amounts.",
    criteria: { kind: "group", combinator: "or", children: [cond("baseAmount", "in", ["10000", "25000", "50000", "100000"])] } as CriteriaGroup,
  },
];
const RULE_SCORE: Record<string, [number, number]> = { "R-STRUCT": [62, 98], "R-RAPID": [58, 95], "R-HRC": [40, 85], "R-DORMANT": [35, 80], "R-ROUND": [15, 60] };

async function main() {
  console.time("seed");
  await db.$executeRawUnsafe(
    `TRUNCATE "AuditLog","Alert","Transaction","Account","Customer","Rule","Session","UserRegion","User","RolePermission","Permission","Role","Branch","Region","ClearanceLevel" RESTART IDENTITY CASCADE`,
  );

  // access model
  const perms = [];
  for (const key of allPermissions) perms.push(await db.permission.create({ data: { key } }));
  const permId = Object.fromEntries(perms.map((p) => [p.key, p.id]));
  const roles: Record<string, string> = {};
  for (const key of Object.keys(ROLE_PERMISSIONS)) {
    const role = await db.role.create({
      data: {
        key: key as never,
        name: ROLE_NAMES[key]!,
        permissions: { create: ROLE_PERMISSIONS[key]!.map((p) => ({ permissionId: permId[p]! })) },
      },
    });
    roles[key] = role.id;
  }
  await db.clearanceLevel.createMany({
    data: [
      { rank: 1, name: "Public" },
      { rank: 2, name: "Internal" },
      { rank: 3, name: "Confidential" },
      { rank: 4, name: "Strictly confidential" },
    ],
  });

  const regionId: Record<string, string> = {};
  for (const r of REGIONS) regionId[r.code] = (await db.region.create({ data: r })).id;
  const branchId: Record<string, string> = {};
  for (const b of BRANCHES) {
    branchId[b.code] = (
      await db.branch.create({ data: { code: b.code, name: b.name, city: b.city, country: b.country, timezone: b.tz, lat: b.lat, lng: b.lng, regionId: regionId[b.region]! } })
    ).id;
  }

  const passwordHash = await argon2.hash(DEMO_PASSWORD);
  const USERS = [
    { email: "lena.weber@northbank.example", name: "Lena Weber", role: "ANALYST", rank: 2, regions: ["EU"] },
    { email: "omar.haddad@northbank.example", name: "Omar Haddad", role: "SUPERVISOR", rank: 3, regions: ["GULF", "TR"] },
    { email: "elif.kaya@northbank.example", name: "Elif Kaya", role: "COMPLIANCE_MANAGER", rank: 4, regions: ["EU", "TR", "GULF"] },
    { email: "james.carter@northbank.example", name: "James Carter", role: "ADMIN", rank: 4, regions: ["EU", "TR", "GULF"] },
    { email: "jonas.becker@northbank.example", name: "Jonas Becker", role: "ANALYST", rank: 2, regions: ["EU"] },
    { email: "emma.clarke@northbank.example", name: "Emma Clarke", role: "ANALYST", rank: 3, regions: ["EU"] },
    { email: "selin.aydin@northbank.example", name: "Selin Aydın", role: "ANALYST", rank: 2, regions: ["TR"] },
    { email: "yousef.nasser@northbank.example", name: "Yousef Nasser", role: "ANALYST", rank: 2, regions: ["GULF"] },
  ];
  const analystsByRegion: Record<string, string[]> = { EU: [], TR: [], GULF: [] };
  for (const u of USERS) {
    const user = await db.user.create({
      data: {
        email: u.email, name: u.name, passwordHash, roleId: roles[u.role]!, clearanceRank: u.rank,
        regions: { create: u.regions.map((r) => ({ regionId: regionId[r]! })) },
      },
    });
    if (u.role === "ANALYST") u.regions.forEach((r) => analystsByRegion[r]!.push(user.id));
  }

  const ruleId: Record<string, string> = {};
  for (const r of RULES) ruleId[r.code] = (await db.rule.create({ data: { ...r, criteria: r.criteria as object } })).id;

  // customers and accounts
  type Acc = { id: string; customerId: string; branch: (typeof BRANCHES)[number]; currency: string; dormant: boolean; clearance: number };
  const customers: Array<Record<string, unknown>> = [];
  const accounts: Acc[] = [];
  const accountRows: Array<Record<string, unknown>> = [];
  let customerNo = 10000;
  for (const b of BRANCHES) {
    for (let i = 0; i < b.customers; i++) {
      const id = f.string.uuid();
      const company = chance(0.3);
      const pep = !company && chance(0.02);
      const clearance = pep ? 4 : chance(0.08) ? 3 : chance(0.5) ? 2 : 1;
      customers.push({
        id, code: `CU-${customerNo++}`, type: company ? "COMPANY" : "PERSON",
        name: company ? companyName(b.country) : personName(b.country),
        country: chance(0.85) ? b.country : pick(["DE", "GB", "TR", "AE", "NL", "FR", "US"]),
        occupation: company ? null : pick(["Engineer", "Teacher", "Doctor", "Shop owner", "Consultant", "Student", "Retired", "Driver", "Lawyer", "Architect"]),
        riskScore: pep ? int(60, 90) : int(5, chance(0.1) ? 85 : 55),
        pep, clearanceRank: clearance, branchId: branchId[b.code]!,
        createdAt: new Date(NOW.getTime() - int(200, 3000) * DAY),
      });
      const n = chance(0.3) ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const accId = f.string.uuid();
        const currency = pick(b.currencies);
        const dormant = chance(0.04);
        accounts.push({ id: accId, customerId: id, branch: b, currency, dormant, clearance });
        accountRows.push({
          id: accId, iban: iban(b.country), currency, status: dormant ? "DORMANT" : "ACTIVE",
          balance: money(lognormal(company ? 80000 : 6000, 1.2) / FX[currency]!),
          openedAt: new Date(NOW.getTime() - int(400, 3000) * DAY), customerId: id, branchId: branchId[b.code]!,
        });
      }
    }
  }
  await db.customer.createMany({ data: customers as never });
  await db.account.createMany({ data: accountRows as never });
  console.log(`customers ${customers.length}, accounts ${accounts.length}`);

  // transactions
  const activeAccounts = accounts.filter((a) => !a.dormant);
  const tx: Array<Record<string, unknown>> = [];
  const flagged: Array<{ txId: string; rule: string; acc: Acc; at: Date; baseAmount: number; amount: number }> = [];
  let txNo = 1;
  const counterpartyCountry = (home: string) => (chance(0.012) ? pick(HIGH_RISK) : chance(0.72) ? home : pick(["DE", "GB", "TR", "AE", "NL", "FR", "US", "CH", "IT", "ES"]));

  const addTx = (acc: Acc, at: Date, o: { channel: string; direction: string; base: number; country?: string; name?: string }) => {
    const id = f.string.uuid();
    const amount = o.base / FX[acc.currency]!;
    const country = o.country ?? counterpartyCountry(acc.branch.country);
    tx.push({
      id, ref: `TX-${String(txNo++).padStart(8, "0")}`, accountId: acc.id, branchId: branchId[acc.branch.code]!,
      direction: o.direction, channel: o.channel, amount: money(amount), currency: acc.currency, baseAmount: money(o.base),
      counterpartyName: o.name ?? (o.channel === "CASH" ? "Cash deposit" : chance(0.5) ? companyName(acc.branch.country) : personName(acc.branch.country)),
      counterpartyIban: o.channel === "CASH" ? null : iban(country.length === 2 && !HIGH_RISK.includes(country) ? country : "XX"),
      counterpartyCountry: o.channel === "CASH" ? acc.branch.country : country, bookedAt: at,
    });
    return { id, amount };
  };

  for (let i = 0; i < TX_COUNT; i++) {
    const acc = pick(activeAccounts);
    const channel = weighted<string>([["CARD", 45], ["ONLINE", 30], ["WIRE", 15], ["CASH", 10]]);
    const base = channel === "CARD" ? lognormal(60, 1.1) : channel === "ONLINE" ? lognormal(400, 1.3) : channel === "CASH" ? lognormal(800, 1.2) : lognormal(6000, 1.5);
    addTx(acc, randomTime(acc.branch.tz), { channel, direction: channel === "CARD" ? "OUT" : chance(0.5) ? "IN" : "OUT", base: Math.min(base, 900_000) });
  }

  // suspicious patterns
  const flag = (rule: string, acc: Acc, at: Date, o: Parameters<typeof addTx>[2]) => {
    const { id, amount } = addTx(acc, at, o);
    flagged.push({ txId: id, rule, acc, at, baseAmount: o.base, amount });
  };
  // structuring: 3-5 cash deposits just under 10k on one day
  for (let i = 0; i < 260; i++) {
    const acc = pick(activeAccounts);
    const day = randomTime(acc.branch.tz);
    for (let k = 0, n = int(3, 5); k < n; k++) flag("R-STRUCT", acc, sameDay(acc.branch.tz, day, 9, 18), { channel: "CASH", direction: "IN", base: between(9000, 9990) });
  }
  // the story on the overview: Friday 22:00-24:00 at Berlin in the last week
  const berlin = activeAccounts.filter((a) => a.branch.code === "BER");
  const today = partsIn("Europe/Berlin", NOW.getTime());
  const daysSinceFriday = (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(today.weekday) + 2) % 7;
  const friday = partsIn("Europe/Berlin", NOW.getTime() - daysSinceFriday * DAY);
  for (let i = 0; i < 31; i++) {
    const at = clampNow(zoned("Europe/Berlin", friday.y, friday.m, friday.d, int(22, 23), int(0, 59), int(0, 59)));
    flag("R-STRUCT", pick(berlin), at, { channel: "CASH", direction: "IN", base: between(9100, 9980) });
  }
  // rapid in and out
  for (let i = 0; i < 420; i++) {
    const acc = pick(activeAccounts);
    const at = randomTime(acc.branch.tz);
    const base = lognormal(60000, 0.8);
    addTx(acc, at, { channel: "WIRE", direction: "IN", base });
    flag("R-RAPID", acc, new Date(Math.min(at.getTime() + int(1, 22) * 3_600_000, NOW.getTime() - 60_000)), { channel: "WIRE", direction: "OUT", base: base * between(0.85, 0.98), country: pick(["CH", "AE", "NL", ...HIGH_RISK]) });
  }
  // high-risk country transfers
  for (let i = 0; i < 520; i++) flag("R-HRC", ...((a) => [a, randomTime(a.branch.tz)] as const)(pick(activeAccounts)), { channel: "WIRE", direction: chance(0.7) ? "OUT" : "IN", base: lognormal(28000, 0.9) + 10000, country: pick(HIGH_RISK) });
  // dormant accounts waking up
  for (const acc of accounts.filter((a) => a.dormant)) {
    if (chance(0.6)) flag("R-DORMANT", acc, randomTime(acc.branch.tz), { channel: "WIRE", direction: "IN", base: lognormal(40000, 0.8) + 15000 });
  }
  // round amounts
  for (let i = 0; i < 700; i++) flag("R-ROUND", ...((a) => [a, randomTime(a.branch.tz)] as const)(pick(activeAccounts)), { channel: "WIRE", direction: chance(0.5) ? "IN" : "OUT", base: pick([10000, 25000, 50000, 100000]) });

  for (let i = 0; i < tx.length; i += 5000) await db.transaction.createMany({ data: tx.slice(i, i + 5000) as never });
  console.log(`transactions ${tx.length}`);

  // alerts: every flagged transaction plus noisy false positives from normal traffic
  const noise = tx.filter((t) => Number(t.baseAmount) > 15000 && chance(0.35)).map((t) => ({
    txId: t.id as string, rule: weighted<string>([["R-ROUND", 3], ["R-HRC", 1], ["R-RAPID", 2], ["R-DORMANT", 1]]),
    acc: accounts.find((a) => a.id === t.accountId)!, at: t.bookedAt as Date, baseAmount: Number(t.baseAmount), amount: Number(t.amount),
  }));
  const all = [...flagged.map((x) => ({ ...x, real: true })), ...noise.map((x) => ({ ...x, real: false }))].sort((a, b) => a.at.getTime() - b.at.getTime());

  const decidersByRegion: Record<string, string[]> = analystsByRegion;
  const alerts = all.map((x, i) => {
    const [lo, hi] = RULE_SCORE[x.rule]!;
    const score = Math.round(Math.min(99, between(lo, hi) + (x.real ? 4 : -12)));
    const riskLevel = score >= 75 ? "HIGH" : score >= 45 ? "MEDIUM" : "LOW";
    const createdAt = new Date(x.at.getTime() + int(5, 180) * 60_000 > NOW.getTime() ? NOW.getTime() - 60_000 : x.at.getTime() + int(5, 180) * 60_000);
    const ageDays = (NOW.getTime() - createdAt.getTime()) / DAY;
    const region = x.acc.branch.region;
    const assignee = pick(decidersByRegion[region]!);
    let status: string;
    if (ageDays > 3) status = weighted([["CLOSED_FALSE_POSITIVE", x.real ? 68 : 92], ["ESCALATED", x.real ? 28 : 5], ["IN_REVIEW", ageDays <= 14 ? 3 : 0]]);
    else status = weighted([["NEW", 55], ["IN_REVIEW", 30], ["CLOSED_FALSE_POSITIVE", 11], ["ESCALATED", 4]]);
    const reviewDone = createdAt.getTime() + lognormal(3.2, 0.9) * 3_600_000;
    // A decision that would lie in the future is still in review.
    if ((status === "CLOSED_FALSE_POSITIVE" || status === "ESCALATED") && reviewDone > NOW.getTime()) status = "IN_REVIEW";
    const decided = status === "CLOSED_FALSE_POSITIVE" || status === "ESCALATED";
    const decidedAt = decided ? new Date(reviewDone) : null;
    return {
      id: f.string.uuid(), code: `AL-${10000 + i}`, ruleId: ruleId[x.rule]!, customerId: x.acc.customerId, accountId: x.acc.id, transactionId: x.txId,
      branchId: branchId[x.acc.branch.code]!, riskLevel, score, status, clearanceRank: x.acc.clearance,
      assigneeId: status === "NEW" && chance(0.5) ? null : assignee, decidedById: decided ? assignee : null,
      decisionNote: decided ? (status === "ESCALATED" ? "Pattern confirmed against customer profile; escalated for a case." : "Matches the customer's known business activity.") : null,
      decidedAt, createdAt,
    };
  });
  for (let i = 0; i < alerts.length; i += 5000) await db.alert.createMany({ data: alerts.slice(i, i + 5000) as never });
  console.log(`alerts ${alerts.length}`);
  console.timeEnd("seed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
