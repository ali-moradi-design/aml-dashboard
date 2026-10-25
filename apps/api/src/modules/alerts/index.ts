import { Router, type RequestHandler } from "express";
import { alertDecisionSchema, gridQuerySchema } from "@aml/shared";
import type { Db } from "../../db/prisma";
import { principalOf } from "../../shared/access";
import { handle } from "../../shared/http";
import { parseWith } from "../../shared/validate";
import { requirePermission } from "../auth";
import { createAlertsRepository } from "./alerts.repository";
import { createAlertsService, type AlertsService } from "./alerts.service";

export const createAlertsHandlers = (service: AlertsService) => ({
  query: handle((req, res) =>
    parseWith(gridQuerySchema, req.body).asyncAndThen((q) => service.list(principalOf(res), q)),
  ),
  detail: handle((req, res) => service.detail(principalOf(res), String(req.params.id))),
  decide: handle((req, res) =>
    parseWith(alertDecisionSchema, req.body).asyncAndThen((input) =>
      service.decide(principalOf(res), String(req.params.id), input),
    ),
  ),
});

export const createAlertsModule = ({
  db,
  requireAuth,
}: {
  db: Db;
  requireAuth: RequestHandler;
}) => {
  const h = createAlertsHandlers(createAlertsService({ repo: createAlertsRepository(db) }));
  return Router()
    .use(requireAuth, requirePermission("alerts.view"))
    .post("/query", h.query)
    .get("/:id", h.detail)
    .post("/:id/decision", requirePermission("alerts.decide"), h.decide);
};
