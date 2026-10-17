import { z } from "zod";
import { countryCodes, isValidIban } from "./geo";
import { criteriaGroupSchema } from "./criteria";
import { currencies, riskLevels } from "./domain";

/**
 * Form schemas shared by the web app (React Hook Form + zodResolver) and the API.
 * Error messages are i18n keys; the web app translates them.
 */

const today = () => new Date(new Date().toDateString());
const dateString = z.string().min(1, "errors.required");
const optionalDate = z.string().optional().or(z.literal(""));
const money = z.coerce.number<number>({ error: "errors.number" }).min(0, "errors.positive");

export const ibanSchema = z
  .string()
  .trim()
  .min(1, "errors.required")
  .refine(isValidIban, "errors.iban");

// ---------- Customer onboarding (multi-step) ----------

export const shareholderDocumentSchema = z.object({
  kind: z.enum(["passport", "id-card", "register-extract"]),
  number: z.string().trim().min(3, "errors.required"),
  expiresAt: optionalDate,
});

export const shareholderSchema = z.object({
  name: z.string().trim().min(2, "errors.required"),
  type: z.enum(["PERSON", "COMPANY"]),
  country: z.enum(countryCodes, { error: "errors.required" }),
  sharePercent: z.coerce.number<number>({ error: "errors.number" }).gt(0, "errors.positive").max(100, "errors.max100"),
  documents: z.array(shareholderDocumentSchema).min(1, "errors.oneDocument"),
});

export const onboardingAccountSchema = z.object({
  iban: ibanSchema,
  currency: z.enum(currencies),
});

// Each step has its own schema (with its own cross-field rules), so a step can be validated on
// its own. The full form is the intersection of all steps.

const sourceOfFunds = z.enum(["salary", "business", "investments", "inheritance", "other"], { error: "errors.required" });

export const onboardingIdentitySchema = z
  .object({
    type: z.enum(["PERSON", "COMPANY"]),
    firstName: z.string().trim().optional(),
    lastName: z.string().trim().optional(),
    dateOfBirth: optionalDate,
    nationality: z.string().optional(),
    occupation: z.string().trim().optional(),
    employer: z.string().trim().optional(),
    companyName: z.string().trim().optional(),
    registrationNumber: z.string().trim().optional(),
    incorporationDate: optionalDate,
    industry: z.string().trim().optional(),
  })
  .superRefine((v, ctx) => {
    const need = (path: string, ok: unknown) => {
      if (!ok) ctx.addIssue({ code: "custom", path: [path], message: "errors.required" });
    };
    // Conditional fields: a person and a company need different data.
    if (v.type === "PERSON") {
      need("firstName", v.firstName && v.firstName.length >= 2);
      need("lastName", v.lastName && v.lastName.length >= 2);
      need("dateOfBirth", v.dateOfBirth);
      need("nationality", v.nationality);
      need("occupation", v.occupation);
      if (v.dateOfBirth) {
        const adult = new Date(today());
        adult.setFullYear(adult.getFullYear() - 18);
        if (new Date(v.dateOfBirth) > adult) ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "errors.adult" });
      }
    } else {
      need("companyName", v.companyName && v.companyName.length >= 2);
      need("registrationNumber", v.registrationNumber);
      need("incorporationDate", v.incorporationDate);
      need("industry", v.industry);
      if (v.incorporationDate && new Date(v.incorporationDate) > today()) ctx.addIssue({ code: "custom", path: ["incorporationDate"], message: "errors.past" });
    }
  });

export const onboardingContactSchema = z.object({
  email: z.email("errors.email"),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, "errors.phone"),
  country: z.enum(countryCodes, { error: "errors.required" }),
  city: z.string().min(1, "errors.required"),
  branchCode: z.string().min(1, "errors.required"),
  addressLine: z.string().trim().min(5, "errors.required"),
});

export const onboardingProfileSchema = z
  .object({
    sourceOfFunds,
    expectedMonthlyVolume: money,
    minTransaction: money,
    maxTransaction: money,
    pep: z.boolean(),
  })
  .superRefine((v, ctx) => {
    // Cross-field: min below max.
    if (v.minTransaction >= v.maxTransaction) ctx.addIssue({ code: "custom", path: ["maxTransaction"], message: "errors.minBelowMax" });
  });

export const onboardingShareholdersSchema = z
  .object({ type: z.enum(["PERSON", "COMPANY"]), shareholders: z.array(shareholderSchema) })
  .superRefine((v, ctx) => {
    if (v.type !== "COMPANY") return;
    // Cross-field: a company's shareholders must add up to exactly 100%.
    if (v.shareholders.length === 0) ctx.addIssue({ code: "custom", path: ["shareholders"], message: "errors.oneShareholder" });
    const total = v.shareholders.reduce((sum, h) => sum + (Number(h.sharePercent) || 0), 0);
    if (v.shareholders.length && Math.abs(total - 100) > 0.001) ctx.addIssue({ code: "custom", path: ["shareholders"], message: "errors.shares100" });
    v.shareholders.forEach((h, i) =>
      h.documents.forEach((d, j) => {
        if (d.expiresAt && new Date(d.expiresAt) <= today()) ctx.addIssue({ code: "custom", path: ["shareholders", i, "documents", j, "expiresAt"], message: "errors.future" });
      }),
    );
  });

export const onboardingAccountsSchema = z.object({
  accounts: z.array(onboardingAccountSchema).min(1, "errors.oneAccount"),
});

