import { join } from "node:path";
import argon2 from "argon2";
import { Router, type RequestHandler } from "express";
import { err, errAsync, okAsync, ResultAsync } from "neverthrow";
import {
  passwordChangeSchema,
  preferencesSchema,
  profileSchema,
  systemSettingsSchema,
  type Preferences,
  type SystemSettings,
} from "@aml/shared";
import type { Db } from "../../db/prisma";
import { principalOf, type Principal } from "../../shared/access";
import { appError } from "../../shared/errors";
import { handle, sendResult } from "../../shared/http";
import { createUploader, IMAGE_TYPES, MAX_AVATAR_BYTES } from "../../shared/storage";
import { loadSystemSettings } from "../../shared/system-settings";
import { parseWith } from "../../shared/validate";
import { requirePermission } from "../auth";

const dbError = (cause: unknown) => appError.unexpected("Database error", cause);

export const createSettingsModule = ({
  db,
  requireAuth,
  storageDir,
}: {
  db: Db;
  requireAuth: RequestHandler;
  storageDir: string;
}) => {
  const { dir, upload } = createUploader(storageDir, "avatars", {
    allowed: IMAGE_TYPES,
    maxBytes: MAX_AVATAR_BYTES,
  });

  const me = (p: Principal) =>
    ResultAsync.fromPromise(
      Promise.all([
        db.user.findUniqueOrThrow({ where: { id: p.userId } }),
        db.userPreference.findUnique({ where: { userId: p.userId } }),
      ]),
      dbError,
    ).map(([u, pref]) => ({
      profile: {
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarKey ? `/settings/avatar/${u.id}?v=${u.avatarKey.slice(0, 8)}` : null,
      },
      preferences: preferencesSchema.safeParse(pref?.data).data ?? preferencesSchema.parse({}),
    }));

  const savePreferences = (p: Principal, prefs: Preferences) =>
    ResultAsync.fromPromise(
      db.userPreference.upsert({
        where: { userId: p.userId },
        create: { userId: p.userId, data: prefs },
        update: { data: prefs },
      }),
      dbError,
    ).map(() => prefs);

  const changePassword = (p: Principal, input: { current: string; next: string }) =>
    ResultAsync.fromPromise(db.user.findUniqueOrThrow({ where: { id: p.userId } }), dbError)
      .andThen((u) =>
        ResultAsync.fromPromise(argon2.verify(u.passwordHash, input.current), (cause) =>
          appError.unexpected("Password check failed", cause),
        ),
      )
      .andThen((ok) =>
        ok
          ? okAsync(null)
          : errAsync(
              appError.validation("Current password is wrong", [
                { path: ["current"], message: "errors.passwordWrong" },
              ]),
            ),
      )
      .andThen(() =>
        ResultAsync.fromPromise(argon2.hash(input.next), (cause) =>
          appError.unexpected("Hashing failed", cause),
        ),
      )
      .andThen((hash) =>
        ResultAsync.fromPromise(
          db.$transaction([
            db.user.update({ where: { id: p.userId }, data: { passwordHash: hash } }),
            // Other devices must sign in again with the new password.
            db.session.deleteMany({ where: { userId: p.userId, id: { not: p.sessionId } } }),
            db.auditLog.create({
              data: {
                userId: p.userId,
                action: "auth.password_change",
                entity: "user",
                entityId: p.userId,
              },
            }),
          ]),
          dbError,
        ),
      )
      .map(([, ended]) => ({ endedSessions: ended.count }));

  const saveSystem = (p: Principal, s: SystemSettings) =>
    ResultAsync.fromPromise(
      db.$transaction([
        db.systemSetting.upsert({
          where: { key: "system" },
          create: { key: "system", value: s },
          update: { value: s },
        }),
        db.auditLog.create({
          data: { userId: p.userId, action: "settings.system", entity: "settings", data: s },
        }),
      ]),
      dbError,
    ).map(() => s);

  const uploadAvatar: RequestHandler = async (req, res) => {
    if (!req.file)
      return void sendResult(
        res,
        err(appError.validation("Choose a PNG, JPEG or WebP image up to 3 MB")),
      );
    const p = principalOf(res);
    await db.user.update({ where: { id: p.userId }, data: { avatarKey: req.file.filename } });
    sendResult(res, await me(p));
  };

  const avatar: RequestHandler = async (req, res) => {
    const u = await db.user.findUnique({
      where: { id: String(req.params.userId) },
      select: { avatarKey: true },
    });
    if (!u?.avatarKey) return void sendResult(res, err(appError.notFound("No photo")));
    res.setHeader("Cache-Control", "private, max-age=86400").sendFile(join(dir, u.avatarKey));
  };

  return Router()
    .use(requireAuth)
    .get(
      "/me",
      handle((_req, res) => me(principalOf(res))),
    )
    .put(
      "/profile",
      handle((req, res) =>
        parseWith(profileSchema, req.body).asyncAndThen((i) =>
          ResultAsync.fromPromise(
            db.user.update({ where: { id: principalOf(res).userId }, data: { name: i.name } }),
            dbError,
          ).andThen(() => me(principalOf(res))),
        ),
      ),
    )
    .post("/avatar", upload.single("file"), uploadAvatar)
    .delete(
      "/avatar",
      handle((_req, res) =>
        ResultAsync.fromPromise(
          db.user.update({ where: { id: principalOf(res).userId }, data: { avatarKey: null } }),
          dbError,
        ).andThen(() => me(principalOf(res))),
      ),
    )
    .get("/avatar/:userId", avatar)
    .put(
      "/preferences",
      handle((req, res) =>
        parseWith(preferencesSchema, req.body).asyncAndThen((i) =>
          savePreferences(principalOf(res), i),
        ),
      ),
    )
    .post(
      "/password",
      handle((req, res) =>
        parseWith(passwordChangeSchema, req.body).asyncAndThen((i) =>
          changePassword(principalOf(res), i),
        ),
      ),
    )
    .get(
      "/system",
      requirePermission("admin.manage"),
      handle(() => ResultAsync.fromPromise(loadSystemSettings(db), dbError)),
    )
    .put(
      "/system",
      requirePermission("admin.manage"),
      handle((req, res) =>
        parseWith(systemSettingsSchema, req.body).asyncAndThen((s) =>
          saveSystem(principalOf(res), s),
        ),
      ),
    );
};
