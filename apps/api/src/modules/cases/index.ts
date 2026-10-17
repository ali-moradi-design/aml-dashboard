import { mkdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { Router, type RequestHandler } from "express";
import multer from "multer";
import { err } from "neverthrow";
import { z } from "zod";
import { caseCreateSchema, caseTransitionSchema, caseUpdateSchema, commentInputSchema, gridQuerySchema } from "@aml/shared";
import type { Db } from "../../db/prisma";
import { principalOf } from "../../shared/access";
import { newSessionToken } from "../../shared/crypto";
import { appError } from "../../shared/errors";
import { handle, sendResult } from "../../shared/http";
import { parseWith } from "../../shared/validate";
import { requirePermission } from "../auth";
import { createCasesRepository } from "./cases.repository";
import { createCasesService, type Notifier } from "./cases.service";

const ALLOWED = new Set(["application/pdf", "image/png", "image/jpeg", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);

export const createCasesModule = ({ db, requireAuth, notify, storageDir }: { db: Db; requireAuth: RequestHandler; notify: Notifier; storageDir: string }) => {
  const service = createCasesService({ repo: createCasesRepository(db), notify });
  const dir = resolve(storageDir);
  mkdirSync(dir, { recursive: true });
  const upload = multer({
    storage: multer.diskStorage({ destination: dir, filename: (_req, file, cb) => cb(null, `${newSessionToken()}${extname(file.originalname).toLowerCase()}`) }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => cb(null, ALLOWED.has(file.mimetype)),
  });
  const code = (req: { params: Record<string, unknown> }) => String(req.params.code);

  const uploadDocument: RequestHandler = async (req, res) => {
    const file = req.file;
    if (!file) {
      sendResult(res, err(appError.validation("Choose a PDF, image, CSV, Excel or Word file up to 10 MB")));
      return;
    }
    sendResult(res, await service.addDocument(principalOf(res), code(req), { name: file.originalname, mimeType: file.mimetype, size: file.size, storageKey: file.filename }), 201);
  };

  const download: RequestHandler = async (req, res) => {
    const result = await service.document(principalOf(res), code(req), String(req.params.id));
    if (result.isErr()) {
      sendResult(res, err(result.error));
      return;
    }
    res.download(join(dir, result.value.storageKey), result.value.name);
  };

  return Router()
    .use(requireAuth, requirePermission("cases.view"))
    .post("/query", handle((req, res) => parseWith(gridQuerySchema, req.body).asyncAndThen((q) => service.list(principalOf(res), q))))
    .post("/board", handle((req, res) => parseWith(gridQuerySchema.pick({ filters: true }), req.body).asyncAndThen((q) => service.board(principalOf(res), q.filters))))
    .post("/", requirePermission("cases.create"), handle((req, res) => parseWith(caseCreateSchema, req.body).asyncAndThen((i) => service.create(principalOf(res), i)), 201))
    .get("/:code", handle((req, res) => service.detail(principalOf(res), code(req))))
    .patch("/:code", handle((req, res) => parseWith(caseUpdateSchema, req.body).asyncAndThen((i) => service.update(principalOf(res), code(req), i))))
    .post("/:code/transition", handle((req, res) => parseWith(caseTransitionSchema, req.body).asyncAndThen((i) => service.transition(principalOf(res), code(req), i))))
    .get("/:code/eligible-members", handle((req, res) => service.eligibleMembers(principalOf(res), code(req))))
    .post(
      "/:code/members",
      requirePermission("cases.approve"),
      handle((req, res) => parseWith(z.object({ userId: z.string() }), req.body).asyncAndThen(({ userId }) => service.addMember(principalOf(res), code(req), userId))),
    )
    .delete("/:code/members/:userId", requirePermission("cases.approve"), handle((req, res) => service.removeMember(principalOf(res), code(req), String(req.params.userId))))
    .get("/:code/comments", handle((req, res) => service.comments(principalOf(res), code(req))))
    .post(
      "/:code/comments",
      handle((req, res) =>
        parseWith(commentInputSchema.extend({ documentIds: z.array(z.string()).default([]) }), req.body).asyncAndThen((i) => service.addComment(principalOf(res), code(req), i)),
      201),
    )
    .patch(
      "/:code/comments/:id",
      handle((req, res) => parseWith(z.object({ body: z.string().trim().min(1).max(5000) }), req.body).asyncAndThen(({ body }) => service.editComment(principalOf(res), code(req), String(req.params.id), body))),
    )
    .delete("/:code/comments/:id", handle((req, res) => service.deleteComment(principalOf(res), code(req), String(req.params.id))))
    .get("/:code/note", handle((req, res) => service.note(principalOf(res), code(req))))
    .put("/:code/note", handle((req, res) => parseWith(z.object({ body: z.string().max(10000) }), req.body).asyncAndThen(({ body }) => service.saveNote(principalOf(res), code(req), body))))
    .post("/:code/documents", upload.single("file"), uploadDocument)
    .get("/:code/documents/:id", download);
};

export type { Notifier } from "./cases.service";
