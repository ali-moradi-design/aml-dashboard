import { Router } from "express";
import type { HealthHandlers } from "./health.handlers";

// Route layer: URLs and middleware only.
export const createHealthRouter = (handlers: HealthHandlers): Router =>
  Router().get("/", handlers.getHealth);
