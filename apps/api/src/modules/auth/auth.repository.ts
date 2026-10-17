import { ResultAsync } from "neverthrow";
import type { Db } from "../../db/prisma";
import type { Prisma } from "../../generated/prisma/client";
import { appError } from "../../shared/errors";

const userInclude = {
  role: { include: { permissions: { include: { permission: true } } } },
  regions: { include: { region: true } },
} satisfies Prisma.UserInclude;

export type UserRecord = Prisma.UserGetPayload<{ include: typeof userInclude }>;

const dbError = (cause: unknown) => appError.unexpected("Database error", cause);

export const createAuthRepository = (db: Db) => ({
  findUserByEmail: (email: string) =>
    ResultAsync.fromPromise(db.user.findUnique({ where: { email: email.toLowerCase() }, include: userInclude }), dbError),

  createSession: (data: { tokenHash: string; userId: string; expiresAt: Date; userAgent: string | null; ip: string | null }) =>
    ResultAsync.fromPromise(db.session.create({ data }), dbError),

  findSession: (tokenHash: string) =>
    ResultAsync.fromPromise(db.session.findUnique({ where: { tokenHash }, include: { user: { include: userInclude } } }), dbError),

  touchLogin: (userId: string, at: Date) => ResultAsync.fromPromise(db.user.update({ where: { id: userId }, data: { lastLoginAt: at } }), dbError),

  touchSession: (id: string, at: Date) => ResultAsync.fromPromise(db.session.update({ where: { id }, data: { lastSeenAt: at } }), dbError),

  deleteSession: (id: string, userId: string) =>
    ResultAsync.fromPromise(db.session.deleteMany({ where: { id, userId } }), dbError).map((r) => r.count),

  listSessions: (userId: string, now: Date) =>
    ResultAsync.fromPromise(db.session.findMany({ where: { userId, expiresAt: { gt: now } }, orderBy: { lastSeenAt: "desc" } }), dbError),

  deleteOtherSessions: (userId: string, keepId: string) =>
    ResultAsync.fromPromise(db.session.deleteMany({ where: { userId, id: { not: keepId } } }), dbError).map((r) => r.count),

  audit: (entry: { userId: string | null; action: string; entity: string; entityId?: string | null; data?: Prisma.InputJsonValue }) =>
    ResultAsync.fromPromise(db.auditLog.create({ data: entry }), dbError),
});

export type AuthRepository = ReturnType<typeof createAuthRepository>;
