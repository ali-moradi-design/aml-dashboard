import { Router, type RequestHandler } from "express";
import { ResultAsync } from "neverthrow";
import { z } from "zod";
import {
  notificationTypes,
  preferencesSchema,
  type AppNotification,
  type NotificationType,
} from "@aml/shared";
import type { Db } from "../../db/prisma";
import { principalOf } from "../../shared/access";
import { appError } from "../../shared/errors";
import { handle } from "../../shared/http";
import { parseWith } from "../../shared/validate";

const dbError = (cause: unknown) => appError.unexpected("Database error", cause);
type Data = Record<string, string | number | null>;
type Row = { id: string; type: string; data: unknown; readAt: Date | null; createdAt: Date };

const toItem = (n: Row): AppNotification => ({
  id: n.id,
  type: n.type as NotificationType,
  data: (n.data ?? {}) as Data,
  readAt: n.readAt?.toISOString() ?? null,
  createdAt: n.createdAt.toISOString(),
});

/** Live delivery (Socket.IO) is attached after the HTTP server exists. */
export type LiveUserChannel = { toUser: (userId: string, event: string, payload: unknown) => void };

/**
 * Notifications are stored first (the center lists them, read state survives a reload), then
 * pushed live. Users who switched a type off in their settings do not get it.
 */
export const createNotifications = (db: Db, live: () => LiveUserChannel) => {
  const wanted = async (userIds: string[], type: NotificationType) => {
    const prefs = await db.userPreference.findMany({ where: { userId: { in: userIds } } });
    const off = new Set(
      prefs
        .filter((p) => preferencesSchema.safeParse(p.data).data?.notifications[type] === false)
        .map((p) => p.userId),
    );
    return userIds.filter((id) => !off.has(id));
  };

  const push = async (userIds: string[], type: NotificationType, data: Data) => {
    const targets = await wanted([...new Set(userIds)], type);
    for (const userId of targets) {
      const n = await db.notification.create({ data: { userId, type, data } });
      live().toUser(userId, "notification", toItem(n));
    }
    return targets.length;
  };

  /** Everyone with a role; when the notice is about a case, only people who may open that case. */
  const toRole = async (role: string, type: NotificationType, data: Data) => {
    const c =
      typeof data.code === "string"
        ? await db.case.findUnique({
            where: { code: data.code },
            select: { clearanceRank: true, branch: { select: { regionId: true } } },
          })
        : null;
    const users = await db.user.findMany({
      where: {
        active: true,
        role: { key: role as never },
        ...(c
          ? {
              clearanceRank: { gte: c.clearanceRank },
              regions: { some: { regionId: c.branch.regionId } },
            }
          : {}),
      },
      select: { id: true },
    });
    return push(
      users.map((u) => u.id),
      type,
      data,
    );
  };

  return { push, toRole };
};
export type Notifications = ReturnType<typeof createNotifications>;

const listQuerySchema = z.object({
  cursor: z.string().optional(),
  unread: z.enum(["true", "false"]).optional(),
  type: z.enum(notificationTypes).optional(),
});
const readSchema = z.object({ ids: z.array(z.string()).optional(), all: z.boolean().optional() });

export const createNotificationsModule = ({
  db,
  requireAuth,
}: {
  db: Db;
  requireAuth: RequestHandler;
}) => {
  const PAGE = 30;
  return Router()
    .use(requireAuth)
    .get(
      "/",
      handle((req, res) =>
        parseWith(listQuerySchema, req.query).asyncAndThen((q) => {
          const userId = principalOf(res).userId;
          const where = {
            userId,
            ...(q.unread === "true" ? { readAt: null } : {}),
            ...(q.type ? { type: q.type } : {}),
          };
          return ResultAsync.fromPromise(
            Promise.all([
              db.notification.findMany({
                where,
                orderBy: [{ createdAt: "desc" }, { id: "desc" }],
                take: PAGE + 1,
                ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
              }),
              db.notification.count({ where: { userId, readAt: null } }),
            ]),
            dbError,
          ).map(([rows, unread]) => ({
            items: rows.slice(0, PAGE).map(toItem),
            unread,
            nextCursor: rows.length > PAGE ? rows[PAGE - 1]!.id : null,
          }));
        }),
      ),
    )
    .post(
      "/read",
      handle((req, res) =>
        parseWith(readSchema, req.body).asyncAndThen((b) => {
          const userId = principalOf(res).userId;
          return ResultAsync.fromPromise(
            db.notification.updateMany({
              where: { userId, readAt: null, ...(b.all ? {} : { id: { in: b.ids ?? [] } }) },
              data: { readAt: new Date() },
            }),
            dbError,
          ).map((r) => ({ updated: r.count }));
        }),
      ),
    );
};
