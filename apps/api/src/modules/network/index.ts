import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { networkQuerySchema } from "@aml/shared";
import type { Db } from "../../db/prisma";
import { principalOf } from "../../shared/access";
import { handle } from "../../shared/http";
import { parseWith } from "../../shared/validate";
import { requirePermission } from "../auth";
import { createNetworkRepository } from "./network.repository";
import { createNetworkService } from "./network.service";

const pathQuerySchema = networkQuerySchema
  .omit({ center: true, hops: true })
  .extend({ source: z.string().min(1), target: z.string().min(1) });

export const createNetworkModule = ({
  db,
  requireAuth,
}: {
  db: Db;
  requireAuth: RequestHandler;
}) => {
  const service = createNetworkService({ repo: createNetworkRepository(db) });
  return Router()
    .use(requireAuth, requirePermission("customers.view"), requirePermission("transactions.view"))
    .get(
      "/",
      handle((req, res) =>
        parseWith(networkQuerySchema, req.query).asyncAndThen((q) =>
          service.graph(principalOf(res), q),
        ),
      ),
    )
    .get(
      "/path",
      handle((req, res) =>
        parseWith(pathQuerySchema, req.query).asyncAndThen((q) =>
          service.path(principalOf(res), q),
        ),
      ),
    )
    .get(
      "/featured",
      handle((_req, res) => service.featured(principalOf(res))),
    );
};
