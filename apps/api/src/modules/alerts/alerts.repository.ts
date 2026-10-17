import { ResultAsync } from "neverthrow";
import type { AlertStatus, GridQuery } from "@aml/shared";
import type { Db } from "../../db/prisma";
import type { Prisma } from "../../generated/prisma/client";
import type { AccessScope } from "../../shared/access";
import { appError } from "../../shared/errors";
import { alertRowInclude, listFilter, transactionRowInclude } from "../../shared/mappers";
import { alertScope } from "../../shared/scope";

const dbError = (cause: unknown) => appError.unexpected("Database error", cause);

const sortable: Record<string, (dir: Prisma.SortOrder) => Prisma.AlertOrderByWithRelationInput> = {
  code: (d) => ({ code: d }),
  createdAt: (d) => ({ createdAt: d }),
  score: (d) => ({ score: d }),
  riskLevel: (d) => ({ riskLevel: d }),
  status: (d) => ({ status: d }),
  customerName: (d) => ({ customer: { name: d } }),
  ruleName: (d) => ({ rule: { name: d } }),
  branchCode: (d) => ({ branch: { code: d } }),
  baseAmount: (d) => ({ transaction: { baseAmount: d } }),
};

/** Pure: grid filters to a Prisma where clause (always combined with the access scope). */
export const alertFilterWhere = (filters: GridQuery["filters"], userId: string): Prisma.AlertWhereInput => {
  const status = listFilter(filters.status) as AlertStatus[] | undefined;
  const risk = listFilter(filters.riskLevel) as Array<"HIGH" | "MEDIUM" | "LOW"> | undefined;
  const rule = listFilter(filters.ruleCode);
  const branch = listFilter(filters.branchCode);
  const search = typeof filters.search === "string" ? filters.search.trim() : "";
  return {
    ...(status ? { status: { in: status } } : {}),
    ...(risk ? { riskLevel: { in: risk } } : {}),
    ...(rule ? { rule: { code: { in: rule } } } : {}),
    ...(branch ? { branch: { code: { in: branch } } } : {}),
    ...(filters.assignee === "me" ? { assigneeId: userId } : {}),
    ...(search
      ? { OR: [{ code: { contains: search, mode: "insensitive" } }, { customer: { name: { contains: search, mode: "insensitive" } } }] }
      : {}),
  };
};

export const createAlertsRepository = (db: Db) => ({
  query: (scope: AccessScope, q: GridQuery, userId: string) => {
    const where: Prisma.AlertWhereInput = { AND: [alertScope(scope), alertFilterWhere(q.filters, userId)] };
    const orderBy = q.sortModel.filter((s) => sortable[s.colId]).map((s) => sortable[s.colId]!(s.sort));
    return ResultAsync.fromPromise(
      db.$transaction([
        db.alert.findMany({
          where,
          include: alertRowInclude,
          orderBy: orderBy.length ? [...orderBy, { id: "asc" }] : [{ createdAt: "desc" }, { id: "asc" }],
          skip: q.startRow,
          take: Math.min(q.endRow - q.startRow, 500),
        }),
        db.alert.count({ where }),
      ]),
      dbError,
    );
  },

  findDetail: (scope: AccessScope, id: string) =>
    ResultAsync.fromPromise(
      db.alert.findFirst({
        where: { AND: [alertScope(scope), { OR: [{ id }, { code: id }] }] },
        include: {
          ...alertRowInclude,
          rule: true,
          customer: true,
          account: true,
          decidedBy: { select: { name: true } },
          case: { select: { code: true } },
          transaction: { include: transactionRowInclude },
        },
      }),
      dbError,
    ),

  accountHistory: (accountId: string, take = 20) =>
    ResultAsync.fromPromise(
      db.transaction.findMany({ where: { accountId }, include: transactionRowInclude, orderBy: { bookedAt: "desc" }, take }),
      dbError,
    ),

  customerAlerts: (scope: AccessScope, customerId: string, excludeId: string) =>
    ResultAsync.fromPromise(
      db.alert.findMany({
        where: { AND: [alertScope(scope), { customerId, id: { not: excludeId } }] },
        include: { rule: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      dbError,
    ),

  decide: (id: string, data: { status: AlertStatus; decidedById: string; decisionNote: string; decidedAt: Date }) =>
    ResultAsync.fromPromise(
      db.$transaction(async (tx) => {
        const alert = await tx.alert.update({ where: { id }, data: { ...data, assigneeId: data.decidedById } });
        await tx.auditLog.create({
          data: { userId: data.decidedById, action: "alert.decide", entity: "alert", entityId: id, data: { status: data.status } },
        });
        return alert;
      }),
      dbError,
    ),
});

export type AlertsRepository = ReturnType<typeof createAlertsRepository>;
