import { PgBoss } from "pg-boss";
import { ResultAsync } from "neverthrow";
import type { Db } from "../db/prisma";
import { appError } from "../shared/errors";
import type { JobKey, JobRunner } from "./runners";

type ScheduledJob = { key: string; cron: string; timezone: string; enabled: boolean };

/**
 * Scheduled jobs on Postgres through pg-boss: each Job row becomes a cron schedule, and the
 * worker hands the run to the job runner (which records it). Editing a job reschedules it.
 */
export const createScheduler = (databaseUrl: string, db: Db, runner: JobRunner) => {
  const boss = new PgBoss(databaseUrl);
  boss.on("error", (error) => console.error("[jobs]", error));
  let started = false;

  const apply = async (job: ScheduledJob) => {
    if (!started) return;
    await boss.createQueue(job.key).catch(() => undefined);
    if (job.enabled) await boss.schedule(job.key, job.cron, {}, { tz: job.timezone });
    else await boss.unschedule(job.key);
  };

  return {
    start: () =>
      ResultAsync.fromPromise(
        (async () => {
          await boss.start();
          started = true;
          for (const job of await db.job.findMany()) {
            await apply(job);
            await boss.work(job.key, async () => {
              await runner.run(job.key as JobKey);
            });
          }
        })(),
        (cause) => appError.unexpected("Job scheduler did not start", cause),
      ),
    stop: () => ResultAsync.fromPromise(boss.stop(), (cause) => appError.unexpected("Job scheduler did not stop", cause)),
    apply,
  };
};
export type Scheduler = ReturnType<typeof createScheduler>;
