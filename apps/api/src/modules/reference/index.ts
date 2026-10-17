import { Router, type RequestHandler } from "express";
import { ResultAsync } from "neverthrow";
import type { Reference } from "@aml/shared";
import type { Db } from "../../db/prisma";
import { principalOf } from "../../shared/access";
import { appError } from "../../shared/errors";
import { handle } from "../../shared/http";

/** Lists for filters and forms: branches in the user's regions and all rules. */
export const createReferenceModule = ({ db, requireAuth }: { db: Db; requireAuth: RequestHandler }) =>
  Router()
    .use(requireAuth)
    .get(
      "/",
      handle((_req, res) =>
        ResultAsync.fromPromise(
          Promise.all([
            db.branch.findMany({ where: { regionId: { in: principalOf(res).regionIds } }, include: { region: true }, orderBy: { code: "asc" } }),
            db.rule.findMany({ orderBy: { code: "asc" } }),
            db.region.findMany({ orderBy: { code: "asc" } }),
          ]),
          (cause) => appError.unexpected("Database error", cause),
        ).map(
          ([branches, rules, regions]): Reference => ({
            branches: branches.map((b) => ({ code: b.code, city: b.city, country: b.country, regionCode: b.region.code })),
            rules: rules.map((r) => ({ code: r.code, name: r.name, riskLevel: r.riskLevel })),
            regions: regions.map((r) => ({ id: r.id, code: r.code, name: r.name })),
          }),
        ),
      ),
    );
