import { z } from "zod";
import { countryCodes } from "./geo";
import { currencies, roleKeys } from "./domain";
import { locales } from "./locale";

// Release 4 contracts: notifications, news, jobs, imports, settings, admin, reports, search.

// ---------- Notifications ----------

export const notificationTypes = ["mention", "case_step", "case_assigned", "news", "job_failed", "kyc_expiry", "sla_breach", "import_done"] as const;
export type NotificationType = (typeof notificationTypes)[number];

export const notificationSchema = z.object({
  id: z.string(),
  type: z.enum(notificationTypes),
  /** Type-specific values used to build the text and the link (case code, author, job name...). */
  data: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AppNotification = z.infer<typeof notificationSchema>;
export const notificationPageSchema = z.object({ items: z.array(notificationSchema), unread: z.number(), nextCursor: z.string().nullable() });

// ---------- Preferences and system settings ----------

export const startPages = ["/", "/alerts", "/cases", "/my-work", "/network"] as const;

export const preferencesSchema = z.object({
  /** Persian and Arabic can show Latin or native digits. */
  digits: z.enum(["native", "latin"]).default("native"),
  density: z.enum(["comfortable", "compact"]).default("comfortable"),
  startPage: z.enum(startPages).default("/"),
  /** Notification types the user wants in the app (all on by default). */
  notifications: z.partialRecord(z.enum(notificationTypes), z.boolean()).default({}),
  /** Pinned pages shown first in the sidebar and the command palette. */
  quickAccess: z.array(z.string().max(80)).max(6).default([]),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export const defaultPreferences = (): Preferences => preferencesSchema.parse({});

export const systemSettingsSchema = z.object({
  baseCurrency: z.enum(currencies),
  highRiskCountries: z.array(z.enum(countryCodes)).min(1, "errors.oneCountry"),
  alertSlaHours: z.object({ HIGH: z.number().int().min(1).max(720), MEDIUM: z.number().int().min(1).max(720), LOW: z.number().int().min(1).max(720) }),
});
export type SystemSettings = z.infer<typeof systemSettingsSchema>;

export const profileSchema = z.object({ name: z.string().trim().min(3, "errors.min3").max(80) });

export const passwordChangeSchema = z
  .object({
    current: z.string().min(1, "errors.required"),
    next: z.string().min(10, "errors.min10").regex(/[A-Za-z]/, "errors.passwordLetters").regex(/\d/, "errors.passwordDigits"),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "errors.passwordMatch" })
  .refine((v) => v.next !== v.current, { path: ["next"], message: "errors.passwordSame" });

export const sessionInfoRowSchema = z.object({ id: z.string(), userAgent: z.string().nullable(), ip: z.string().nullable(), createdAt: z.string(), lastSeenAt: z.string(), current: z.boolean() });

// ---------- News ----------

export const newsInputSchema = z
  .object({
    title: z.string().trim().min(5, "errors.min5").max(140),
    /** HTML from the editor; the server sanitizes it again. */
    body: z.string().min(20, "errors.newsBody").max(50_000),
    audienceRoles: z.array(z.enum(roleKeys)),
    audienceRegionIds: z.array(z.string()),
    minClearance: z.number().int().min(1).max(4),
    publishAt: z.string().min(1, "errors.required"),
    expiresAt: z.string().nullable(),
    pinned: z.boolean(),
    coverId: z.string().nullable(),
    attachmentIds: z.array(z.string()),
  })
  .refine((v) => !v.expiresAt || new Date(v.expiresAt) > new Date(v.publishAt), { path: ["expiresAt"], message: "errors.expiryAfterPublish" });
export type NewsInput = z.infer<typeof newsInputSchema>;

export const newsRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  excerpt: z.string(),
  coverUrl: z.string().nullable(),
  authorName: z.string(),
  publishAt: z.string(),
  expiresAt: z.string().nullable(),
  pinned: z.boolean(),
  read: z.boolean(),
  /** Only for the author and news managers. */
  readCount: z.number().nullable(),
  audienceSize: z.number().nullable(),
  state: z.enum(["scheduled", "live", "expired"]),
});
export type NewsRow = z.infer<typeof newsRowSchema>;

export const newsDetailSchema = newsRowSchema.extend({
  body: z.string(),
  audienceRoles: z.array(z.enum(roleKeys)),
  audienceRegionIds: z.array(z.string()),
  minClearance: z.number(),
  coverId: z.string().nullable(),
  attachments: z.array(z.object({ id: z.string(), name: z.string(), size: z.number() })),
  canEdit: z.boolean(),
  readers: z.array(z.object({ name: z.string(), readAt: z.string() })).nullable(),
});
export type NewsDetail = z.infer<typeof newsDetailSchema>;

// ---------- Jobs ----------

export const jobRunSchema = z.object({
  id: z.string(),
  status: z.enum(["RUNNING", "SUCCEEDED", "FAILED"]),
  triggeredByName: z.string().nullable(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  stats: z.record(z.string(), z.number()).nullable(),
  error: z.string().nullable(),
});
export type JobRun = z.infer<typeof jobRunSchema>;

export const jobRowSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string(),
  cron: z.string(),
  timezone: z.string(),
  enabled: z.boolean(),
  nextRunAt: z.string().nullable(),
  lastRun: jobRunSchema.nullable(),
  /** Duration in seconds of the last 14 finished runs, for the sparkline. */
  durations: z.array(z.number()),
  successRate: z.number(),
});
export type JobRow = z.infer<typeof jobRowSchema>;

export const jobInputSchema = z.object({
  cron: z.string().trim().min(9, "errors.cron"),
  timezone: z.string().min(1),
  enabled: z.boolean(),
});
export type JobInput = z.infer<typeof jobInputSchema>;

// ---------- Imports ----------

export const importKinds = ["customers", "transactions"] as const;
export type ImportKind = (typeof importKinds)[number];

/** Target fields per import kind; the column mapping step matches file headers to these. */
export const importFields = {
  customers: [
    { key: "name", required: true }, { key: "type", required: true }, { key: "country", required: true }, { key: "branchCode", required: true },
    { key: "email", required: false }, { key: "phone", required: false }, { key: "riskScore", required: false },
  ],
  transactions: [
    { key: "iban", required: true }, { key: "bookedAt", required: true }, { key: "amount", required: true }, { key: "currency", required: true },
    { key: "direction", required: true }, { key: "channel", required: true }, { key: "counterpartyName", required: true },
    { key: "counterpartyIban", required: false }, { key: "counterpartyCountry", required: true },
  ],
} as const;

export const importCustomerRowSchema = z.object({
  name: z.string().trim().min(3, "errors.min3"),
  type: z.enum(["PERSON", "COMPANY"], { error: "errors.customerType" }),
  country: z.enum(countryCodes, { error: "errors.country" }),
  branchCode: z.string().trim().min(2, "errors.required"),
  email: z.string().trim().email("errors.email").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  riskScore: z.coerce.number({ error: "errors.number" }).int().min(0).max(100).optional(),
});

export const importTransactionRowSchema = z.object({
  iban: z.string().trim().min(15, "errors.iban"),
  bookedAt: z.coerce.date({ error: "errors.date" }),
  amount: z.coerce.number({ error: "errors.number" }).positive("errors.positive"),
  currency: z.enum(currencies, { error: "errors.currency" }),
  direction: z.enum(["IN", "OUT"], { error: "errors.direction" }),
  channel: z.enum(["CASH", "WIRE", "CARD", "ONLINE"], { error: "errors.channel" }),
  counterpartyName: z.string().trim().min(2, "errors.required"),
  counterpartyIban: z.string().trim().optional(),
  counterpartyCountry: z.string().trim().length(2, "errors.country"),
});

export const importValidateSchema = z.object({
  kind: z.enum(importKinds),
  fileName: z.string().min(1).max(200),
  mapping: z.record(z.string(), z.string()),
  rows: z.array(z.record(z.string(), z.unknown())).min(1, "errors.noRows").max(5000, "errors.tooManyRows"),
});
export type ImportValidate = z.infer<typeof importValidateSchema>;

export const importIssueSchema = z.object({ row: z.number(), field: z.string(), message: z.string() });
export const importBatchSchema = z.object({
  id: z.string(),
  kind: z.enum(importKinds),
  fileName: z.string(),
  status: z.enum(["VALIDATED", "IMPORTED", "DISCARDED"]),
  totalRows: z.number(),
  validRows: z.number(),
  errorRows: z.number(),
  errors: z.array(importIssueSchema),
  createdByName: z.string(),
  createdAt: z.string(),
  importedAt: z.string().nullable(),
});
export type ImportBatch = z.infer<typeof importBatchSchema>;

// ---------- Admin ----------

export const adminUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(roleKeys),
  regionIds: z.array(z.string()),
  clearanceRank: z.number(),
  active: z.boolean(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AdminUser = z.infer<typeof adminUserSchema>;

export const userInputSchema = z.object({
  name: z.string().trim().min(3, "errors.min3"),
  email: z.string().trim().toLowerCase().email("errors.email"),
  role: z.enum(roleKeys),
  regionIds: z.array(z.string()).min(1, "errors.oneRegion"),
  clearanceRank: z.number().int().min(1).max(4),
  active: z.boolean(),
  /** Only when creating a user, or to reset it. */
  password: z.string().min(10, "errors.min10").optional().or(z.literal("")),
});
export type UserInput = z.infer<typeof userInputSchema>;

export const rolePermissionsSchema = z.object({ role: z.enum(roleKeys), permissions: z.array(z.string()) });

export const branchInputSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "errors.branchCode"),
  city: z.string().trim().min(2, "errors.required"),
  country: z.enum(countryCodes),
  timezone: z.string().min(3),
  regionId: z.string().min(1, "errors.required"),
});
export type BranchInput = z.infer<typeof branchInputSchema>;

