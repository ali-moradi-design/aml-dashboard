import argon2 from "argon2";
import { Router, type RequestHandler } from "express";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { z } from "zod";
import {
  branchInputSchema, gridQuerySchema, permissions as allPermissions, rolePermissionsSchema, roleKeys, userInputSchema,
  type AdminReference, type AdminUser, type BranchInput, type GridQuery, type UserInput,
} from "@aml/shared";
import type { Db } from "../../db/prisma";
import type { Prisma } from "../../generated/prisma/client";
import { principalOf, type Principal } from "../../shared/access";
import { appError } from "../../shared/errors";
import { handle } from "../../shared/http";
import { parseWith } from "../../shared/validate";
import { requirePermission } from "../auth";

const dbError = (cause: unknown) => appError.unexpected("Database error", cause);
const audit = (db: Db | Prisma.TransactionClient, p: Principal, action: string, entity: string, entityId: string | null, data?: Prisma.InputJsonValue) =>
  db.auditLog.create({ data: { userId: p.userId, action, entity, entityId, data } });

const userSelect = { id: true, name: true, email: true, clearanceRank: true, active: true, lastLoginAt: true, createdAt: true, role: { select: { key: true } }, regions: { select: { regionId: true } } } satisfies Prisma.UserSelect;
const toUser = (u: Prisma.UserGetPayload<{ select: typeof userSelect }>): AdminUser => ({
  id: u.id, name: u.name, email: u.email, role: u.role.key, regionIds: u.regions.map((r) => r.regionId), clearanceRank: u.clearanceRank,
  active: u.active, lastLoginAt: u.lastLoginAt?.toISOString() ?? null, createdAt: u.createdAt.toISOString(),
});

/** Pure: the admin role always keeps admin rights, so nobody can lock everyone out. */
export const guardRolePermissions = (role: string, permissions: string[]) => {
  const known = permissions.filter((x) => (allPermissions as readonly string[]).includes(x));
  return role === "ADMIN" && !known.includes("admin.manage") ? [...known, "admin.manage"] : [...new Set(known)];
};

const auditFilterSchema = gridQuerySchema;

