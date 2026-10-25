import argon2 from "argon2";
import type { Db } from "../../db/prisma";
import { hashToken, newSessionToken } from "../../shared/crypto";
import { createAuthHandlers } from "./auth.handlers";
import { createRequireAuth } from "./auth.middleware";
import { createAuthRepository } from "./auth.repository";
import { createAuthRouter } from "./auth.routes";
import { createAuthService } from "./auth.service";

export const createAuthModule = ({ db, secureCookies }: { db: Db; secureCookies: boolean }) => {
  const service = createAuthService({
    repo: createAuthRepository(db),
    verifyPassword: (hash, password) => argon2.verify(hash, password),
    newToken: newSessionToken,
    hashToken,
  });
  const requireAuth = createRequireAuth(service);
  return {
    router: createAuthRouter(createAuthHandlers(service, { secureCookies }), requireAuth),
    requireAuth,
    service,
  };
};

export { requirePermission, SESSION_COOKIE } from "./auth.middleware";
