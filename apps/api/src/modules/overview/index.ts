import { Router, type RequestHandler } from "express";
import type { Db } from "../../db/prisma";
import { principalOf } from "../../shared/access";
import { handle } from "../../shared/http";
import { requirePermission } from "../auth";
import { createOverviewRepository } from "./overview.repository";
import { createOverviewService } from "./overview.service";

export const createOverviewModule = ({ db, requireAuth }: { db: Db; requireAuth: RequestHandler }) => {
  const service = createOverviewService({ repo: createOverviewRepository(db) });
  return Router()
    .use(requireAuth, requirePermission("overview.view"))
    .get("/", handle((_req, res) => service.get(principalOf(res))));
};
