import ExcelJS from "exceljs";
import { Router, type RequestHandler } from "express";
import { err, ResultAsync } from "neverthrow";
import { reportRangeSchema, type ReportRange, type Reports } from "@aml/shared";
import type { Db } from "../../db/prisma";
import { Prisma } from "../../generated/prisma/client";
import { principalOf, scopeOf, type AccessScope } from "../../shared/access";
import { appError } from "../../shared/errors";
import { handle, sendResult } from "../../shared/http";
import { loadSystemSettings } from "../../shared/system-settings";
import { parseWith } from "../../shared/validate";
import { requirePermission } from "../auth";

const dbError = (cause: unknown) => appError.unexpected("Database error", cause);
const n = (v: unknown) => Number(v ?? 0);

/** Inclusive day range (the end day counts fully). */
const bounds = (r: ReportRange) => {
  const to = new Date(`${r.to}T00:00:00Z`);
  to.setUTCDate(to.getUTCDate() + 1);
  return { from: new Date(`${r.from}T00:00:00Z`), to };
};

export const createReportsRepository = (db: Db) => ({
  load: (s: AccessScope, r: ReportRange) => {
    const { from, to } = bounds(r);
    const branchScope = Prisma.sql`b."regionId" = ANY(${s.regionIds})`;
    return ResultAsync.fromPromise(
      Promise.all([
        // Money leaving branches to counterparty countries (top links)
        db.$queryRaw<Array<{ from: string; to: string; amount: number; count: bigint }>>`
          SELECT b.country AS "from", t."counterpartyCountry" AS "to", sum(t."baseAmount")::float8 AS amount, count(*) AS count
          FROM "Transaction" t JOIN "Branch" b ON b.id = t."branchId"
          WHERE ${branchScope} AND t.direction = 'OUT' AND t.channel <> 'CASH' AND t."bookedAt" >= ${from} AND t."bookedAt" < ${to}
          GROUP BY 1, 2 ORDER BY amount DESC LIMIT 40`,
        // Alerts by weekday and hour in each branch's local time
        db.$queryRaw<Array<{ weekday: number; hour: number; count: bigint }>>`
          SELECT extract(isodow FROM (a."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE b.timezone)::int AS weekday,
            extract(hour FROM (a."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE b.timezone)::int AS hour, count(*) AS count
          FROM "Alert" a JOIN "Branch" b ON b.id = a."branchId"
          WHERE ${branchScope} AND a."clearanceRank" <= ${s.clearanceRank} AND a."createdAt" >= ${from} AND a."createdAt" < ${to}
          GROUP BY 1, 2`,
        // Workload per person in the user's regions
        db.$queryRaw<
          Array<{
            name: string;
            role: string;
            open_alerts: bigint;
            decided: bigint;
            median_hours: number | null;
            open_cases: bigint;
          }>
        >`
          SELECT u.name, r.key::text AS role,
            (SELECT count(*) FROM "Alert" a WHERE a."assigneeId" = u.id AND a.status IN ('NEW', 'IN_REVIEW')) AS open_alerts,
            (SELECT count(*) FROM "Alert" a WHERE a."decidedById" = u.id AND a."decidedAt" >= ${from} AND a."decidedAt" < ${to}) AS decided,
            (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM a."decidedAt" - a."createdAt") / 3600)
               FROM "Alert" a WHERE a."decidedById" = u.id AND a."decidedAt" >= ${from} AND a."decidedAt" < ${to}) AS median_hours,
            (SELECT count(*) FROM "CaseMember" m JOIN "Case" c ON c.id = m."caseId" WHERE m."userId" = u.id AND c.status IN ('OPEN', 'PENDING_APPROVAL', 'APPROVED')) AS open_cases
          FROM "User" u JOIN "Role" r ON r.id = u."roleId"
          WHERE r.key IN ('ANALYST', 'SUPERVISOR') AND u.active
            AND EXISTS (SELECT 1 FROM "UserRegion" ur WHERE ur."userId" = u.id AND ur."regionId" = ANY(${s.regionIds}))
          ORDER BY open_alerts DESC`,
        // Review funnel
        db.$queryRaw<
          Array<{
            alerts: bigint;
            reviewed: bigint;
            escalated: bigint;
            cases: bigint;
            reported: bigint;
          }>
        >`
          SELECT
            (SELECT count(*) FROM "Alert" a JOIN "Branch" b ON b.id = a."branchId" WHERE ${branchScope} AND a."clearanceRank" <= ${s.clearanceRank} AND a."createdAt" >= ${from} AND a."createdAt" < ${to}) AS alerts,
            (SELECT count(*) FROM "Alert" a JOIN "Branch" b ON b.id = a."branchId" WHERE ${branchScope} AND a."clearanceRank" <= ${s.clearanceRank} AND a."createdAt" >= ${from} AND a."createdAt" < ${to} AND a.status <> 'NEW') AS reviewed,
            (SELECT count(*) FROM "Alert" a JOIN "Branch" b ON b.id = a."branchId" WHERE ${branchScope} AND a."clearanceRank" <= ${s.clearanceRank} AND a."createdAt" >= ${from} AND a."createdAt" < ${to} AND a.status = 'ESCALATED') AS escalated,
            (SELECT count(*) FROM "Case" c JOIN "Branch" b ON b.id = c."branchId" WHERE ${branchScope} AND c."clearanceRank" <= ${s.clearanceRank} AND c."createdAt" >= ${from} AND c."createdAt" < ${to}) AS cases,
            (SELECT count(*) FROM "Case" c JOIN "Branch" b ON b.id = c."branchId" WHERE ${branchScope} AND c."clearanceRank" <= ${s.clearanceRank} AND c."reportedAt" >= ${from} AND c."reportedAt" < ${to}) AS reported`,
        // Money in and out per counterparty country
        db.$queryRaw<Array<{ country: string; in_amount: number; out_amount: number }>>`
          SELECT t."counterpartyCountry" AS country,
            coalesce(sum(t."baseAmount") FILTER (WHERE t.direction = 'IN'), 0)::float8 AS in_amount,
            coalesce(sum(t."baseAmount") FILTER (WHERE t.direction = 'OUT'), 0)::float8 AS out_amount
          FROM "Transaction" t JOIN "Branch" b ON b.id = t."branchId"
          WHERE ${branchScope} AND t.channel <> 'CASH' AND t."bookedAt" >= ${from} AND t."bookedAt" < ${to}
          GROUP BY 1 ORDER BY sum(t."baseAmount") DESC LIMIT 20`,
        loadSystemSettings(db),
      ]),
      dbError,
    ).map(([flows, heat, workload, [funnel], countries, settings]): Reports => ({
      flows: flows.map((f) => ({
        from: f.from,
        to: f.to,
        amount: Math.round(f.amount),
        count: n(f.count),
      })),
      heatmap: heat.map((h) => ({ weekday: h.weekday, hour: h.hour, count: n(h.count) })),
      workload: workload.map((w) => ({
        name: w.name,
        role: w.role,
        openAlerts: n(w.open_alerts),
        decided: n(w.decided),
        medianHours: w.median_hours === null ? null : Math.round(w.median_hours * 10) / 10,
        openCases: n(w.open_cases),
      })),
      funnel: {
        alerts: n(funnel?.alerts),
        reviewed: n(funnel?.reviewed),
        escalated: n(funnel?.escalated),
        cases: n(funnel?.cases),
        reported: n(funnel?.reported),
      },
      countries: countries.map((c) => ({
        country: c.country,
        inAmount: Math.round(c.in_amount),
        outAmount: Math.round(c.out_amount),
        highRisk: settings.highRiskCountries.includes(c.country as never),
      })),
    }));
  },
});

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Excel workbook with one sheet per report, headers bold, amounts formatted as EUR. */
export const toWorkbook = async (r: Reports, range: ReportRange) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "AML Monitor";
  wb.created = new Date();
  const sheet = (
    name: string,
    columns: Array<{ header: string; key: string; width: number; money?: boolean }>,
    rows: Array<Record<string, unknown>>,
  ) => {
    const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width,
      style: c.money ? { numFmt: '#,##0 "€"' } : {},
    }));
    ws.getRow(1).font = { bold: true };
    ws.addRows(rows);
    return ws;
  };
  const summary = wb.addWorksheet("Summary");
  summary.addRows([
    ["AML Monitor report"],
    ["Period", `${range.from} to ${range.to}`],
    [],
    ["Alerts", r.funnel.alerts],
    ["Reviewed", r.funnel.reviewed],
    ["Escalated", r.funnel.escalated],
    ["Cases opened", r.funnel.cases],
    ["Reported to the FIU", r.funnel.reported],
  ]);
  summary.getCell("A1").font = { bold: true, size: 14 };
  summary.getColumn(1).width = 24;
  sheet(
    "Money flows",
    [
      { header: "From (branch country)", key: "from", width: 22 },
      { header: "To (counterparty country)", key: "to", width: 26 },
      { header: "Amount", key: "amount", width: 16, money: true },
      { header: "Transfers", key: "count", width: 12 },
    ],
    r.flows,
  );
  sheet(
    "Countries",
    [
      { header: "Country", key: "country", width: 12 },
      { header: "In", key: "inAmount", width: 16, money: true },
      { header: "Out", key: "outAmount", width: 16, money: true },
      { header: "High risk", key: "highRisk", width: 12 },
    ],
    r.countries.map((c) => ({ ...c, highRisk: c.highRisk ? "Yes" : "" })),
  );
  sheet(
    "Workload",
    [
      { header: "Name", key: "name", width: 22 },
      { header: "Role", key: "role", width: 14 },
      { header: "Open alerts", key: "openAlerts", width: 12 },
      { header: "Decided", key: "decided", width: 10 },
      { header: "Median hours to decide", key: "medianHours", width: 22 },
      { header: "Open cases", key: "openCases", width: 12 },
    ],
    r.workload,
  );
  sheet(
    "Alerts by hour",
    [
      { header: "Weekday", key: "weekday", width: 10 },
      { header: "Hour", key: "hour", width: 8 },
      { header: "Alerts", key: "count", width: 10 },
    ],
    r.heatmap.map((h) => ({ ...h, weekday: WEEKDAYS[h.weekday - 1] })),
  );
  return wb;
};

export const createReportsModule = ({
  db,
  requireAuth,
}: {
  db: Db;
  requireAuth: RequestHandler;
}) => {
  const repo = createReportsRepository(db);
  const exportXlsx: RequestHandler = async (req, res) => {
    const range = parseWith(reportRangeSchema, req.query);
    if (range.isErr()) return void sendResult(res, err(range.error));
    const data = await repo.load(scopeOf(principalOf(res)), range.value);
    if (data.isErr()) return void sendResult(res, err(data.error));
    const wb = await toWorkbook(data.value, range.value);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="aml-report-${range.value.from}-${range.value.to}.xlsx"`,
    );
    await wb.xlsx.write(res);
    res.end();
  };
  return Router()
    .use(requireAuth, requirePermission("reports.view"))
    .get(
      "/",
      handle((req, res) =>
        parseWith(reportRangeSchema, req.query).asyncAndThen((r) =>
          repo.load(scopeOf(principalOf(res)), r),
        ),
      ),
    )
    .get("/export.xlsx", exportXlsx);
};
