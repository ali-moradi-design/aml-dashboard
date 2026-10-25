import { errAsync, okAsync, ResultAsync } from "neverthrow";
import {
  availableTransitions,
  slaDeadline,
  startStep,
  stepOf,
  workflowGraphSchema,
  type CaseBoard,
  type CaseCreate,
  type CaseDetail,
  type CaseFacts,
  type CaseRow,
  type CaseTransition,
  type CaseUpdate,
  type Comment,
  type CommentInput,
  type GridQuery,
} from "@aml/shared";
import { can, scopeOf, type Principal } from "../../shared/access";
import { appError } from "../../shared/errors";
import { toAlertRow } from "../../shared/mappers";
import type { CasesRepository } from "./cases.repository";

/** Side channel for live updates (Socket.IO in production, a no-op in tests). */
export type Notifier = {
  toCase: (caseId: string, event: string, payload: unknown) => void;
  toUser: (userId: string, event: string, payload: unknown) => void;
  toRole: (role: string, event: string, payload: unknown) => void;
};

type RowSource = {
  id: string;
  code: string;
  title: string;
  status: CaseRow["status"];
  priority: CaseRow["priority"];
  riskLevel: CaseRow["riskLevel"];
  typology: string;
  totalAmount: { toFixed: (n: number) => string } | null;
  dueAt: Date;
  createdAt: Date;
  updatedAt: Date;
  branch: { city: string };
  createdBy: { name: string };
  parties: Array<{ name: string }>;
  _count: { alerts: number };
};

export const toCaseRow = (c: RowSource): CaseRow => ({
  id: c.id,
  code: c.code,
  title: c.title,
  status: c.status,
  priority: c.priority,
  riskLevel: c.riskLevel,
  typology: c.typology,
  branchCity: c.branch.city,
  subjectName: c.parties[0]?.name ?? null,
  totalAmount: c.totalAmount?.toFixed(2) ?? null,
  createdByName: c.createdBy.name,
  alertCount: c._count.alerts,
  dueAt: c.dueAt.toISOString(),
  createdAt: c.createdAt.toISOString(),
  updatedAt: c.updatedAt.toISOString(),
});

type CommentSource = {
  id: string;
  parentId: string | null;
  body: string;
  mentions: string[];
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
  author: { id: string; name: string; role: { key: string } };
  edits: Array<{ body: string; editedAt: Date }>;
  documents: Array<{ id: string; name: string; size: number }>;
};

const toComment = (c: CommentSource): Comment => ({
  id: c.id,
  parentId: c.parentId,
  author: { id: c.author.id, name: c.author.name, role: c.author.role.key },
  body: c.deletedAt ? "" : c.body,
  mentions: c.mentions,
  createdAt: c.createdAt.toISOString(),
  editedAt: c.editedAt?.toISOString() ?? null,
  deleted: Boolean(c.deletedAt),
  edits: c.deletedAt
    ? []
    : c.edits.map((e) => ({ body: e.body, editedAt: e.editedAt.toISOString() })),
  attachments: c.deletedAt
    ? []
    : c.documents.map((d) => ({ id: d.id, name: d.name, size: d.size })),
});

const notFound = () => appError.notFound("Case not found");

type WorkflowSource = {
  step: string;
  createdById: string;
  totalAmount: { toNumber?: () => number } | null;
  _count: { alerts: number };
  riskLevel: string;
  priority: string;
  recommendation: string | null;
  findings: string | null;
};

/** The facts the workflow engine looks at (conditions and requirements). */
export const caseFacts = (c: WorkflowSource): CaseFacts => ({
  step: c.step,
  createdById: c.createdById,
  totalAmount: Number(c.totalAmount ?? 0),
  alertCount: c._count.alerts,
  riskLevel: c.riskLevel,
  priority: c.priority,
  recommendation: c.recommendation,
  hasFindings: Boolean(c.findings?.trim()),
});

