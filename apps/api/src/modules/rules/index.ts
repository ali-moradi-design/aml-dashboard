import { Router, type RequestHandler } from "express";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { ruleFormSchema, type RuleDetail, type RuleForm, type RuleRow } from "@aml/shared";
import type { Db } from "../../db/prisma";
import type { Prisma } from "../../generated/prisma/client";
import { principalOf, scopeOf, type AccessScope, type Principal } from "../../shared/access";
import { appError } from "../../shared/errors";
import { handle } from "../../shared/http";
import { parseWith } from "../../shared/validate";
import { requirePermission } from "../auth";

const dbError = (cause: unknown) => appError.unexpected("Database error", cause);

type Stats = {
  rule_id: string;
  alerts30d: bigint;
  escalated: bigint;
  false_positive: bigint;
  decided: bigint;
  last_alert: Date | null;
};

// Repository
export const createRulesRepository = (db: Db) => ({
  all: () => ResultAsync.fromPromise(db.rule.findMany({ orderBy: { code: "asc" } }), dbError),
  byCode: (code: string) =>
    ResultAsync.fromPromise(db.rule.findUnique({ where: { code } }), dbError),
  stats: (s: AccessScope) =>
    ResultAsync.fromPromise(
      db.$queryRaw<Stats[]>`
        SELECT a."ruleId" AS rule_id,
          count(*) FILTER (WHERE a."createdAt" >= now() - interval '30 days') AS alerts30d,
          count(*) FILTER (WHERE a.status = 'ESCALATED') AS escalated,
          count(*) FILTER (WHERE a.status = 'CLOSED_FALSE_POSITIVE') AS false_positive,
          count(*) FILTER (WHERE a."decidedAt" IS NOT NULL) AS decided,
          max(a."createdAt") AS last_alert
        FROM "Alert" a JOIN "Branch" b ON b.id = a."branchId"
        WHERE b."regionId" = ANY(${s.regionIds}) AND a."clearanceRank" <= ${s.clearanceRank}
        GROUP BY a."ruleId"`,
      dbError,
    ),
  daily: (s: AccessScope) =>
    ResultAsync.fromPromise(
      db.$queryRaw<Array<{ rule_id: string; day: Date; count: bigint }>>`
        SELECT a."ruleId" AS rule_id, date_trunc('day', a."createdAt") AS day, count(*) AS count
        FROM "Alert" a JOIN "Branch" b ON b.id = a."branchId"
        WHERE b."regionId" = ANY(${s.regionIds}) AND a."clearanceRank" <= ${s.clearanceRank} AND a."createdAt" >= date_trunc('day', now()) - interval '29 days'
        GROUP BY 1, 2`,
      dbError,
    ),
  statusMix: (s: AccessScope, ruleId: string) =>
    ResultAsync.fromPromise(
      db.alert.groupBy({
        by: ["status"],
        where: {
          ruleId,
          branch: { regionId: { in: s.regionIds } },
          clearanceRank: { lte: s.clearanceRank },
        },
        _count: true,
      }),
      dbError,
    ),
  create: (input: RuleForm, userId: string) =>
    ResultAsync.fromPromise(
      db.$transaction(async (tx) => {
        const rule = await tx.rule.create({
          data: { ...input, criteria: input.criteria as Prisma.InputJsonValue },
        });
        await tx.auditLog.create({
          data: { userId, action: "rule.create", entity: "rule", entityId: rule.id },
        });
        return rule;
      }),
      dbError,
    ),
  update: (code: string, input: Omit<RuleForm, "code">, userId: string) =>
    ResultAsync.fromPromise(
      db.$transaction(async (tx) => {
        const rule = await tx.rule.update({
          where: { code },
          data: { ...input, criteria: input.criteria as Prisma.InputJsonValue },
        });
        await tx.auditLog.create({
          data: {
            userId,
            action: "rule.update",
            entity: "rule",
            entityId: rule.id,
            data: { enabled: input.enabled },
          },
        });
        return rule;
      }),
      dbError,
    ),
});

