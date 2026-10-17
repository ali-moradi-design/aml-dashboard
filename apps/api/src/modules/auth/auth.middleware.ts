import type { RequestHandler } from "express";
import { err } from "neverthrow";
import type { Permission } from "@aml/shared";
import { can, principalOf } from "../../shared/access";
import { appError } from "../../shared/errors";
import { sendResult } from "../../shared/http";
import type { AuthService } from "./auth.service";

export const SESSION_COOKIE = "aml_session";

/** Rejects requests without a valid session and puts the Principal on res.locals. */
export const createRequireAuth =
  (auth: AuthService): RequestHandler =>
  async (req, res, next) => {
    const result = await auth.authenticate(req.cookies?.[SESSION_COOKIE] as string | undefined);
    if (result.isErr()) {
      sendResult(res, err(result.error));
      return;
    }
    res.locals.principal = result.value;
    next();
  };

/** Layer 1 of the access model: the user may do this action at all. */
export const requirePermission =
  (permission: Permission): RequestHandler =>
  (_req, res, next) => {
    if (can(principalOf(res), permission)) {
      next();
      return;
    }
    sendResult(res, err(appError.forbidden(`Missing permission ${permission}`)));
  };
