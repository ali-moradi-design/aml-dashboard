import { Router, type RequestHandler } from "express";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import {
  validateWorkflow,
  workflowDraftInputSchema,
  workflowGraphSchema,
  type WorkflowDraftInput,
  type WorkflowOverview,
  type WorkflowVersionDetail,
  type WorkflowVersionRow,
} from "@aml/shared";
import type { Db } from "../../db/prisma";
import type { Prisma } from "../../generated/prisma/client";
import { principalOf, type Principal } from "../../shared/access";
import { appError } from "../../shared/errors";
import { handle } from "../../shared/http";
import { parseWith } from "../../shared/validate";
import { requirePermission } from "../auth";

const dbError = (cause: unknown) => appError.unexpected("Database error", cause);
const OPEN = ["DRAFT", "OPEN", "PENDING_APPROVAL", "APPROVED"] as const;

const versionSelect = {
  id: true,
  version: true,
  status: true,
  note: true,
  graph: true,
  publishedAt: true,
  updatedAt: true,
  createdBy: { select: { name: true } },
  publishedBy: { select: { name: true } },
  _count: { select: { cases: true } },
} satisfies Prisma.WorkflowVersionSelect;

// Repository
export const createWorkflowsRepository = (db: Db) => ({
  definition: (key: string) =>
    ResultAsync.fromPromise(
      db.workflowDefinition.findUnique({
        where: { key },
        include: { versions: { select: versionSelect, orderBy: { version: "desc" } } },
      }),
      dbError,
    ),
  version: (id: string) =>
    ResultAsync.fromPromise(
      db.workflowVersion.findUnique({
        where: { id },
        select: { ...versionSelect, definitionId: true },
      }),
      dbError,
    ),
  openCasesByVersion: (ids: string[]) =>
    ResultAsync.fromPromise(
      db.case.groupBy({
        by: ["workflowVersionId"],
        where: { workflowVersionId: { in: ids }, status: { in: [...OPEN] } },
        _count: true,
      }),
      dbError,
    ),
  openCasesByStep: (versionId: string) =>
    ResultAsync.fromPromise(
      db.case.groupBy({
        by: ["step"],
        where: { workflowVersionId: versionId, status: { in: [...OPEN] } },
        _count: true,
      }),
      dbError,
    ),
  createDraft: (definitionId: string, fromGraph: unknown, version: number, userId: string) =>
    ResultAsync.fromPromise(
      db.workflowVersion.create({
        data: {
          definitionId,
          version,
          status: "DRAFT",
          graph: fromGraph as Prisma.InputJsonValue,
          createdById: userId,
          note: null,
        },
        select: { id: true },
      }),
      dbError,
    ),
  saveDraft: (id: string, input: WorkflowDraftInput) =>
    ResultAsync.fromPromise(
      db.workflowVersion.update({
        where: { id },
        data: { graph: input.graph as Prisma.InputJsonValue, note: input.note ?? null },
        select: { id: true },
      }),
      dbError,
    ),
  deleteDraft: (id: string) =>
    ResultAsync.fromPromise(db.workflowVersion.delete({ where: { id } }), dbError),
  /** One published version at a time: the previous one is archived in the same transaction. */
  publish: (id: string, definitionId: string, userId: string) =>
    ResultAsync.fromPromise(
      db.$transaction(async (tx) => {
        await tx.workflowVersion.updateMany({
          where: { definitionId, status: "PUBLISHED" },
          data: { status: "ARCHIVED" },
        });
        const v = await tx.workflowVersion.update({
          where: { id },
          data: { status: "PUBLISHED", publishedAt: new Date(), publishedById: userId },
          select: { id: true, version: true },
        });
        await tx.auditLog.create({
          data: {
            userId,
            action: "workflow.publish",
            entity: "workflow_version",
            entityId: id,
            data: { version: v.version },
          },
        });
        return v;
      }),
      dbError,
    ),
});

type Repo = ReturnType<typeof createWorkflowsRepository>;
type VersionSource = {
  id: string;
  version: number;
  status: WorkflowVersionRow["status"];
  note: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  createdBy: { name: string };
  publishedBy: { name: string } | null;
  _count: { cases: number };
};

const toRow = (v: VersionSource, open: number): WorkflowVersionRow => ({
  id: v.id,
  version: v.version,
  status: v.status,
  note: v.note,
  createdByName: v.createdBy.name,
  publishedByName: v.publishedBy?.name ?? null,
  publishedAt: v.publishedAt?.toISOString() ?? null,
  updatedAt: v.updatedAt.toISOString(),
  openCases: open,
  totalCases: v._count.cases,
});

