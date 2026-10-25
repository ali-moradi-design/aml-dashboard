import { CronExpressionParser } from "cron-parser";
import { Router, type RequestHandler } from "express";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { jobInputSchema, type JobInput, type JobRow, type JobRun } from "@aml/shared";
import type { Db } from "../../db/prisma";
import type { JobKey, JobRunner } from "../../jobs/runners";
import type { Scheduler } from "../../jobs/scheduler";
import { principalOf } from "../../shared/access";
import { appError } from "../../shared/errors";
import { handle } from "../../shared/http";
import { parseWith } from "../../shared/validate";
import { requirePermission } from "../auth";

const dbError = (cause: unknown) => appError.unexpected("Database error", cause);

/** Pure: the next time a cron fires, or null when the expression is invalid. */
export const nextRun = (cron: string, timezone: string, from = new Date()) => {
  try {
    return CronExpressionParser.parse(cron, { currentDate: from, tz: timezone }).next().toDate();
  } catch {
    return null;
  }
};

type RunSource = {
  id: string;
  status: JobRun["status"];
  triggeredById: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  stats: unknown;
  error: string | null;
};
const toRun = (r: RunSource, names: Map<string, string>): JobRun => ({
  id: r.id,
  status: r.status,
  triggeredByName: r.triggeredById ? (names.get(r.triggeredById) ?? null) : null,
  startedAt: r.startedAt.toISOString(),
  finishedAt: r.finishedAt?.toISOString() ?? null,
  stats: (r.stats as Record<string, number> | null) ?? null,
  error: r.error,
});

export const createJobsModule = ({
  db,
  requireAuth,
  runner,
  scheduler,
}: {
  db: Db;
  requireAuth: RequestHandler;
  runner: JobRunner;
  scheduler: Scheduler;
}) => {
  const names = async (runs: RunSource[]) => {
    const ids = [
      ...new Set(runs.map((r) => r.triggeredById).filter((x): x is string => Boolean(x))),
    ];
    return new Map(
      (
        await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
      ).map((u) => [u.id, u.name]),
    );
  };

  const list = () =>
    ResultAsync.fromPromise(
      (async () => {
        const jobs = await db.job.findMany({
          orderBy: { name: "asc" },
          include: { runs: { orderBy: { startedAt: "desc" }, take: 14 } },
        });
        const map = await names(jobs.flatMap((j) => j.runs));
        return jobs.map((j): JobRow => {
          const finished = j.runs.filter((r) => r.finishedAt);
          return {
            id: j.id,
            key: j.key,
            name: j.name,
            description: j.description,
            cron: j.cron,
            timezone: j.timezone,
            enabled: j.enabled,
            nextRunAt: j.enabled ? (nextRun(j.cron, j.timezone)?.toISOString() ?? null) : null,
            lastRun: j.runs[0] ? toRun(j.runs[0], map) : null,
            durations: finished
              .map((r) => Math.round((r.finishedAt!.getTime() - r.startedAt.getTime()) / 100) / 10)
              .reverse(),
            successRate: finished.length
              ? Math.round(
                  (finished.filter((r) => r.status === "SUCCEEDED").length / finished.length) * 100,
                )
              : 100,
          };
        });
      })(),
      dbError,
    );

  const update = (key: string, input: JobInput) => {
    if (!nextRun(input.cron, input.timezone))
      return errAsync(
        appError.validation("Invalid schedule", [{ path: ["cron"], message: "errors.cron" }]),
      );
    return ResultAsync.fromPromise(db.job.update({ where: { key }, data: input }), dbError).andThen(
      (job) =>
        ResultAsync.fromPromise(scheduler.apply(job), (cause) =>
          appError.unexpected("Could not reschedule", cause),
        ).map(() => ({ key: job.key })),
    );
  };

  return Router()
    .use(requireAuth, requirePermission("jobs.manage"))
    .get(
      "/",
      handle(() => list()),
    )
    .get(
      "/:key/runs",
      handle((req) =>
        ResultAsync.fromPromise(
          (async () => {
            const job = await db.job.findUnique({ where: { key: String(req.params.key) } });
            if (!job) return null;
            const runs = await db.jobRun.findMany({
              where: { jobId: job.id },
              orderBy: { startedAt: "desc" },
              take: 50,
            });
            const map = await names(runs);
            return runs.map((r) => toRun(r, map));
          })(),
          dbError,
        ).andThen((runs) => (runs ? okAsync(runs) : errAsync(appError.notFound("Job not found")))),
      ),
    )
    .put(
      "/:key",
      handle((req) =>
        parseWith(jobInputSchema, req.body).asyncAndThen((i) => update(String(req.params.key), i)),
      ),
    )
    .post(
      "/:key/run",
      handle((req, res) =>
        ResultAsync.fromPromise(
          runner.run(String(req.params.key) as JobKey, principalOf(res).userId),
          dbError,
        ).andThen((run) =>
          run
            ? okAsync({ id: run.id, status: run.status })
            : errAsync(appError.notFound("Job not found")),
        ),
      ),
    );
};