export const auditRowSchema = z.object({ id: z.string(), userName: z.string().nullable(), action: z.string(), entity: z.string(), entityId: z.string().nullable(), data: z.unknown(), createdAt: z.string() });
export const auditPageSchema = z.object({ rows: z.array(auditRowSchema), rowCount: z.number() });

export const adminReferenceSchema = z.object({
  regions: z.array(z.object({ id: z.string(), code: z.string(), name: z.string(), branches: z.array(z.object({ id: z.string(), code: z.string(), city: z.string(), country: z.string(), timezone: z.string(), users: z.number(), customers: z.number() })) })),
  clearanceLevels: z.array(z.object({ rank: z.number(), name: z.string() })),
  roles: z.array(z.object({ key: z.enum(roleKeys), name: z.string(), permissions: z.array(z.string()), users: z.number() })),
});
export type AdminReference = z.infer<typeof adminReferenceSchema>;

// ---------- Reports ----------

export const reportRangeSchema = z.object({ from: z.string().date(), to: z.string().date() });
export type ReportRange = z.infer<typeof reportRangeSchema>;

export const reportsSchema = z.object({
  flows: z.array(z.object({ from: z.string(), to: z.string(), amount: z.number(), count: z.number() })),
  heatmap: z.array(z.object({ weekday: z.number(), hour: z.number(), count: z.number() })),
  workload: z.array(z.object({ name: z.string(), role: z.string(), openAlerts: z.number(), decided: z.number(), medianHours: z.number().nullable(), openCases: z.number() })),
  funnel: z.object({ alerts: z.number(), reviewed: z.number(), escalated: z.number(), cases: z.number(), reported: z.number() }),
  countries: z.array(z.object({ country: z.string(), inAmount: z.number(), outAmount: z.number(), highRisk: z.boolean() })),
});
export type Reports = z.infer<typeof reportsSchema>;

// ---------- Search (command palette) ----------

export const searchResultSchema = z.object({
  customers: z.array(z.object({ code: z.string(), name: z.string() })),
  cases: z.array(z.object({ code: z.string(), title: z.string() })),
  alerts: z.array(z.object({ code: z.string(), customerName: z.string() })),
});
export type SearchResult = z.infer<typeof searchResultSchema>;

export { locales as supportedLocales };
