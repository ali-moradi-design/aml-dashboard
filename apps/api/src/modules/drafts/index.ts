import { Router, type RequestHandler } from "express";
import { ResultAsync } from "neverthrow";
import { z } from "zod";
import type { Db } from "../../db/prisma";
import type { Prisma } from "../../generated/prisma/client";
import { principalOf } from "../../shared/access";
import { appError } from "../../shared/errors";
import { handle } from "../../shared/http";
import { parseWith } from "../../shared/validate";

const kindSchema = z.enum(["case", "customer"]);
const saveSchema = z.object({ data: z.record(z.string(), z.unknown()), step: z.number().int().min(0).max(10) });
const dbError = (cause: unknown) => appError.unexpected("Database error", cause);

/** Autosaved drafts for multi-step forms: one per user and form kind. */
export const createDraftsModule = ({ db, requireAuth }: { db: Db; requireAuth: RequestHandler }) =>
  Router()
    .use(requireAuth)
    .get(
      "/:kind",
      handle((req, res) =>
        parseWith(kindSchema, req.params.kind).asyncAndThen((kind) =>
          ResultAsync.fromPromise(db.formDraft.findUnique({ where: { userId_kind: { userId: principalOf(res).userId, kind } } }), dbError).map((d) =>
            d ? { data: d.data, step: d.step, updatedAt: d.updatedAt.toISOString() } : null,
          ),
        ),
      ),
    )
    .put(
      "/:kind",
      handle((req, res) =>
        parseWith(kindSchema, req.params.kind).asyncAndThen((kind) =>
          parseWith(saveSchema, req.body).asyncAndThen(({ data, step }) => {
            const userId = principalOf(res).userId;
            const json = data as Prisma.InputJsonValue;
            return ResultAsync.fromPromise(
              db.formDraft.upsert({ where: { userId_kind: { userId, kind } }, create: { userId, kind, data: json, step }, update: { data: json, step } }),
              dbError,
            ).map((d) => ({ updatedAt: d.updatedAt.toISOString() }));
          }),
        ),
      ),
    )
    .delete(
      "/:kind",
      handle((req, res) =>
        parseWith(kindSchema, req.params.kind).asyncAndThen((kind) =>
          ResultAsync.fromPromise(db.formDraft.deleteMany({ where: { userId: principalOf(res).userId, kind } }), dbError).map(() => ({ ok: true })),
        ),
      ),
    );