export const createAdminModule = ({ db, requireAuth }: { db: Db; requireAuth: RequestHandler }) => {
  const reference = () =>
    ResultAsync.fromPromise(
      Promise.all([
        db.region.findMany({ orderBy: { code: "asc" }, include: { branches: { orderBy: { code: "asc" }, include: { _count: { select: { customers: true } } } }, users: { select: { userId: true } } } }),
        db.clearanceLevel.findMany({ orderBy: { rank: "asc" } }),
        db.role.findMany({ include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } } }),
        db.userRegion.groupBy({ by: ["regionId"], _count: true }),
      ]),
      dbError,
    ).map(([regions, levels, roles]): AdminReference => ({
      regions: regions.map((r) => ({
        id: r.id, code: r.code, name: r.name,
        branches: r.branches.map((b) => ({ id: b.id, code: b.code, city: b.city, country: b.country, timezone: b.timezone, users: r.users.length, customers: b._count.customers })),
      })),
      clearanceLevels: levels.map((l) => ({ rank: l.rank, name: l.name })),
      roles: roleKeys.map((key) => {
        const r = roles.find((x) => x.key === key)!;
        return { key, name: r.name, permissions: r.permissions.map((x) => x.permission.key), users: r._count.users };
      }),
    }));

  const saveUser = (p: Principal, input: UserInput, id?: string) =>
    ResultAsync.fromPromise(db.user.findFirst({ where: { email: input.email, ...(id ? { id: { not: id } } : {}) } }), dbError)
      .andThen((taken) => (taken ? errAsync(appError.validation("Email already used", [{ path: ["email"], message: "errors.emailTaken" }])) : okAsync(null)))
      .andThen(() => (!id && !input.password ? errAsync(appError.validation("Password required", [{ path: ["password"], message: "errors.required" }])) : okAsync(null)))
      .andThen(() => ResultAsync.fromPromise(input.password ? argon2.hash(input.password) : Promise.resolve(null), (cause) => appError.unexpected("Hashing failed", cause)))
      .andThen((hash) =>
        ResultAsync.fromPromise(
          db.$transaction(async (tx) => {
            const role = await tx.role.findUniqueOrThrow({ where: { key: input.role } });
            const data = { name: input.name, email: input.email, roleId: role.id, clearanceRank: input.clearanceRank, active: input.active, ...(hash ? { passwordHash: hash } : {}) };
            const u = id ? await tx.user.update({ where: { id }, data }) : await tx.user.create({ data: { ...data, passwordHash: hash! } });
            await tx.userRegion.deleteMany({ where: { userId: u.id } });
            await tx.userRegion.createMany({ data: input.regionIds.map((regionId) => ({ userId: u.id, regionId })) });
            // Disabling a user or resetting the password ends their sessions right away.
            if (!input.active || (id && hash)) await tx.session.deleteMany({ where: { userId: u.id } });
            await audit(tx, p, id ? "user.update" : "user.create", "user", u.id, { role: input.role, active: input.active, regions: input.regionIds });
            return tx.user.findUniqueOrThrow({ where: { id: u.id }, select: userSelect });
          }),
          dbError,
        ),
      )
      .map(toUser);

  const saveRole = (p: Principal, role: string, permissions: string[]) => {
    if (p.role === role && role !== "ADMIN") return errAsync(appError.forbidden("You cannot change your own role's permissions"));
    const keep = guardRolePermissions(role, permissions);
    return ResultAsync.fromPromise(
      db.$transaction(async (tx) => {
        const r = await tx.role.findUniqueOrThrow({ where: { key: role as never } });
        const perms = await tx.permission.findMany({ where: { key: { in: keep } } });
        await tx.rolePermission.deleteMany({ where: { roleId: r.id } });
        await tx.rolePermission.createMany({ data: perms.map((x) => ({ roleId: r.id, permissionId: x.id })) });
        await audit(tx, p, "role.permissions", "role", r.id, { role, permissions: keep });
        return { role, permissions: keep };
      }),
      dbError,
    );
  };

  const saveBranch = (p: Principal, input: BranchInput, id?: string) =>
    ResultAsync.fromPromise(db.branch.findFirst({ where: { code: input.code, ...(id ? { id: { not: id } } : {}) } }), dbError)
      .andThen((taken) => (taken ? errAsync(appError.validation("Code used", [{ path: ["code"], message: "errors.branchCodeTaken" }])) : okAsync(null)))
      .andThen(() =>
        ResultAsync.fromPromise(
          db.$transaction(async (tx) => {
            const data = { code: input.code, name: `${input.city} branch`, city: input.city, country: input.country, timezone: input.timezone, regionId: input.regionId };
            const b = id ? await tx.branch.update({ where: { id }, data }) : await tx.branch.create({ data: { ...data, lat: 0, lng: 0 } });
            await audit(tx, p, id ? "branch.update" : "branch.create", "branch", b.id, { code: b.code });
            return { id: b.id };
          }),
          dbError,
        ),
      );

  const auditLog = (q: GridQuery) => {
    const f = q.filters;
    const where: Prisma.AuditLogWhereInput = {
      ...(typeof f.action === "string" && f.action ? { action: { startsWith: f.action } } : {}),
      ...(typeof f.entity === "string" && f.entity ? { entity: f.entity } : {}),
      ...(typeof f.userId === "string" && f.userId ? { userId: f.userId } : {}),
    };
    const dir = q.sortModel[0]?.sort === "asc" ? "asc" : "desc";
    return ResultAsync.fromPromise(
      Promise.all([db.auditLog.findMany({ where, orderBy: [{ createdAt: dir }, { id: dir }], skip: q.startRow, take: Math.min(q.endRow - q.startRow, 200) }), db.auditLog.count({ where })]),
      dbError,
    ).andThen(([rows, rowCount]) =>
      ResultAsync.fromPromise(db.user.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.userId).filter((x): x is string => Boolean(x)))] } }, select: { id: true, name: true } }), dbError).map((users) => {
        const names = new Map(users.map((u) => [u.id, u.name]));
        return { rowCount, rows: rows.map((r) => ({ id: r.id, userName: r.userId ? (names.get(r.userId) ?? null) : null, action: r.action, entity: r.entity, entityId: r.entityId, data: r.data, createdAt: r.createdAt.toISOString() })) };
      }),
    );
  };

  return Router()
    .use(requireAuth, requirePermission("admin.manage"))
    .get("/reference", handle(() => reference()))
    .get("/users", handle(() => ResultAsync.fromPromise(db.user.findMany({ orderBy: { name: "asc" }, select: userSelect }), dbError).map((us) => us.map(toUser))))
    .post("/users", handle((req, res) => parseWith(userInputSchema, req.body).asyncAndThen((i) => saveUser(principalOf(res), i)), 201))
    .put("/users/:id", handle((req, res) => {
      const p = principalOf(res);
      return parseWith(userInputSchema, req.body).asyncAndThen((i) =>
        String(req.params.id) === p.userId && (!i.active || i.role !== "ADMIN") ? errAsync(appError.forbidden("You cannot disable yourself or drop your own admin role")) : saveUser(p, i, String(req.params.id)),
      );
    }))
    .put("/roles/:key", handle((req, res) => parseWith(rolePermissionsSchema, { role: req.params.key, ...req.body }).asyncAndThen((i) => saveRole(principalOf(res), i.role, i.permissions))))
    .post("/branches", handle((req, res) => parseWith(branchInputSchema, req.body).asyncAndThen((i) => saveBranch(principalOf(res), i)), 201))
    .put("/branches/:id", handle((req, res) => parseWith(branchInputSchema, req.body).asyncAndThen((i) => saveBranch(principalOf(res), i, String(req.params.id)))))
    .put("/clearance/:rank", handle((req, res) =>
      parseWith(z.object({ name: z.string().trim().min(2, "errors.required").max(40) }), req.body).asyncAndThen((i) =>
        ResultAsync.fromPromise(
          db.$transaction([db.clearanceLevel.update({ where: { rank: Number(req.params.rank) }, data: { name: i.name } }), audit(db, principalOf(res), "clearance.rename", "clearance", String(req.params.rank), { name: i.name })]),
          dbError,
        ).map(() => ({ ok: true })),
      ),
    ))
    .post("/audit", handle((req) => parseWith(auditFilterSchema, req.body).asyncAndThen((q) => auditLog(q))));
};