// Service
export const createWorkflowsService = ({ repo }: { repo: Repo }) => {
  const draftOnly = (id: string) =>
    repo
      .version(id)
      .andThen((v) =>
        !v
          ? errAsync(appError.notFound("Version not found"))
          : v.status !== "DRAFT"
            ? errAsync(appError.conflict("Only a draft can be changed"))
            : okAsync(v),
      );

  return {
    overview: (key: string) =>
      repo.definition(key).andThen((d) => {
        if (!d) return errAsync(appError.notFound("Workflow not found"));
        return repo
          .openCasesByVersion(d.versions.map((v) => v.id))
          .map((counts): WorkflowOverview => {
            const open = new Map(counts.map((c) => [c.workflowVersionId, c._count]));
            return {
              key: d.key,
              name: d.name,
              versions: d.versions.map((v) => toRow(v, open.get(v.id) ?? 0)),
            };
          });
      }),

    version: (id: string) =>
      repo.version(id).andThen((v) => {
        if (!v) return errAsync(appError.notFound("Version not found"));
        const graph = workflowGraphSchema.parse(v.graph);
        return repo.openCasesByStep(v.id).map((steps): WorkflowVersionDetail => {
          const stepLoad = Object.fromEntries(steps.map((s) => [s.step, s._count]));
          const open = steps.reduce((n, s) => n + s._count, 0);
          return { ...toRow(v, open), graph, issues: validateWorkflow(graph), stepLoad };
        });
      }),

    /** Starts editing: an existing draft is reused, otherwise the published graph is copied. */
    createDraft: (p: Principal, key: string) =>
      repo.definition(key).andThen((d) => {
        if (!d) return errAsync(appError.notFound("Workflow not found"));
        const existing = d.versions.find((v) => v.status === "DRAFT");
        if (existing) return okAsync({ id: existing.id });
        const base = d.versions.find((v) => v.status === "PUBLISHED") ?? d.versions[0];
        if (!base) return errAsync(appError.notFound("No version to start from"));
        return repo.createDraft(d.id, base.graph, (d.versions[0]?.version ?? 0) + 1, p.userId);
      }),

    saveDraft: (id: string, input: WorkflowDraftInput) =>
      draftOnly(id)
        .andThen(() => repo.saveDraft(id, input))
        .map(() => ({ issues: validateWorkflow(input.graph) })),

    discardDraft: (id: string) =>
      draftOnly(id)
        .andThen(() => repo.deleteDraft(id))
        .map(() => ({ ok: true })),

    /** Server-side check before publishing; the designer shows the same issues live. */
    publish: (p: Principal, id: string) =>
      draftOnly(id).andThen((v) => {
        const issues = validateWorkflow(workflowGraphSchema.parse(v.graph));
        if (issues.length)
          return errAsync(
            appError.validation(
              "The workflow has problems to fix before publishing",
              issues.map((i) => ({
                path: [i.stepId ?? i.transitionId ?? "graph"],
                message: `workflow.issue.${i.code}`,
              })),
            ),
          );
        return repo.publish(v.id, v.definitionId, p.userId);
      }),
  };
};

// Routes
export const createWorkflowsModule = ({
  db,
  requireAuth,
}: {
  db: Db;
  requireAuth: RequestHandler;
}) => {
  const service = createWorkflowsService({ repo: createWorkflowsRepository(db) });
  return Router()
    .use(requireAuth, requirePermission("workflow.manage"))
    .get(
      "/:key",
      handle((req) => service.overview(String(req.params.key))),
    )
    .post(
      "/:key/draft",
      handle((req, res) => service.createDraft(principalOf(res), String(req.params.key)), 201),
    )
    .get(
      "/versions/:id",
      handle((req) => service.version(String(req.params.id))),
    )
    .put(
      "/versions/:id",
      handle((req) =>
        parseWith(workflowDraftInputSchema, req.body).asyncAndThen((i) =>
          service.saveDraft(String(req.params.id), i),
        ),
      ),
    )
    .delete(
      "/versions/:id",
      handle((req) => service.discardDraft(String(req.params.id))),
    )
    .post(
      "/versions/:id/publish",
      handle((req, res) => service.publish(principalOf(res), String(req.params.id))),
    );
};
