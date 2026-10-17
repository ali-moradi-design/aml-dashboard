import type { Condition, CriteriaGroup } from "@aml/shared";
import type { Prisma } from "../../generated/prisma/client";

type Where = Prisma.TransactionWhereInput;

const num = (v: unknown) => Number(v);
const pair = (v: unknown): [unknown, unknown] => (Array.isArray(v) ? [v[0], v[1]] : [v, v]);
const list = (v: unknown) => (Array.isArray(v) ? v.map(String) : String(v).split(",").map((s) => s.trim()).filter(Boolean));

/** Pure: one condition of the AND/OR tree to a Prisma where clause. */
export const conditionToWhere = (c: Condition): Where => {
  const { field, operator, value } = c;

  if (field === "baseAmount" || field === "amount") {
    const ops: Record<string, Prisma.DecimalFilter> = {
      eq: { equals: num(value) },
      neq: { not: num(value) },
      gt: { gt: num(value) },
      gte: { gte: num(value) },
      lt: { lt: num(value) },
      lte: { lte: num(value) },
      between: { gte: num(pair(value)[0]), lte: num(pair(value)[1]) },
      in: { in: list(value).map(Number) },
    };
    return { [field]: ops[operator] ?? {} };
  }

  if (field === "bookedAt") {
    const [from, to] = pair(value);
    if (operator === "gte") return { bookedAt: { gte: new Date(String(value)) } };
    if (operator === "lte") return { bookedAt: { lte: new Date(String(value)) } };
    return { bookedAt: { gte: new Date(String(from)), lte: new Date(String(to)) } };
  }

  if (field === "branchCode") {
    if (operator === "in") return { branch: { code: { in: list(value) } } };
    if (operator === "neq") return { branch: { code: { not: String(value) } } };
    return { branch: { code: String(value) } };
  }

  // enum and text columns on the transaction itself
  const column = field as "currency" | "channel" | "direction" | "counterpartyCountry" | "counterpartyName";
  if (operator === "in") return { [column]: { in: list(value) } } as Where;
  if (operator === "neq") return { [column]: { not: String(value) } } as Where;
  if (operator === "contains") return { [column]: { contains: String(value), mode: "insensitive" } } as Where;
  return { [column]: String(value) } as Where;
};

/** Pure: the whole AND/OR tree, recursively. Empty groups match everything. */
export const criteriaToWhere = (group: CriteriaGroup): Where => {
  const parts = group.children.map((child) => (child.kind === "group" ? criteriaToWhere(child) : conditionToWhere(child)));
  if (parts.length === 0) return {};
  return group.combinator === "and" ? { AND: parts } : { OR: parts };
};