/** Pure: last 30 days as a dense array (missing days are 0). */
export const denseDays = (rows: Array<{ day: Date; count: bigint }>, now = new Date()) => {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - 29);
  const byDay = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), Number(r.count)]));
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return byDay.get(d.toISOString().slice(0, 10)) ?? 0;
  });
};

// Service
export const createRulesService = ({
  repo,
}: {
  repo: ReturnType<typeof createRulesRepository>;
}) => {
  const rows = (p: Principal) =>
    ResultAsync.combine([repo.all(), repo.stats(scopeOf(p)), repo.daily(scopeOf(p))] as const).map(
      ([rules, stats, daily]) =>
        rules.map((r): RuleRow & { criteria: unknown; createdAt: Date } => {
          const s = stats.find((x) => x.rule_id === r.id);
          const decided = Number(s?.decided ?? 0);
          return {
            id: r.id,
            code: r.code,
            name: r.name,
            description: r.description,
            riskLevel: r.riskLevel,
            enabled: r.enabled,
            alerts30d: Number(s?.alerts30d ?? 0),
            hitRate: decided ? Math.round((Number(s!.escalated) / decided) * 100) : 0,
            falsePositiveRate: decided
              ? Math.round((Number(s!.false_positive) / decided) * 100)
              : 0,
            lastAlertAt: s?.last_alert?.toISOString() ?? null,
            daily: denseDays(daily.filter((d) => d.rule_id === r.id)),
            criteria: r.criteria,
            createdAt: r.createdAt,
          };
        }),
    );

  return {
    list: (p: Principal) =>
      rows(p).map((rs) => rs.map(({ criteria: _c, createdAt: _d, ...r }) => r)),
    detail: (p: Principal, code: string) =>
      rows(p).andThen((rs) => {
        const r = rs.find((x) => x.code === code);
        if (!r) return errAsync(appError.notFound("Rule not found"));
        return repo.statusMix(scopeOf(p), r.id).map((mix): RuleDetail => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          statusMix: mix.map((m) => ({ status: m.status, count: m._count })),
        }));
      }),
    create: (p: Principal, input: RuleForm) =>
      repo
        .byCode(input.code)
        .andThen((existing) =>
          existing
            ? errAsync(
                appError.validation("Code already used", [
                  { path: ["code"], message: "errors.ruleCodeTaken" },
                ]),
              )
            : repo.create(input, p.userId),
        )
        .map((r) => ({ code: r.code })),
    update: (p: Principal, code: string, input: RuleForm) =>
      repo
        .byCode(code)
        .andThen((r) => (r ? okAsync(r) : errAsync(appError.notFound("Rule not found"))))
        .andThen(() => {
          const { code: _ignored, ...rest } = input;
          return repo.update(code, rest, p.userId);
        })
        .map((r) => ({ code: r.code })),
  };
};

// Routes
export const createRulesModule = ({ db, requireAuth }: { db: Db; requireAuth: RequestHandler }) => {
  const service = createRulesService({ repo: createRulesRepository(db) });
  return Router()
    .use(requireAuth, requirePermission("rules.view"))
    .get(
      "/",
      handle((_req, res) => service.list(principalOf(res))),
    )
    .post(
      "/",
      requirePermission("rules.manage"),
      handle(
        (req, res) =>
          parseWith(ruleFormSchema, req.body).asyncAndThen((i) =>
            service.create(principalOf(res), i),
          ),
        201,
      ),
    )
    .get(
      "/:code",
      handle((req, res) => service.detail(principalOf(res), String(req.params.code))),
    )
    .put(
      "/:code",
      requirePermission("rules.manage"),
      handle((req, res) =>
        parseWith(ruleFormSchema, req.body).asyncAndThen((i) =>
          service.update(principalOf(res), String(req.params.code), i),
        ),
      ),
    );
};
