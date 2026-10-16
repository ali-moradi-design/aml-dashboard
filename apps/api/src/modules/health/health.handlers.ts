import { handle } from "../../shared/http";
import type { HealthService } from "./health.service";

// Handler layer: HTTP in, HTTP out. Reads the request, calls the service, sends the Result.
export const createHealthHandlers = (service: HealthService) => ({
  getHealth: handle(() => service.check()),
});

export type HealthHandlers = ReturnType<typeof createHealthHandlers>;
