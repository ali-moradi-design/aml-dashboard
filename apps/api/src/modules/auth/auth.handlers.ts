import type { CookieOptions, Request, RequestHandler } from "express";
import { okAsync } from "neverthrow";
import { loginSchema } from "@aml/shared";
import { principalOf } from "../../shared/access";
import { handle, sendResult } from "../../shared/http";
import { parseWith } from "../../shared/validate";
import { SESSION_COOKIE } from "./auth.middleware";
import { toMe, type AuthService } from "./auth.service";

const meta = (req: Request) => ({ userAgent: req.get("user-agent") ?? null, ip: req.ip ?? null });

export const createAuthHandlers = (
  service: AuthService,
  { secureCookies }: { secureCookies: boolean },
) => {
  const cookieOptions = (expires?: Date): CookieOptions => ({
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
    ...(expires ? { expires } : {}),
  });

  const login: RequestHandler = async (req, res) => {
    const result = await parseWith(loginSchema, req.body).asyncAndThen((input) =>
      service.login(input, meta(req)),
    );
    sendResult(
      res,
      result.map(({ token, expiresAt, me }) => {
        res.cookie(SESSION_COOKIE, token, cookieOptions(expiresAt));
        return me;
      }),
    );
  };

  return {
    login,
    logout: handle((_req, res) =>
      service.logout(principalOf(res)).map((r) => {
        res.clearCookie(SESSION_COOKIE, cookieOptions());
        return r;
      }),
    ),
    me: handle((_req, res) => okAsync(toMe(principalOf(res)))),
    listSessions: handle((_req, res) => service.listSessions(principalOf(res))),
    revokeSession: handle((req, res) =>
      service.revokeSession(principalOf(res), String(req.params.id)),
    ),
    revokeOtherSessions: handle((_req, res) => service.revokeOtherSessions(principalOf(res))),
  };
};

export type AuthHandlers = ReturnType<typeof createAuthHandlers>;
