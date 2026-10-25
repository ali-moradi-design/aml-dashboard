import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { customerOnboardingSchema, gridQuerySchema, kycUpdateSchema } from "@aml/shared";
import type { Db } from "../../db/prisma";
import { principalOf } from "../../shared/access";
import { handle } from "../../shared/http";
import { parseWith } from "../../shared/validate";
import { requirePermission } from "../auth";
import { createCustomersRepository } from "./customers.repository";
import { createCustomersService } from "./customers.service";

export const createCustomersModule = ({
  db,
  requireAuth,
}: {
  db: Db;
  requireAuth: RequestHandler;
}) => {
  const service = createCustomersService({ repo: createCustomersRepository(db) });
  return Router()
    .use(requireAuth, requirePermission("customers.view"))
    .post(
      "/query",
      handle((req, res) =>
        parseWith(gridQuerySchema, req.body).asyncAndThen((q) => service.list(principalOf(res), q)),
      ),
    )
    .get(
      "/check-email",
      handle((req) =>
        parseWith(z.object({ email: z.email() }), req.query).asyncAndThen(({ email }) =>
          service.checkEmail(email),
        ),
      ),
    )
    .get(
      "/check-iban",
      handle((req) =>
        parseWith(z.object({ iban: z.string().min(4) }), req.query).asyncAndThen(({ iban }) =>
          service.checkIban(iban),
        ),
      ),
    )
    .post(
      "/",
      requirePermission("customers.manage"),
      handle(
        (req, res) =>
          parseWith(customerOnboardingSchema, req.body).asyncAndThen((input) =>
            service.create(principalOf(res), input),
          ),
        201,
      ),
    )
    .get(
      "/:code",
      handle((req, res) => service.profile(principalOf(res), String(req.params.code))),
    )
    .put(
      "/:code/kyc",
      requirePermission("customers.manage"),
      handle((req, res) =>
        parseWith(kycUpdateSchema, req.body).asyncAndThen((input) =>
          service.updateKyc(principalOf(res), String(req.params.code), input),
        ),
      ),
    );
};
