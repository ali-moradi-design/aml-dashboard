import { errAsync, okAsync, ResultAsync, type ResultAsync as RA } from "neverthrow";
import type { LoginInput, Me, RoleKey, SessionInfo } from "@aml/shared";
import type { Principal } from "../../shared/access";
import { appError, type AppError } from "../../shared/errors";
import type { AuthRepository, UserRecord } from "./auth.repository";

export const SESSION_DAYS = 7;
const TOUCH_EVERY_MS = 5 * 60_000;

type Deps = {
  repo: AuthRepository;
  verifyPassword: (hash: string, password: string) => Promise<boolean>;
  newToken: () => string;
  hashToken: (token: string) => string;
  now?: () => Date;
};

export type RequestMeta = { userAgent: string | null; ip: string | null };

// Pure mapping from the database shape to what the rest of the app needs.
export const toPrincipal = (user: UserRecord, sessionId: string): Principal => ({
  userId: user.id,
  sessionId,
  email: user.email,
  name: user.name,
  role: user.role.key as RoleKey,
  roleName: user.role.name,
  clearanceRank: user.clearanceRank,
  regionIds: user.regions.map((r) => r.region.id),
  regions: user.regions.map((r) => ({ code: r.region.code, name: r.region.name })),
  permissions: new Set(user.role.permissions.map((p) => p.permission.key)),
});

export const toMe = (p: Principal): Me => ({
  id: p.userId,
  email: p.email,
  name: p.name,
  role: p.role,
  roleName: p.roleName,
  clearanceRank: p.clearanceRank,
  regions: p.regions,
  permissions: [...p.permissions],
});

const wrongCredentials = appError.unauthorized("Email or password is wrong");

export const createAuthService = ({ repo, verifyPassword, newToken, hashToken, now = () => new Date() }: Deps) => ({
  login: (input: LoginInput, meta: RequestMeta): RA<{ token: string; expiresAt: Date; me: Me }, AppError> =>
    repo.findUserByEmail(input.email).andThen((user) => {
      if (!user) return errAsync(wrongCredentials);
      return ResultAsync.fromPromise(verifyPassword(user.passwordHash, input.password), (cause) => appError.unexpected("Password check failed", cause))
        .andThen((valid) => (valid ? okAsync(user) : errAsync(wrongCredentials)))
        // A disabled account gets the same answer as a wrong password (no account probing).
        .andThen((u) => (u.active ? okAsync(u) : errAsync(wrongCredentials)))
        .andThen((u) => {
          const token = newToken();
          const expiresAt = new Date(now().getTime() + SESSION_DAYS * 86_400_000);
          return repo
            .createSession({ tokenHash: hashToken(token), userId: u.id, expiresAt, ...meta })
            .andThen((session) => repo.audit({ userId: u.id, action: "auth.login", entity: "session", entityId: session.id }).map(() => session))
            .andThen((session) => repo.touchLogin(u.id, now()).map(() => session))
            .map((session) => ({ token, expiresAt, me: toMe(toPrincipal(u, session.id)) }));
        });
    }),

  authenticate: (token: string | undefined): RA<Principal, AppError> => {
    if (!token) return errAsync(appError.unauthorized());
    return repo.findSession(hashToken(token)).andThen((session) => {
      const at = now();
      if (!session || session.expiresAt <= at) return errAsync(appError.unauthorized("Session expired"));
      if (!session.user.active) return errAsync(appError.unauthorized("Account disabled"));
      const principal = toPrincipal(session.user, session.id);
      // Avoid a write on every request: refresh "last seen" at most every 5 minutes.
      if (at.getTime() - session.lastSeenAt.getTime() < TOUCH_EVERY_MS) return okAsync(principal);
      return repo.touchSession(session.id, at).map(() => principal);
    });
  },

  logout: (p: Principal) => repo.deleteSession(p.sessionId, p.userId).map(() => ({ ok: true })),

  listSessions: (p: Principal): RA<SessionInfo[], AppError> =>
    repo.listSessions(p.userId, now()).map((rows) =>
      rows.map((s) => ({
        id: s.id,
        userAgent: s.userAgent,
        ip: s.ip,
        createdAt: s.createdAt.toISOString(),
        lastSeenAt: s.lastSeenAt.toISOString(),
        current: s.id === p.sessionId,
      })),
    ),

  revokeSession: (p: Principal, id: string) =>
    repo.deleteSession(id, p.userId).andThen((count) => (count ? okAsync({ ok: true }) : errAsync(appError.notFound("Session not found")))),

  revokeOtherSessions: (p: Principal) => repo.deleteOtherSessions(p.userId, p.sessionId).map((count) => ({ revoked: count })),
});

export type AuthService = ReturnType<typeof createAuthService>;
