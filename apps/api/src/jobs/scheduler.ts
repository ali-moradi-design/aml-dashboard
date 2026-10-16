import { PgBoss } from "pg-boss";
import { ResultAsync } from "neverthrow";
import { appError } from "../shared/errors";

/**
 * Scheduled jobs (rule runs) on Postgres through pg-boss. Jobs are registered
 * here when the rules feature arrives; for now the scheduler only starts.
 */
export const createScheduler = (databaseUrl: string) => {
  const boss = new PgBoss(databaseUrl);
  boss.on("error", (error) => console.error("[jobs]", error));

  return {
    start: () => ResultAsync.fromPromise(boss.start(), (cause) => appError.unexpected("Job scheduler did not start", cause)),
    stop: () => ResultAsync.fromPromise(boss.stop(), (cause) => appError.unexpected("Job scheduler did not stop", cause)),
  };
};
