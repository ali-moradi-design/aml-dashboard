import { Router, type RequestHandler } from "express";
import { okAsync, ResultAsync } from "neverthrow";
import { z } from "zod";
import type { SearchResult } from "@aml/shared";
import type { Db } from "../../db/prisma";
import { can, principalOf, scopeOf } from "../../shared/access";
import { appError } from "../../shared/errors";
import { handle } from "../../shared/http";
import { parseWith } from "../../shared/validate";
import { caseScope } from "../cases/cases.repository";

const dbError = (cause: unknown) => appError.unexpected("Database error", cause);

/** Command palette search: a few customers, cases and alerts the user may open. */
export const createSearchModule = ({ db, requireAuth }: { db: Db; requireAuth: RequestHandler }) =>
  Router()
    .use(requireAuth)
    .get(
      "/",
      handle((req, res) =>
        parseWith(z.object({ q: z.string().trim().min(2).max(60) }), req.query).asyncAndThen(
          ({ q }) => {
            const p = principalOf(res);
            const s = scopeOf(p);
            const text = { contains: q, mode: "insensitive" as const };
            const empty: SearchResult = { customers: [], cases: [], alerts: [] };
            if (!can(p, "customers.view") && !can(p, "cases.view") && !can(p, "alerts.view"))
              return okAsync(empty);
            return ResultAsync.fromPromise(
              Promise.all([
                can(p, "customers.view")
                  ? db.customer.findMany({
                      where: {
                        OR: [{ name: text }, { code: text }],
                        branch: { regionId: { in: s.regionIds } },
                        clearanceRank: { lte: s.clearanceRank },
                      },
                      select: { code: true, name: true },
                      take: 5,
                    })
                  : [],
                can(p, "cases.view")
                  ? db.case.findMany({
                      where: { AND: [caseScope(s), { OR: [{ code: text }, { title: text }] }] },
                      select: { code: true, title: true },
                      take: 5,
                    })
                  : [],
                can(p, "alerts.view")
                  ? db.alert.findMany({
                      where: {
                        OR: [{ code: text }, { customer: { name: text } }],
                        branch: { regionId: { in: s.regionIds } },
                        clearanceRank: { lte: s.clearanceRank },
                      },
                      select: { code: true, customer: { select: { name: true } } },
                      take: 5,
                      orderBy: { createdAt: "desc" },
                    })
                  : [],
              ]),
              dbError,
            ).map(([customers, cases, alerts]): SearchResult => ({
              customers,
              cases,
              alerts: alerts.map((a) => ({ code: a.code, customerName: a.customer.name })),
            }));
          },
        ),
      ),
    );
