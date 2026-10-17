import { Router, type RequestHandler } from "express";
import type { AuthHandlers } from "./auth.handlers";

export const createAuthRouter = (h: AuthHandlers, requireAuth: RequestHandler): Router =>
  Router()
    .post("/login", h.login)
    .post("/logout", requireAuth, h.logout)
    .get("/me", requireAuth, h.me)
    .get("/sessions", requireAuth, h.listSessions)
    .delete("/sessions/others", requireAuth, h.revokeOtherSessions)
    .delete("/sessions/:id", requireAuth, h.revokeSession);
