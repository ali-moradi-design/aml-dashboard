import { ResultAsync } from "neverthrow";
import type { Db } from "../../db/prisma";
import { Prisma } from "../../generated/prisma/client";
import type { AccessScope } from "../../shared/access";
import { appError } from "../../shared/errors";
import { alertRowInclude } from "../../shared/mappers";
import { alertScope } from "../../shared/scope";

const dbError = (cause: unknown) => appError.unexpected("Database error", cause);

/** SQL fragment for layers 2 and 3 of the access model, on alias a (Alert) joined with b (Branch). */
const scopeSql = (s: AccessScope) =>
  Prisma.sql`b."regionId" = ANY(${s.regionIds}) AND a."clearanceRank" <= ${s.clearanceRank}`;

type DayRow = {
  day: Date;
  created: bigint;
  high: bigint;
  false_positive: bigint;
  decided: bigint;
  median_hours: number | null;
};

export const createOverviewRepository = (db: Db) => ({
  kpis: (s: AccessScope, now: Date) =>
    ResultAsync.fromPromise(
      db.$queryRaw<
        Array<{
          open: bigint;
          high_open: bigint;
          high_today: bigint;
          in_review: bigint;
          overdue: bigint;
          last7: bigint;
          prev7: bigint;
          median_hours: number | null;
        }>
      >`
        SELECT
          count(*) FILTER (WHERE a.status IN ('NEW','IN_REVIEW')) AS open,
          count(*) FILTER (WHERE a.status IN ('NEW','IN_REVIEW') AND a."riskLevel" = 'HIGH') AS high_open,
          count(*) FILTER (WHERE a."riskLevel" = 'HIGH' AND a."createdAt" >= date_trunc('day', ${now}::timestamptz)) AS high_today,
          count(*) FILTER (WHERE a.status = 'IN_REVIEW') AS in_review,
          count(*) FILTER (WHERE a.status IN ('NEW','IN_REVIEW') AND a."createdAt" < ${now}::timestamptz - interval '24 hours') AS overdue,
          count(*) FILTER (WHERE a."createdAt" >= ${now}::timestamptz - interval '7 days') AS last7,
          count(*) FILTER (WHERE a."createdAt" >= ${now}::timestamptz - interval '14 days' AND a."createdAt" < ${now}::timestamptz - interval '7 days') AS prev7,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM a."decidedAt" - a."createdAt") / 3600)
            FILTER (WHERE a."decidedAt" >= ${now}::timestamptz - interval '30 days') AS median_hours
        FROM "Alert" a JOIN "Branch" b ON b.id = a."branchId"
        WHERE ${scopeSql(s)}`,
      dbError,
    ).map((rows) => rows[0]!),

  days: (s: AccessScope, now: Date) =>
    ResultAsync.fromPromise(
      db.$queryRaw<DayRow[]>`
        SELECT d.day,
          count(a.id) AS created,
          count(a.id) FILTER (WHERE a."riskLevel" = 'HIGH') AS high,
          count(a.id) FILTER (WHERE a.status = 'CLOSED_FALSE_POSITIVE') AS false_positive,
          count(a.id) FILTER (WHERE a."decidedAt" IS NOT NULL) AS decided,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM a."decidedAt" - a."createdAt") / 3600) AS median_hours
        FROM generate_series(date_trunc('day', ${now}::timestamptz) - interval '6 days', date_trunc('day', ${now}::timestamptz), interval '1 day') AS d(day)
        LEFT JOIN ("Alert" a JOIN "Branch" b ON b.id = a."branchId" AND ${scopeSql(s)})
          ON date_trunc('day', a."createdAt") = d.day
        GROUP BY d.day ORDER BY d.day`,
      dbError,
    ),

  byRule: (s: AccessScope, now: Date) =>
    ResultAsync.fromPromise(
      db.$queryRaw<
        Array<{ code: string; name: string; count: bigint; escalated: bigint; decided: bigint }>
      >`
        SELECT r.code, r.name,
          count(a.id) FILTER (WHERE a."createdAt" >= ${now}::timestamptz - interval '7 days') AS count,
          count(a.id) FILTER (WHERE a.status = 'ESCALATED') AS escalated,
          count(a.id) FILTER (WHERE a."decidedAt" IS NOT NULL) AS decided
        FROM "Rule" r
        LEFT JOIN ("Alert" a JOIN "Branch" b ON b.id = a."branchId" AND ${scopeSql(s)}) ON a."ruleId" = r.id
        GROUP BY r.code, r.name ORDER BY count DESC`,
      dbError,
    ),

  heatmap: (s: AccessScope, now: Date) =>
    ResultAsync.fromPromise(
      db.$queryRaw<Array<{ weekday: number; bucket: number; count: bigint }>>`
        -- createdAt is UTC without a zone: mark it as UTC first, then convert to the branch's local time.
        SELECT extract(isodow FROM (a."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE b.timezone)::int AS weekday,
          (extract(hour FROM (a."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE b.timezone)::int / 2) AS bucket, count(*) AS count
        FROM "Alert" a JOIN "Branch" b ON b.id = a."branchId"
        WHERE ${scopeSql(s)} AND a."createdAt" >= ${now}::timestamptz - interval '30 days'
        GROUP BY 1, 2`,
      dbError,
    ),

  funnel: (s: AccessScope, now: Date) =>
    ResultAsync.fromPromise(
      db.$queryRaw<
        Array<{ raised: bigint; reviewed: bigint; escalated: bigint; reported: bigint }>
      >`
        SELECT count(*) AS raised,
          count(*) FILTER (WHERE a.status <> 'NEW') AS reviewed,
          count(*) FILTER (WHERE a.status = 'ESCALATED') AS escalated,
          count(*) FILTER (WHERE a.status = 'ESCALATED' AND a.score >= 90) AS reported
        FROM "Alert" a JOIN "Branch" b ON b.id = a."branchId"
        WHERE ${scopeSql(s)} AND a."createdAt" >= ${now}::timestamptz - interval '30 days'`,
      dbError,
    ).map((rows) => rows[0]!),

  riskByBranch: (s: AccessScope) =>
    ResultAsync.fromPromise(
      db.$queryRaw<
        Array<{ code: string; city: string; high: bigint; medium: bigint; low: bigint }>
      >`
        SELECT b.code, b.city,
          count(*) FILTER (WHERE a."riskLevel" = 'HIGH') AS high,
          count(*) FILTER (WHERE a."riskLevel" = 'MEDIUM') AS medium,
          count(*) FILTER (WHERE a."riskLevel" = 'LOW') AS low
        FROM "Alert" a JOIN "Branch" b ON b.id = a."branchId"
        WHERE ${scopeSql(s)} AND a.status IN ('NEW','IN_REVIEW')
        GROUP BY b.code, b.city`,
      dbError,
    ),

  needsDecision: (s: AccessScope) =>
    ResultAsync.fromPromise(
      db.alert.findMany({
        where: {
          AND: [alertScope(s), { status: { in: ["NEW", "IN_REVIEW"] }, riskLevel: "HIGH" }],
        },
        include: alertRowInclude,
        orderBy: { createdAt: "asc" },
        take: 5,
      }),
      dbError,
    ),
});

export type OverviewRepository = ReturnType<typeof createOverviewRepository>;
