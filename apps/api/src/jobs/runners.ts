import { criteriaGroupSchema, slaDeadline, stepOf, workflowGraphSchema } from "@aml/shared";
import type { Db } from "../db/prisma";
import type { Notifications } from "../modules/notifications";
import { criteriaToWhere } from "../modules/transactions/criteria-to-where";

export type JobKey = "rule-run" | "kyc-expiry" | "sla-check" | "news-notify";
type Stats = Record<string, number>;
type Ctx = { db: Db; notifications: Notifications; announceNews: (id: string) => Promise<number> };

const RISK_SCORE = { HIGH: 82, MEDIUM: 58, LOW: 34 } as const;
const OPEN = ["OPEN", "PENDING_APPROVAL", "APPROVED"] as const;

/** Next alert code after the highest existing one (AL-10000 style). */
const nextCodes = async (db: Db, count: number) => {
  const last = await db.alert.findFirst({ orderBy: { code: "desc" }, select: { code: true } });
  const start = Number(last?.code.replace("AL-", "") ?? 9999) + 1;
  return Array.from({ length: count }, (_, i) => `AL-${start + i}`);
};

/**
 * Checks transactions booked since the last successful run against every active rule (the same
 * AND/OR criteria the rule builder writes) and raises one alert per rule and transaction.
 */
export const runRules = async ({ db }: Ctx, since: Date, until: Date): Promise<Stats> => {
  const rules = await db.rule.findMany({ where: { enabled: true } });
  const window = { bookedAt: { gt: since, lte: until } };
  const checked = await db.transaction.count({ where: window });
  let created = 0;
  for (const rule of rules) {
    const criteria = criteriaGroupSchema.safeParse(rule.criteria);
    if (!criteria.success) continue;
    const matches = await db.transaction.findMany({
      where: { AND: [window, criteriaToWhere(criteria.data), { alerts: { none: { ruleId: rule.id } } }] },
      select: { id: true, accountId: true, branchId: true, account: { select: { customerId: true, customer: { select: { clearanceRank: true } } } } },
      take: 500,
    });
    if (!matches.length) continue;
    const codes = await nextCodes(db, matches.length);
    await db.alert.createMany({
      data: matches.map((t, i) => ({
        code: codes[i]!, ruleId: rule.id, customerId: t.account.customerId, accountId: t.accountId, transactionId: t.id, branchId: t.branchId,
        riskLevel: rule.riskLevel, score: RISK_SCORE[rule.riskLevel], status: "NEW" as const, clearanceRank: t.account.customer.clearanceRank, createdAt: new Date(),
      })),
    });
    created += matches.length;
  }
  return { checked, rules: rules.length, alerts: created };
};

/** KYC reviews older than two years expire; compliance hears about it. */
export const runKycExpiry = async ({ db, notifications }: Ctx): Promise<Stats> => {
  const limit = new Date(Date.now() - 730 * 86_400_000);
  const checked = await db.customer.count({ where: { kycStatus: "VERIFIED" } });
  const { count } = await db.customer.updateMany({ where: { kycStatus: "VERIFIED", kycReviewedAt: { lt: limit } }, data: { kycStatus: "EXPIRED" } });
  if (count) await notifications.toRole("COMPLIANCE_MANAGER", "kyc_expiry", { count });
  return { checked, expired: count };
};

/** Cases past their step SLA: remind whoever acts at that step, once per step. */
export const runSlaCheck = async ({ db, notifications }: Ctx): Promise<Stats> => {
  const cases = await db.case.findMany({
    where: { status: { in: [...OPEN] }, workflowVersionId: { not: null } },
    select: { id: true, code: true, step: true, stepEnteredAt: true, workflowVersion: { select: { graph: true } }, members: { select: { userId: true } } },
  });
  const now = Date.now();
  let reminded = 0;
  for (const c of cases) {
    const graph = workflowGraphSchema.safeParse(c.workflowVersion?.graph);
    if (!graph.success) continue;
    const due = slaDeadline(graph.data, c.step, c.stepEnteredAt);
    if (!due || due.getTime() > now) continue;
    const already = await db.notification.count({ where: { type: "sla_breach", createdAt: { gte: c.stepEnteredAt }, data: { path: ["code"], equals: c.code } } });
    if (already) continue;
    const step = stepOf(graph.data, c.step)!;
    const data = { code: c.code, step: step.name.en };
    if (step.membersOnly) await notifications.push(c.members.map((m) => m.userId), "sla_breach", data);
    else for (const role of step.roles) await notifications.toRole(role, "sla_breach", data);
    reminded++;
  }
  return { checked: cases.length, reminded };
};

/** Scheduled news goes live: tell its audience once. */
export const runNewsNotify = async ({ db, announceNews }: Ctx): Promise<Stats> => {
  const due = await db.newsPost.findMany({ where: { notifiedAt: null, publishAt: { lte: new Date() } }, select: { id: true } });
  let notified = 0;
  for (const n of due) notified += await announceNews(n.id);
  return { posts: due.length, notified };
};

/**
 * Runs one job and records it (status, duration, stats or the error). A failure tells the people
 * who manage jobs; it never throws, so the scheduler keeps running.
 */
export const createJobRunner = (ctx: Ctx) => {
  const run = async (key: JobKey, triggeredById: string | null = null) => {
    const job = await ctx.db.job.findUnique({ where: { key } });
    if (!job) return null;
    const lastOk = await ctx.db.jobRun.findFirst({ where: { jobId: job.id, status: "SUCCEEDED" }, orderBy: { startedAt: "desc" } });
    const record = await ctx.db.jobRun.create({ data: { jobId: job.id, status: "RUNNING", triggeredById } });
    try {
      const until = new Date();
      const stats =
        key === "rule-run" ? await runRules(ctx, lastOk?.startedAt ?? new Date(until.getTime() - 15 * 60_000), until)
        : key === "kyc-expiry" ? await runKycExpiry(ctx)
        : key === "sla-check" ? await runSlaCheck(ctx)
        : await runNewsNotify(ctx);
      return await ctx.db.jobRun.update({ where: { id: record.id }, data: { status: "SUCCEEDED", finishedAt: new Date(), stats } });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "Unknown error";
      console.error(`[jobs] ${key} failed`, error);
      const failed = await ctx.db.jobRun.update({ where: { id: record.id }, data: { status: "FAILED", finishedAt: new Date(), error: message } });
      await ctx.notifications.toRole("ADMIN", "job_failed", { job: job.name });
      await ctx.notifications.toRole("COMPLIANCE_MANAGER", "job_failed", { job: job.name });
      return failed;
    }
  };
  return { run };
};
export type JobRunner = ReturnType<typeof createJobRunner>;
