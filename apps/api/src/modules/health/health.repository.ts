import { ResultAsync } from "neverthrow";
import type { Db } from "../../db/prisma";
import { appError, type AppError } from "../../shared/errors";

// Repository layer: the only layer that talks to the database.
export type HealthRepository = {
  pingDatabase: () => ResultAsync<void, AppError>;
};

export const createHealthRepository = (db: Db): HealthRepository => ({
  pingDatabase: () =>
    ResultAsync.fromPromise(db.$queryRaw`SELECT 1`, (cause) =>
      appError.unexpected("Database is not reachable", cause),
    ).map(() => undefined),
});