export const createCasesService = ({
  repo,
  notify,
}: {
  repo: CasesRepository;
  notify: Notifier;
}) => {
  /** Case in scope (layers 1-3) plus whether the user is a member (layer 4). */
  const load = (p: Principal, code: string) =>
    repo
      .detail(scopeOf(p), code)
      .andThen((c) =>
        c
          ? repo.isMember(c.id, p.userId).map((isMember) => ({ c, isMember }))
          : errAsync(notFound()),
      );

  /** Layer 4: comments and private notes need case membership. */
  const loadAsMember = (p: Principal, code: string) =>
    load(p, code).andThen((x) =>
      x.isMember
        ? okAsync(x)
        : errAsync(appError.forbidden("Only case members can see comments and notes")),
    );

  return {
    list: (p: Principal, q: GridQuery) =>
      repo
        .query(scopeOf(p), q, p.userId)
        .map(([rows, rowCount]) => ({ rows: rows.map(toCaseRow), rowCount })),

    board: (p: Principal, filters: GridQuery["filters"]) =>
      repo.board(scopeOf(p), filters, p.userId).map((cols): CaseBoard => ({
        columns: cols.map((col) => ({ ...col, cases: col.cases.map(toCaseRow) })),
      })),

    detail: (p: Principal, code: string) =>
      load(p, code).andThen(({ c, isMember }) => {
        const actorIds = [
          ...new Set(c.events.map((e) => e.actorId).filter((x): x is string => Boolean(x))),
        ];
        if (!c.workflowVersion)
          return errAsync(appError.unexpected("Case has no workflow version"));
        const version = c.workflowVersion;
        const graph = workflowGraphSchema.parse(version.graph);
        const step = stepOf(graph, c.step);
        return repo.latestPublishedVersion("case").andThen((latest) =>
          repo.userNames(actorIds).map((users): CaseDetail => {
            const names = new Map(users.map((u) => [u.id, u.name]));
            const actions = availableTransitions(graph, caseFacts(c), {
              userId: p.userId,
              role: p.role,
              isMember,
            });
            const open = c.status === "OPEN" || c.status === "DRAFT";
            return {
              case: {
                ...toCaseRow({ ...c, parties: c.parties.filter((x) => x.role === "SUBJECT") }),
                summary: c.summary,
                findings: c.findings,
                recommendation: c.recommendation,
                periodStart: c.periodStart?.toISOString() ?? null,
                periodEnd: c.periodEnd?.toISOString() ?? null,
                sarReference: c.sarReference,
                clearanceRank: c.clearanceRank,
                createdById: c.createdById,
                approvedByName: c.approvedBy?.name ?? null,
                submittedAt: c.submittedAt?.toISOString() ?? null,
                approvedAt: c.approvedAt?.toISOString() ?? null,
                reportedAt: c.reportedAt?.toISOString() ?? null,
                closedAt: c.closedAt?.toISOString() ?? null,
              },
              alerts: c.alerts.map(toAlertRow),
              parties: c.parties.map((x) => ({
                id: x.id,
                name: x.name,
                type: x.type,
                role: x.role,
                country: x.country,
                customerCode: x.customer?.code ?? null,
                notes: x.notes,
                accounts: x.accounts.map((a) => ({
                  iban: a.iban,
                  bankName: a.bankName,
                  currency: a.currency,
                })),
              })),
              documents: c.documents.map((d) => ({
                id: d.id,
                name: d.name,
                mimeType: d.mimeType,
                size: d.size,
                uploadedByName: names.get(d.uploadedById) ?? "",
                createdAt: d.createdAt.toISOString(),
              })),
              members: c.members.map((m) => ({
                id: m.user.id,
                name: m.user.name,
                role: m.user.role.key,
              })),
              events: c.events.map((e) => ({
                id: e.id,
                type: e.type,
                actorName: e.actorId ? (names.get(e.actorId) ?? null) : null,
                data: e.data,
                createdAt: e.createdAt.toISOString(),
              })),
              workflow: {
                versionId: version.id,
                version: version.version,
                isLatest: latest?.id === version.id,
                step: c.step,
                stepName: step?.name ?? { en: c.step },
                stepEnteredAt: c.stepEnteredAt.toISOString(),
                slaDueAt: slaDeadline(graph, c.step, c.stepEnteredAt)?.toISOString() ?? null,
                graph,
              },
              allowed: {
                transitions: actions.map((a) => ({
                  id: a.transition.id,
                  label: a.transition.label,
                  to: a.to.id,
                  toName: a.to.name,
                  toCategory: a.to.category,
                  requireReason: a.transition.requireReason,
                  requireSar: a.transition.requireSar,
                  blocked: a.blocked,
                })),
                edit: isMember && open,
                comment: isMember,
                manageMembers: can(p, "cases.approve"),
                isMember,
              },
            };
          }),
        );
      }),

    create: (p: Principal, input: CaseCreate) =>
      repo
        .branchByCode(input.branchCode)
        .andThen((b) =>
          b && p.regionIds.includes(b.regionId)
            ? okAsync(b)
            : errAsync(
                appError.validation("Branch is outside your regions", [
                  { path: ["branchCode"], message: "errors.branchRegion" },
                ]),
              ),
        )
        .andThen((b) =>
          ResultAsync.combine([
            repo.alertsByCodes(scopeOf(p), input.alertCodes),
            repo.customersByCodes(
              input.parties.map((x) => x.customerCode).filter((x): x is string => Boolean(x)),
            ),
          ] as const).map(([alerts, customers]) => ({ b, alerts, customers })),
        )
        .andThen((x) =>
          repo.publishedWorkflow("case").andThen((wf) => {
            const start = wf ? startStep(workflowGraphSchema.parse(wf.graph)) : undefined;
            return wf && start
              ? okAsync({
                  ...x,
                  workflow: { versionId: wf.id, step: start.id, category: start.category },
                })
              : errAsync(appError.unexpected("No published case workflow"));
          }),
        )
        .andThen(({ b, alerts, customers, workflow }) =>
          repo.create(input, {
            workflow,
            branchId: b.id,
            userId: p.userId,
            alertIds: alerts.map((a) => a.id),
            // The case is as confidential as its most confidential alert or subject.
            clearanceRank: Math.min(
              p.clearanceRank,
              Math.max(
                1,
                ...alerts.map((a) => a.clearanceRank),
                ...customers.map((c) => c.clearanceRank),
              ),
            ),
            customerIds: new Map(customers.map((c) => [c.code, c.id])),
          }),
        )
        .map((c) => ({ code: c.code })),

    update: (p: Principal, code: string, input: CaseUpdate) =>
      load(p, code)
        .andThen(({ c, isMember }) =>
          isMember && (c.status === "OPEN" || c.status === "DRAFT")
            ? okAsync(c)
            : errAsync(appError.forbidden("Only members can edit an open case")),
        )
        .andThen((c) => repo.update(c.id, input, p.userId))
        .map((c) => {
          notify.toCase(c.id, "case:updated", { code: c.code });
          return { code: c.code };
        }),

    /** The engine decides again on the server; the buttons in the UI are only a hint. */
    transition: (p: Principal, code: string, input: CaseTransition) =>
      load(p, code)
        .andThen(({ c, isMember }) => {
          if (!c.workflowVersion)
            return errAsync(appError.unexpected("Case has no workflow version"));
          const graph = workflowGraphSchema.parse(c.workflowVersion.graph);
          const action = availableTransitions(graph, caseFacts(c), {
            userId: p.userId,
            role: p.role,
            isMember,
          }).find((a) => a.transition.id === input.transitionId);
          if (!action)
            return errAsync(
              appError.forbidden("This action is not available for you at this step"),
            );
          if (action.blocked === "fourEyes")
            return errAsync(
              appError.forbidden(
                "Four-eyes rule: you opened this case, so someone else must take this step",
              ),
            );
          if (action.blocked === "findings")
            return errAsync(appError.forbidden("Add findings and a recommendation first"));
          if (action.transition.requireReason && !input.note)
            return errAsync(
              appError.validation("A reason is required", [
                { path: ["note"], message: "errors.required" },
              ]),
            );
          if (action.transition.requireSar && !input.sarReference)
            return errAsync(
              appError.validation("SAR reference is required", [
                { path: ["sarReference"], message: "errors.required" },
              ]),
            );
          const move = {
            fromStep: c.step,
            toStep: action.to.id,
            from: c.status,
            to: action.to.category,
            transitionId: action.transition.id,
          };
          return repo
            .transition(c.id, move, p.userId, input)
            .map((updated) => ({ updated, roles: action.to.roles }));
        })
        .map(({ updated, roles }) => {
          notify.toCase(updated.id, "case:updated", { code: updated.code, status: updated.status });
          // Whoever works at the next step hears about it (the same engine fills their inbox).
          roles.forEach((role) =>
            notify.toRole(role, "notification", {
              type: "case_step",
              code: updated.code,
              step: updated.step,
            }),
          );
          return { code: updated.code, status: updated.status };
        }),

    eligibleMembers: (p: Principal, code: string) =>
      load(p, code).andThen(({ c }) =>
        repo
          .branchRegion(c.branchId)
          .andThen((regionId) => repo.eligibleUsers(regionId, c.clearanceRank))
          .map((us) => us.map((u) => ({ id: u.id, name: u.name, role: u.role.key }))),
      ),

    addMember: (p: Principal, code: string, userId: string) =>
      load(p, code)
        .andThen(({ c }) =>
          repo
            .branchRegion(c.branchId)
            .andThen((regionId) => repo.eligibleUsers(regionId, c.clearanceRank))
            .map((us) => ({ c, us })),
        )
        .andThen(({ c, us }) =>
          us.some((u) => u.id === userId)
            ? repo.addMember(c.id, userId, p.userId).map(() => c)
            : errAsync(appError.validation("User cannot access this case")),
        )
        .map((c) => {
          notify.toUser(userId, "notification", { type: "case_assigned", code: c.code });
          notify.toCase(c.id, "case:updated", { code: c.code });
          return { ok: true };
        }),

    removeMember: (p: Principal, code: string, userId: string) =>
      load(p, code)
        .andThen(({ c }) =>
          c.createdById === userId
            ? errAsync(appError.conflict("The preparer stays a member"))
            : repo.removeMember(c.id, userId, p.userId).map(() => c),
        )
        .map(() => ({ ok: true })),

    comments: (p: Principal, code: string) =>
      loadAsMember(p, code)
        .andThen(({ c }) => repo.comments(c.id))
        .map((cs) => cs.map(toComment)),

    addComment: (p: Principal, code: string, input: CommentInput & { documentIds?: string[] }) =>
      loadAsMember(p, code)
        .andThen(({ c }) => {
          // Mentions can only point at case members; others are dropped.
          const memberIds = new Set(c.members.map((m) => m.user.id));
          const mentions = [...new Set(input.mentions)].filter(
            (id) => memberIds.has(id) && id !== p.userId,
          );
          return repo
            .addComment({
              caseId: c.id,
              authorId: p.userId,
              body: input.body,
              parentId: input.parentId,
              mentions,
              documentIds: input.documentIds ?? [],
            })
            .map((cm) => ({ c, cm, mentions }));
        })
        .map(({ c, cm, mentions }) => {
          const comment = toComment(cm);
          notify.toCase(c.id, "case:comment", comment);
          mentions.forEach((id) =>
            notify.toUser(id, "notification", { type: "mention", code: c.code, by: p.name }),
          );
          return comment;
        }),

    editComment: (p: Principal, code: string, commentId: string, body: string) =>
      loadAsMember(p, code)
        .andThen(({ c }) => repo.comment(commentId).map((cm) => ({ c, cm })))
        .andThen(({ c, cm }) => {
          if (!cm || cm.caseId !== c.id) return errAsync(appError.notFound("Comment not found"));
          if (cm.authorId !== p.userId)
            return errAsync(appError.forbidden("You can only edit your own comments"));
          return repo.editComment(cm.id, body, cm.body).map((edited) => ({ c, edited }));
        })
        .map(({ c, edited }) => {
          const comment = toComment(edited);
          notify.toCase(c.id, "case:comment", comment);
          return comment;
        }),

    deleteComment: (p: Principal, code: string, commentId: string) =>
      loadAsMember(p, code)
        .andThen(({ c }) => repo.comment(commentId).map((cm) => ({ c, cm })))
        .andThen(({ c, cm }) =>
          cm && cm.caseId === c.id && cm.authorId === p.userId
            ? repo.deleteComment(cm.id).map(() => c)
            : errAsync(appError.forbidden("You can only delete your own comments")),
        )
        .map((c) => {
          notify.toCase(c.id, "case:updated", { code: c.code });
          return { ok: true };
        }),

    note: (p: Principal, code: string) =>
      loadAsMember(p, code)
        .andThen(({ c }) => repo.note(c.id, p.userId))
        .map((n) => ({ body: n?.body ?? "", updatedAt: n?.updatedAt.toISOString() ?? null })),
    saveNote: (p: Principal, code: string, body: string) =>
      loadAsMember(p, code)
        .andThen(({ c }) => repo.saveNote(c.id, p.userId, body))
        .map((n) => ({ body: n.body, updatedAt: n.updatedAt.toISOString() })),

    addDocument: (
      p: Principal,
      code: string,
      file: { name: string; mimeType: string; size: number; storageKey: string },
    ) =>
      load(p, code)
        .andThen(({ c, isMember }) =>
          isMember
            ? okAsync(c)
            : errAsync(appError.forbidden("Only case members can add documents")),
        )
        .andThen((c) =>
          repo
            .addDocument({ caseId: c.id, uploadedById: p.userId, ...file })
            .map((d) => ({ c, d })),
        )
        .map(({ c, d }) => {
          notify.toCase(c.id, "case:updated", { code: c.code });
          return { id: d.id, name: d.name, size: d.size };
        }),

    document: (p: Principal, code: string, id: string) =>
      load(p, code)
        .andThen(({ c }) => repo.document(id).map((d) => ({ c, d })))
        .andThen(({ c, d }) =>
          d && d.caseId === c.id ? okAsync(d) : errAsync(appError.notFound("Document not found")),
        ),

    caseId: (p: Principal, code: string) =>
      load(p, code).map(({ c, isMember }) => ({ id: c.id, isMember })),
  };
};

export type CasesService = ReturnType<typeof createCasesService>;
