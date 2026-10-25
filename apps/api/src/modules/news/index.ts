import { join } from "node:path";
import { Router, type RequestHandler } from "express";
import { err, errAsync, okAsync, ResultAsync } from "neverthrow";
import sanitizeHtml from "sanitize-html";
import { newsInputSchema, type NewsDetail, type NewsInput, type NewsRow } from "@aml/shared";
import type { Db } from "../../db/prisma";
import type { Prisma } from "../../generated/prisma/client";
import { can, principalOf, type Principal } from "../../shared/access";
import { appError } from "../../shared/errors";
import { handle, sendResult } from "../../shared/http";
import { createUploader, DOCUMENT_TYPES, IMAGE_TYPES, MAX_DOCUMENT_BYTES } from "../../shared/storage";
import { parseWith } from "../../shared/validate";
import { requirePermission } from "../auth";
import type { Notifications } from "../notifications";

const dbError = (cause: unknown) => appError.unexpected("Database error", cause);

/** Only the formatting the editor offers survives; links always open safely in a new tab. */
export const sanitizeNews = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "em", "s", "u", "h2", "h3", "ul", "ol", "li", "blockquote", "a", "code", "pre", "hr"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["https", "http", "mailto"],
    transformTags: { a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }) },
  });

export const excerptOf = (html: string, max = 180) => {
  // Block ends become spaces first, so words of separate paragraphs do not run together.
  const spaced = html.replace(/<\/(p|h2|h3|li|blockquote|pre)>|<br\s*\/?>/gi, " ");
  const text = sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

/** Pure: which posts a person may see (audience roles, regions and clearance). */
export const audienceWhere = (p: Pick<Principal, "role" | "regionIds" | "clearanceRank">): Prisma.NewsPostWhereInput => ({
  AND: [
    { OR: [{ audienceRoles: { isEmpty: true } }, { audienceRoles: { has: p.role as never } }] },
    { OR: [{ audienceRegionIds: { isEmpty: true } }, { audienceRegionIds: { hasSome: p.regionIds } }] },
    { minClearance: { lte: p.clearanceRank } },
  ],
});

const stateOf = (n: { publishAt: Date; expiresAt: Date | null }, now = new Date()): NewsRow["state"] =>
  n.publishAt > now ? "scheduled" : n.expiresAt && n.expiresAt <= now ? "expired" : "live";

const postInclude = {
  author: { select: { name: true } },
  attachments: { select: { id: true, name: true, size: true, kind: true } },
  _count: { select: { reads: true } },
} satisfies Prisma.NewsPostInclude;

export const createNewsModule = ({ db, requireAuth, storageDir, notifications }: { db: Db; requireAuth: RequestHandler; storageDir: string; notifications: Notifications }) => {
  const { dir, upload } = createUploader(storageDir, "news", { allowed: DOCUMENT_TYPES, maxBytes: MAX_DOCUMENT_BYTES });
  const manager = (p: Principal) => can(p, "news.create");

  const audienceUsers = (n: { audienceRoles: string[]; audienceRegionIds: string[]; minClearance: number }) =>
    db.user.findMany({
      where: {
        active: true,
        clearanceRank: { gte: n.minClearance },
        ...(n.audienceRoles.length ? { role: { key: { in: n.audienceRoles as never } } } : {}),
        ...(n.audienceRegionIds.length ? { regions: { some: { regionId: { in: n.audienceRegionIds } } } } : {}),
      },
      select: { id: true },
    });

  /** Tells the audience once, when a post goes live (now, or later from the news job). */
  const announce = async (id: string) => {
    const n = await db.newsPost.findUnique({ where: { id } });
    if (!n || n.notifiedAt || n.publishAt > new Date()) return 0;
    await db.newsPost.update({ where: { id }, data: { notifiedAt: new Date() } });
    const users = await audienceUsers(n);
    return notifications.push(users.filter((u) => u.id !== n.authorId).map((u) => u.id), "news", { title: n.title, id: n.id });
  };

  const visible = (p: Principal, id: string) =>
    ResultAsync.fromPromise(
      db.newsPost.findFirst({ where: { id, ...(manager(p) ? {} : { ...audienceWhere(p), publishAt: { lte: new Date() } }) }, include: postInclude }),
      dbError,
    ).andThen((n) => (n ? okAsync(n) : errAsync(appError.notFound("News not found"))));

  const toRow = async (p: Principal, n: Prisma.NewsPostGetPayload<{ include: typeof postInclude }>, read: boolean): Promise<NewsRow> => {
    const cover = n.attachments.find((a) => a.kind === "cover" && a.id === n.coverKey);
    const isManager = manager(p);
    return {
      id: n.id, title: n.title, excerpt: excerptOf(n.body), coverUrl: cover ? `/news/files/${cover.id}` : null, authorName: n.author.name,
      publishAt: n.publishAt.toISOString(), expiresAt: n.expiresAt?.toISOString() ?? null, pinned: n.pinned, read,
      readCount: isManager ? n._count.reads : null, audienceSize: isManager ? (await audienceUsers(n)).length : null, state: stateOf(n),
    };
  };

  const save = (p: Principal, input: NewsInput, id?: string) =>
    ResultAsync.fromPromise(
      db.$transaction(async (tx) => {
        const data = {
          title: input.title, body: sanitizeNews(input.body), audienceRoles: input.audienceRoles as never, audienceRegionIds: input.audienceRegionIds,
          minClearance: input.minClearance, publishAt: new Date(input.publishAt), expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          pinned: input.pinned, coverKey: input.coverId,
        };
        const post = id ? await tx.newsPost.update({ where: { id }, data: { ...data, notifiedAt: undefined } }) : await tx.newsPost.create({ data: { ...data, authorId: p.userId } });
        const keep = [...input.attachmentIds, ...(input.coverId ? [input.coverId] : [])];
        await tx.newsAttachment.deleteMany({ where: { newsId: post.id, id: { notIn: keep } } });
        // Only the author's own pending uploads can be attached.
        await tx.newsAttachment.updateMany({ where: { id: { in: keep }, OR: [{ newsId: post.id }, { newsId: null, uploadedById: p.userId }] }, data: { newsId: post.id } });
        await tx.auditLog.create({ data: { userId: p.userId, action: id ? "news.update" : "news.create", entity: "news", entityId: post.id } });
        return post;
      }),
      dbError,
    ).map(async (post) => {
      await announce(post.id);
      return { id: post.id };
    });

  const uploadFile: RequestHandler = async (req, res) => {
    const file = req.file;
    const kind = req.query.kind === "cover" ? "cover" : "file";
    if (!file || (kind === "cover" && !IMAGE_TYPES.has(file.mimetype))) {
      sendResult(res, err(appError.validation(kind === "cover" ? "Choose a PNG, JPEG or WebP image up to 5 MB" : "Choose a PDF, image, CSV, Excel or Word file up to 5 MB")));
      return;
    }
    const row = await db.newsAttachment.create({ data: { kind, name: file.originalname, mimeType: file.mimetype, size: file.size, storageKey: file.filename, uploadedById: principalOf(res).userId } });
    res.status(201).json({ id: row.id, name: row.name, size: row.size, url: `/news/files/${row.id}` });
  };

  const download: RequestHandler = async (req, res) => {
    const p = principalOf(res);
    const a = await db.newsAttachment.findUnique({ where: { id: String(req.params.id) } });
    const allowed = a && (a.newsId ? (await visible(p, a.newsId)).isOk() : a.uploadedById === p.userId);
    if (!a || !allowed) {
      sendResult(res, err(appError.notFound("File not found")));
      return;
    }
    if (a.kind === "cover") res.setHeader("Cache-Control", "private, max-age=3600").sendFile(join(dir, a.storageKey));
    else res.download(join(dir, a.storageKey), a.name);
  };

  return {
    announce,
    router: Router()
      .use(requireAuth)
      .get("/", handle((_req, res) => {
        const p = principalOf(res);
        const now = new Date();
        return ResultAsync.fromPromise(
          Promise.all([
            db.newsPost.findMany({
              where: manager(p) ? {} : { ...audienceWhere(p), publishAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
              include: postInclude,
              orderBy: [{ pinned: "desc" }, { publishAt: "desc" }],
              take: 50,
            }),
            db.newsRead.findMany({ where: { userId: p.userId }, select: { newsId: true } }),
          ]),
          dbError,
        ).andThen(([posts, reads]) => {
          const read = new Set(reads.map((r) => r.newsId));
          return ResultAsync.fromSafePromise(Promise.all(posts.map((n) => toRow(p, n, read.has(n.id)))));
        });
      }))
      .get("/:id", handle((req, res) => {
        const p = principalOf(res);
        return visible(p, String(req.params.id)).andThen((n) =>
          ResultAsync.fromPromise(
            Promise.all([
              db.newsRead.findUnique({ where: { newsId_userId: { newsId: n.id, userId: p.userId } } }),
              manager(p) ? db.newsRead.findMany({ where: { newsId: n.id }, include: { user: { select: { name: true } } }, orderBy: { readAt: "desc" } }) : Promise.resolve(null),
            ]),
            dbError,
          ).andThen(([read, readers]) =>
            ResultAsync.fromSafePromise(toRow(p, n, Boolean(read))).map((row): NewsDetail => ({
              ...row,
              body: n.body, audienceRoles: n.audienceRoles, audienceRegionIds: n.audienceRegionIds, minClearance: n.minClearance, coverId: n.coverKey,
              attachments: n.attachments.filter((a) => a.kind === "file").map((a) => ({ id: a.id, name: a.name, size: a.size })),
              canEdit: manager(p) && (n.authorId === p.userId || can(p, "admin.manage") || p.role === "COMPLIANCE_MANAGER"),
              readers: readers?.map((r) => ({ name: r.user.name, readAt: r.readAt.toISOString() })) ?? null,
            })),
          ),
        );
      }))
      .post("/:id/read", handle((req, res) => {
        const p = principalOf(res);
        return visible(p, String(req.params.id)).andThen((n) =>
          ResultAsync.fromPromise(db.newsRead.upsert({ where: { newsId_userId: { newsId: n.id, userId: p.userId } }, create: { newsId: n.id, userId: p.userId }, update: {} }), dbError).map(() => ({ ok: true })),
        );
      }))
      .get("/files/:id", download)
      .post("/uploads", requirePermission("news.create"), upload.single("file"), uploadFile)
      .post("/", requirePermission("news.create"), handle((req, res) => parseWith(newsInputSchema, req.body).asyncAndThen((i) => save(principalOf(res), i)), 201))
      .put("/:id", requirePermission("news.create"), handle((req, res) =>
        parseWith(newsInputSchema, req.body).asyncAndThen((i) => visible(principalOf(res), String(req.params.id)).andThen((n) => save(principalOf(res), i, n.id))),
      ))
      .delete("/:id", requirePermission("news.create"), handle((req, res) =>
        visible(principalOf(res), String(req.params.id)).andThen((n) => ResultAsync.fromPromise(db.newsPost.delete({ where: { id: n.id } }), dbError)).map(() => ({ ok: true })),
      )),
  };
};
