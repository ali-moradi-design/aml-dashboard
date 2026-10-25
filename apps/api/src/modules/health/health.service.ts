import { okAsync, type ResultAsync } from "neverthrow";
import type { Health } from "@aml/shared";
import type { AppError } from "../../shared/errors";
import type { HealthRepository } from "./health.repository";

// Service layer: domain logic only. No Express, no Prisma; dependencies come in as arguments.
export type HealthService = {
  check: () => ResultAsync<Health, AppError>;
};

type Deps = {
  healthRepository: HealthRepository;
  now?: () => Date;
};

export const createHealthService = ({
  healthRepository,
  now = () => new Date(),
}: Deps): HealthService => ({
  check: () =>
    healthRepository
      .pingDatabase()
      .map(() => "up" as const)
      // A down database is reported in the body, not as an HTTP error, so monitors can read it.
      .orElse(() => okAsync("down" as const))
      .map((database) => ({ status: "ok" as const, database, time: now().toISOString() })),
});
