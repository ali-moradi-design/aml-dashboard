import { errAsync, okAsync, ResultAsync } from "neverthrow";
import {
  isValidIban,
  type CustomerOnboarding,
  type CustomerProfile,
  type CustomerRow,
  type GridQuery,
  type KycUpdate,
} from "@aml/shared";
import { scopeOf, type Principal } from "../../shared/access";
import { appError } from "../../shared/errors";
import { toAlertRow, toTransactionRow } from "../../shared/mappers";
import type { CustomersRepository } from "./customers.repository";

type Row = {
  id: string;
  code: string;
  name: string;
  type: "PERSON" | "COMPANY";
  country: string;
  riskScore: number;
  pep: boolean;
  kycStatus: CustomerRow["kycStatus"];
  createdAt: Date;
  branch: { city: string };
  _count: { alerts: number };
};

const toRow = (c: Row): CustomerRow => ({
  id: c.id,
  code: c.code,
  name: c.name,
  type: c.type,
  country: c.country,
  branchCity: c.branch.city,
  riskScore: c.riskScore,
  pep: c.pep,
  kycStatus: c.kycStatus,
  openAlerts: c._count.alerts,
  createdAt: c.createdAt.toISOString(),
});

/** Pure: explains the risk score with weighted factors (shown next to the gauge). */
export const riskFactors = (
  c: { pep: boolean; country: string; type: string; kycStatus: string },
  openAlerts: number,
  highRiskShare: number,
) =>
  [
    { key: "pep", weight: c.pep ? 30 : 0 },
    { key: "openAlerts", weight: Math.min(25, openAlerts * 5) },
    { key: "highRiskCountries", weight: Math.round(Math.min(20, highRiskShare * 200)) },
    { key: "company", weight: c.type === "COMPANY" ? 10 : 0 },
    { key: "kyc", weight: c.kycStatus === "VERIFIED" ? 0 : 15 },
  ].filter((f) => f.weight > 0);

export const createCustomersService = ({ repo }: { repo: CustomersRepository }) => ({
  list: (p: Principal, q: GridQuery) =>
    repo.query(scopeOf(p), q).map(([rows, rowCount]) => ({ rows: rows.map(toRow), rowCount })),

  profile: (p: Principal, code: string) =>
    repo.profile(scopeOf(p), code).andThen((c) => {
      if (!c) return errAsync(appError.notFound("Customer not found"));
      return ResultAsync.combine([
        repo.recentTransactions(c.id),
        repo.monthly(c.id),
        repo.alerts(scopeOf(p), c.id),
      ] as const).map(([tx, monthly, alerts]): CustomerProfile => {
        const highRisk =
          tx.filter((t) => ["XA", "XB", "XC"].includes(t.counterpartyCountry)).length /
          Math.max(tx.length, 1);
        return {
          customer: {
            ...toRow(c),
            city: c.city,
            addressLine: c.addressLine,
            email: c.email,
            phone: c.phone,
            occupation: c.occupation,
            employer: c.employer,
            dateOfBirth: c.dateOfBirth?.toISOString() ?? null,
            nationality: c.nationality,
            registrationNumber: c.registrationNumber,
            incorporationDate: c.incorporationDate?.toISOString() ?? null,
            industry: c.industry,
            sourceOfFunds: c.sourceOfFunds,
            expectedMonthlyVolume: c.expectedMonthlyVolume?.toFixed(2) ?? null,
            kycReviewedAt: c.kycReviewedAt?.toISOString() ?? null,
            branchCode: c.branch.code,
          },
          riskFactors: riskFactors(c, c._count.alerts, highRisk),
          accounts: c.accounts.map((a) => ({
            id: a.id,
            iban: a.iban,
            currency: a.currency,
            status: a.status,
            balance: a.balance.toFixed(2),
            openedAt: a.openedAt.toISOString(),
          })),
          shareholders: c.shareholders.map((h) => ({
            name: h.name,
            type: h.type,
            country: h.country,
            sharePercent: h.sharePercent.toFixed(2),
            documents: h.documents.map((d) => ({
              kind: d.kind,
              number: d.number,
              expiresAt: d.expiresAt?.toISOString() ?? null,
            })),
          })),
          monthly: monthly.map((m) => ({
            month: m.month.toISOString(),
            incoming: Math.round(m.incoming),
            outgoing: Math.round(m.outgoing),
          })),
          transactions: tx.map(toTransactionRow),
          alerts: alerts.map(toAlertRow),
          cases: c.caseParties.map((cp) => cp.case),
        };
      });
    }),

  checkEmail: (email: string) => repo.emailTaken(email).map((taken) => ({ available: !taken })),

  /** Async validation: checksum first (cheap), then uniqueness in the database. */
  checkIban: (iban: string) =>
    isValidIban(iban)
      ? repo.ibanTaken(iban).map((taken) => ({ valid: true, available: !taken }))
      : okAsync({ valid: false, available: true }),

  create: (p: Principal, input: CustomerOnboarding) =>
    repo
      .branchByCode(input.branchCode)
      .andThen((b) =>
        b && p.regionIds.includes(b.regionId)
          ? okAsync(b)
          : errAsync(
              appError.validation("Branch is outside your regions", [
                { path: ["branchCode"], message: "errors.branchRegion" },
              ]),
            ),
      )
      .andThen((b) =>
        repo
          .emailTaken(input.email)
          .andThen((taken) =>
            taken
              ? errAsync(
                  appError.validation("Email already used", [
                    { path: ["email"], message: "errors.emailTaken" },
                  ]),
                )
              : okAsync(b),
          ),
      )
      .andThen((b) =>
        ResultAsync.combine(input.accounts.map((a) => repo.ibanTaken(a.iban))).andThen((taken) => {
          const i = taken.findIndex(Boolean);
          return i >= 0
            ? errAsync(
                appError.validation("IBAN already used", [
                  { path: ["accounts", i, "iban"], message: "errors.ibanTaken" },
                ]),
              )
            : okAsync(b);
        }),
      )
      .andThen((b) => repo.create(input, b.id, p.userId))
      .map((c) => ({ code: c.code })),

  updateKyc: (p: Principal, code: string, input: KycUpdate) =>
    repo
      .profile(scopeOf(p), code)
      .andThen((c) =>
        c
          ? repo.updateKyc(c.id, input, p.userId)
          : errAsync(appError.notFound("Customer not found")),
      )
      .map((c) => ({ code: c.code })),
});

export type CustomersService = ReturnType<typeof createCustomersService>;