export const customerOnboardingSchema = onboardingIdentitySchema
  .and(onboardingContactSchema)
  .and(onboardingProfileSchema)
  .and(onboardingShareholdersSchema)
  .and(onboardingAccountsSchema);

export type CustomerOnboarding = z.infer<typeof customerOnboardingSchema>;

/** Steps of the onboarding wizard: schema and field names for per-step validation. */
export const onboardingSteps = [
  { key: "identity", schema: onboardingIdentitySchema },
  { key: "contact", schema: onboardingContactSchema },
  { key: "profile", schema: onboardingProfileSchema },
  { key: "shareholders", schema: onboardingShareholdersSchema },
  { key: "accounts", schema: onboardingAccountsSchema },
  { key: "review", schema: null },
] as const;

// ---------- KYC update on the customer profile ----------

export const kycUpdateSchema = z.object({
  occupation: z.string().trim().optional(),
  employer: z.string().trim().optional(),
  sourceOfFunds: z.enum(["salary", "business", "investments", "inheritance", "other"]),
  expectedMonthlyVolume: money,
  pep: z.boolean(),
  kycStatus: z.enum(["PENDING", "VERIFIED", "EXPIRED", "REJECTED"]),
  riskScore: z.coerce.number<number>().int().min(0).max(100),
});
export type KycUpdate = z.infer<typeof kycUpdateSchema>;

// ---------- Case creation (multi-step) ----------

export const typologies = ["structuring", "layering", "trade_based", "high_risk_jurisdiction", "dormant_account", "mule_account", "other"] as const;

export const partyAccountSchema = z.object({
  iban: ibanSchema,
  bankName: z.string().trim().min(2, "errors.required"),
  currency: z.enum(currencies),
});

export const casePartySchema = z.object({
  name: z.string().trim().min(2, "errors.required"),
  type: z.enum(["PERSON", "COMPANY"]),
  role: z.enum(["SUBJECT", "COUNTERPARTY", "BENEFICIAL_OWNER", "OTHER"]),
  country: z.enum(countryCodes, { error: "errors.required" }),
  customerCode: z.string().optional(),
  notes: z.string().optional(),
  accounts: z.array(partyAccountSchema),
});

export const caseBasicsSchema = z
  .object({
    title: z.string().trim().min(5, "errors.min5").max(120),
    typology: z.enum(typologies, { error: "errors.required" }),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    riskLevel: z.enum(riskLevels),
    branchCode: z.string().min(1, "errors.required"),
    dueAt: dateString,
    alertCodes: z.array(z.string()),
  })
  .superRefine((v, ctx) => {
    if (v.dueAt && new Date(v.dueAt) < today()) ctx.addIssue({ code: "custom", path: ["dueAt"], message: "errors.future" });
  });

export const caseScopeSchema = z
  .object({
    periodStart: dateString,
    periodEnd: dateString,
    totalAmount: money,
    summary: z.string().trim().min(30, "errors.min30"),
  })
  .superRefine((v, ctx) => {
    // Cross-field: start before end.
    if (v.periodStart && v.periodEnd && new Date(v.periodStart) > new Date(v.periodEnd)) {
      ctx.addIssue({ code: "custom", path: ["periodEnd"], message: "errors.startBeforeEnd" });
    }
  });

export const casePartiesSchema = z
  .object({ parties: z.array(casePartySchema).min(1, "errors.oneParty") })
  .superRefine((v, ctx) => {
    if (v.parties.length && !v.parties.some((p) => p.role === "SUBJECT")) ctx.addIssue({ code: "custom", path: ["parties"], message: "errors.oneSubject" });
  });

export const caseCreateSchema = caseBasicsSchema.and(caseScopeSchema).and(casePartiesSchema);
export type CaseCreate = z.infer<typeof caseCreateSchema>;

export const caseSteps = [
  { key: "basics", schema: caseBasicsSchema },
  { key: "scope", schema: caseScopeSchema },
  { key: "parties", schema: casePartiesSchema },
  { key: "review", schema: null },
] as const;

export const caseUpdateSchema = z.object({
  findings: z.string().trim().max(5000).optional(),
  recommendation: z.enum(["FILE_SAR", "MONITOR", "CLOSE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
});
export type CaseUpdate = z.infer<typeof caseUpdateSchema>;

export const caseTransitionSchema = z.object({
  /** A transition id from the case's workflow version; the server re-checks it with the engine. */
  transitionId: z.string().min(1),
  note: z.string().trim().max(2000).optional(),
  sarReference: z.string().trim().optional(),
});
export type CaseTransition = z.infer<typeof caseTransitionSchema>;

export const commentInputSchema = z.object({
  body: z.string().trim().min(1, "errors.required").max(5000),
  parentId: z.string().optional(),
  mentions: z.array(z.string()).default([]),
});
export type CommentInput = z.infer<typeof commentInputSchema>;

// ---------- Rules ----------

export const ruleFormSchema = z.object({
  code: z.string().trim().regex(/^R-[A-Z0-9-]{2,20}$/, "errors.ruleCode"),
  name: z.string().trim().min(3, "errors.required"),
  description: z.string().trim().min(10, "errors.min10"),
  riskLevel: z.enum(riskLevels),
  enabled: z.boolean(),
  criteria: criteriaGroupSchema,
});
export type RuleForm = z.infer<typeof ruleFormSchema>;

export const draftSchema = z.object({ data: z.unknown(), step: z.number().int().min(0), updatedAt: z.string() });
export type Draft = z.infer<typeof draftSchema>;
