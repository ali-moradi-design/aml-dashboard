import { Router, type RequestHandler } from "express";
import { ResultAsync } from "neverthrow";
import { z } from "zod";
import {
  criteriaGroupSchema,
  gridQuerySchema,
  type CriteriaGroup,
  type GridQuery,
} from "@aml/shared";
import type { Db } from "../../db/prisma";
import type { Prisma } from "../../generated/prisma/client";
import { principalOf, scopeOf, type AccessScope, type Principal } from "../../shared/access";
import { appError } from "../../shared/errors";
import { handle } from "../../shared/http";
import { toTransactionRow, transactionRowInclude } from "../../shared/mappers";
import { transactionScope } from "../../shared/scope";
import { parseWith } from "../../shared/validate";
import { requirePermission } from "../auth";
import { criteriaToWhere } from "./criteria-to-where";

const transactionQuerySchema = gridQuerySchema.extend({ criteria: criteriaGroupSchema.optional() });

const sortable: Record<
  string,
  (d: Prisma.SortOrder) => Prisma.TransactionOrderByWithRelationInput
> = {
  ref: (d) => ({ ref: d }),
  bookedAt: (d) => ({ bookedAt: d }),
  baseAmount: (d) => ({ baseAmount: d }),
  amount: (d) => ({ amount: d }),
  channel: (d) => ({ channel: d }),
  counterpartyCountry: (d) => ({ counterpartyCountry: d }),
  branchCode: (d) => ({ branch: { code: d } }),
};

// Repository
export const createTransactionsRepository = (db: Db) => ({
  query: (scope: AccessScope, q: GridQuery, criteria: CriteriaGroup | undefined) => {
    const search = typeof q.filters.search === "string" ? q.filters.search.trim() : "";
    const where: Prisma.TransactionWhereInput = {
      AND: [
        transactionScope(scope),
        criteria ? criteriaToWhere(criteria) : {},
        search
          ? {
              OR: [
                { ref: { contains: search, mode: "insensitive" } },
                { counterpartyName: { contains: search, mode: "insensitive" } },
                { account: { iban: { contains: search } } },
              ],
            }
          : {},
      ],
    };
    const orderBy = q.sortModel
      .filter((s) => sortable[s.colId])
      .map((s) => sortable[s.colId]!(s.sort));
    return ResultAsync.fromPromise(
      db.$transaction([
        db.transaction.findMany({
          where,
          include: transactionRowInclude,
          orderBy: orderBy.length
            ? [...orderBy, { id: "asc" }]
            : [{ bookedAt: "desc" }, { id: "asc" }],
          skip: q.startRow,
          take: Math.min(q.endRow - q.startRow, 500),
        }),
        db.transaction.count({ where }),
      ]),
      (cause) => appError.unexpected("Database error", cause),
    );
  },
});

// Service
export const createTransactionsService = ({
  repo,
}: {
  repo: ReturnType<typeof createTransactionsRepository>;
}) => ({
  list: (p: Principal, q: z.infer<typeof transactionQuerySchema>) =>
    repo
      .query(scopeOf(p), q, q.criteria)
      .map(([rows, rowCount]) => ({ rows: rows.map(toTransactionRow), rowCount })),
});

// Handlers and routes
export const createTransactionsModule = ({
  db,
  requireAuth,
}: {
  db: Db;
  requireAuth: RequestHandler;
}) => {
  const service = createTransactionsService({ repo: createTransactionsRepository(db) });
  const query = handle((req, res) =>
    parseWith(transactionQuerySchema, req.body).asyncAndThen((q) =>
      service.list(principalOf(res), q),
    ),
  );
  return Router().use(requireAuth, requirePermission("transactions.view")).post("/query", query);
};
