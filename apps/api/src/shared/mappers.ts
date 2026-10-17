import type { AlertRow, TransactionRow } from "@aml/shared";
import type { Prisma } from "../generated/prisma/client";

export const alertRowInclude = {
  rule: { select: { code: true, name: true } },
  customer: { select: { name: true, code: true } },
  branch: { select: { code: true, city: true } },
  transaction: { select: { amount: true, currency: true, baseAmount: true } },
  assignee: { select: { name: true } },
} satisfies Prisma.AlertInclude;

type AlertWithRow = Prisma.AlertGetPayload<{ include: typeof alertRowInclude }>;

export const toAlertRow = (a: AlertWithRow): AlertRow => ({
  id: a.id,
  code: a.code,
  status: a.status,
  riskLevel: a.riskLevel,
  score: a.score,
  ruleCode: a.rule.code,
  ruleName: a.rule.name,
  customerName: a.customer.name,
  customerCode: a.customer.code,
  branchCode: a.branch.code,
  branchCity: a.branch.city,
  amount: a.transaction?.amount.toFixed(2) ?? null,
  currency: a.transaction?.currency ?? null,
  baseAmount: a.transaction?.baseAmount.toFixed(2) ?? null,
  assigneeName: a.assignee?.name ?? null,
  createdAt: a.createdAt.toISOString(),
});

export const transactionRowInclude = {
  account: { select: { iban: true, customer: { select: { name: true, code: true } } } },
  branch: { select: { code: true, city: true } },
} satisfies Prisma.TransactionInclude;

type TxWithRow = Prisma.TransactionGetPayload<{ include: typeof transactionRowInclude }>;

export const toTransactionRow = (t: TxWithRow): TransactionRow => ({
  id: t.id,
  ref: t.ref,
  bookedAt: t.bookedAt.toISOString(),
  direction: t.direction,
  channel: t.channel,
  amount: t.amount.toFixed(2),
  currency: t.currency,
  baseAmount: t.baseAmount.toFixed(2),
  counterpartyName: t.counterpartyName,
  counterpartyCountry: t.counterpartyCountry,
  iban: t.account.iban,
  customerName: t.account.customer.name,
  customerCode: t.account.customer.code,
  branchCode: t.branch.code,
  branchCity: t.branch.city,
});

/** Reads a multi-value filter that may arrive as "a" or ["a", "b"]. */
export const listFilter = (value: string | string[] | undefined) =>
  value === undefined || value === "" ? undefined : Array.isArray(value) ? value : [value];
