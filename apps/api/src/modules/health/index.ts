import type { Db } from "../../db/prisma";
import { createHealthHandlers } from "./health.handlers";
import { createHealthRepository } from "./health.repository";
import { createHealthRouter } from "./health.routes";
import { createHealthService } from "./health.service";

/** Wires the four layers of the module: repository → service → handlers → router. */
export const createHealthModule = ({ db }: { db: Db }) => {
  const healthRepository = createHealthRepository(db);
  const service = createHealthService({ healthRepository });
  return createHealthRouter(createHealthHandlers(service));
};

export { createHealthService } from "./health.service";
export type { HealthRepository } from "./health.repository";
