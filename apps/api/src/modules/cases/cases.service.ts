import { errAsync, okAsync, ResultAsync } from "neverthrow";
import type { CaseBoard, CaseCreate, CaseDetail, CaseRow, CaseTransition, CaseUpdate, Comment, CommentInput, GridQuery } from "@aml/shared";
import { can, scopeOf, type Principal } from "../../shared/access";
import { appError } from "../../shared/errors";
import { toAlertRow } from "../../shared/mappers";
import { allowedTransitions, transitionError } from "./case-policy";
import type { CasesRepository } from "./cases.repository";

/** Side channel for live updates (Socket.IO in production, a no-op in tests). */
export type Notifier = {
  toCase: (caseId: string, event: string, payload: unknown) => void;
  toUser: (userId: string, event: string, payload: unknown) => void;
  toRole: (role: string, event: string, payload: unknown) => void;
};

type RowSource = {
  id: string; code: string; title: string; status: CaseRow["status"]; priority: CaseRow["priority"]; riskLevel: CaseRow["riskLevel"]; typology: string;
  totalAmount: { toFixed: (n: number) => string } | null; dueAt: Date; createdAt: Date; updatedAt: Date;
  branch: { city: string }; createdBy: { name: string }; parties: Array<{ name: string }>; _count: { alerts: number };
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
  id: string; parentId: string | null; body: string; mentions: string[]; createdAt: Date; editedAt: Date | null; deletedAt: Date | null;
  author: { id: string; name: string; role: { key: string } }; edits: Array<{ body: string; editedAt: Date }>; documents: Array<{ id: string; name: string; size: number }>;
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
  edits: c.deletedAt ? [] : c.edits.map((e) => ({ body: e.body, editedAt: e.editedAt.toISOString() })),
  attachments: c.deletedAt ? [] : c.documents.map((d) => ({ id: d.id, name: d.name, size: d.size })),
});

const notFound = () => appError.notFound("Case not found");

export const createCasesService = ({ repo, notify }: { repo: CasesRepository; notify: Notifier }) => {
  /** Case in scope (layers 1-3) plus whether the user is a member (layer 4). */
  const load = (p: Principal, code: string) =>
    repo.detail(scopeOf(p), code).andThen((c) => (c ? repo.isMember(c.id, p.userId).map((isMember) => ({ c, isMember })) : errAsync(notFound())));

  /** Layer 4: comments and private notes need case membership. */
  const loadAsMember = (p: Principal, code: string) =>
    load(p, code).andThen((x) => (x.isMember ? okAsync(x) : errAsync(appError.forbidden("Only case members can see comments and notes"))));

  return {
    list: (p: Principal, q: GridQuery) => repo.query(scopeOf(p), q, p.userId).map(([rows, rowCount]) => ({ rows: rows.map(toCaseRow), rowCount })),

    board: (p: Principal, filters: GridQuery["filters"]) =>
      repo.board(scopeOf(p), filters, p.userId).map((cols): CaseBoard => ({ columns: cols.map((col) => ({ ...col, cases: col.cases.map(toCaseRow) })) })),

    detail: (p: Principal, code: string) =>
      load(p, code).andThen(({ c, isMember }) => {
        const actorIds = [...new Set(c.events.map((e) => e.actorId).filter((x): x is string => Boolean(x)))];
        return repo.userNames(actorIds).map((users): CaseDetail => {
          const names = new Map(users.map((u) => [u.id, u.name]));
          const facts = { status: c.status, createdById: c.createdById, recommendation: c.recommendation, hasFindings: Boolean(c.findings?.trim()) };
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
              id: x.id, name: x.name, type: x.type, role: x.role, country: x.country, customerCode: x.customer?.code ?? null, notes: x.notes,
              accounts: x.accounts.map((a) => ({ iban: a.iban, bankName: a.bankName, currency: a.currency })),
            })),
            documents: c.documents.map((d) => ({ id: d.id, name: d.name, mimeType: d.mimeType, size: d.size, uploadedByName: names.get(d.uploadedById) ?? "", createdAt: d.createdAt.toISOString() })),
            members: c.members.map((m) => ({ id: m.user.id, name: m.user.name, role: m.user.role.key })),
            events: c.events.map((e) => ({ id: e.id, type: e.type, actorName: e.actorId ? (names.get(e.actorId) ?? null) : null, data: e.data, createdAt: e.createdAt.toISOString() })),
            allowed: {
              transitions: allowedTransitions(facts, p, isMember),
              edit: isMember && open,
              comment: isMember,
              manageMembers: can(p, "cases.approve"),
              isMember,
            },
          };
        });
      }),

    create: (p: Principal, input: CaseCreate) =>
      repo
        .branchByCode(input.branchCode)
        .andThen((b) => (b && p.regionIds.includes(b.regionId) ? okAsync(b) : errAsync(appError.validation("Branch is outside your regions", [{ path: ["branchCode"], message: "errors.branchRegion" }]))))
        .andThen((b) =>
          ResultAsync.combine([
            repo.alertsByCodes(scopeOf(p), input.alertCodes),
            repo.customersByCodes(input.parties.map((x) => x.customerCode).filter((x): x is string => Boolean(x))),
          ] as const).map(([alerts, customers]) => ({ b, alerts, customers })),
        )
        .andThen(({ b, alerts, customers }) =>
          repo.create(input, {
            branchId: b.id,
            userId: p.userId,
            alertIds: alerts.map((a) => a.id),
            // The case is as confidential as its most confidential alert or subject.
            clearanceRank: Math.min(p.clearanceRank, Math.max(1, ...alerts.map((a) => a.clearanceRank), ...customers.map((c) => c.clearanceRank))),
            customerIds: new Map(customers.map((c) => [c.code, c.id])),
          }),
        )
        .map((c) => ({ code: c.code })),

    update: (p: Principal, code: string, input: CaseUpdate) =>
      load(p, code)
        .andThen(({ c, isMember }) => (isMember && (c.status === "OPEN" || c.status === "DRAFT") ? okAsync(c) : errAsync(appError.forbidden("Only members can edit an open case"))))
        .andThen((c) => repo.update(c.id, input, p.userId))
        .map((c) => {
          notify.toCase(c.id, "case:updated", { code: c.code });
          return { code: c.code };
        }),

    transition: (p: Principal, code: string, input: CaseTransition) =>
      load(p, code)
        .andThen(({ c, isMember }) => {
          const facts = { status: c.status, createdById: c.createdById, recommendation: c.recommendation, hasFindings: Boolean(c.findings?.trim()) };
          const error = transitionError(facts, p, input.to, isMember);
          if (error) return errAsync(appError.forbidden(error));
          if (input.to === "REPORTED" && !input.sarReference) return errAsync(appError.validation("SAR reference is required", [{ path: ["sarReference"], message: "errors.required" }]));
          return okAsync(c);
        })
        .andThen((c) => repo.transition(c.id, c.status, input.to, p.userId, input))
        .map((c) => {
          notify.toCase(c.id, "case:updated", { code: c.code, status: c.status });
          if (c.status === "PENDING_APPROVAL") notify.toRole("SUPERVISOR", "notification", { type: "case_awaiting_approval", code: c.code });
          return { code: c.code, status: c.status };
        }),

    eligibleMembers: (p: Principal, code: string) =>
      load(p, code).andThen(({ c }) =>
        repo.branchRegion(c.branchId).andThen((regionId) => repo.eligibleUsers(regionId, c.clearanceRank)).map((us) => us.map((u) => ({ id: u.id, name: u.name, role: u.role.key }))),
      ),

    addMember: (p: Principal, code: string, userId: string) =>
      load(p, code)
        .andThen(({ c }) => repo.branchRegion(c.branchId).andThen((regionId) => repo.eligibleUsers(regionId, c.clearanceRank)).map((us) => ({ c, us })))
        .andThen(({ c, us }) => (us.some((u) => u.id === userId) ? repo.addMember(c.id, userId, p.userId).map(() => c) : errAsync(appError.validation("User cannot access this case"))))
        .map((c) => {
          notify.toUser(userId, "notification", { type: "case_assigned", code: c.code });
          notify.toCase(c.id, "case:updated", { code: c.code });
          return { ok: true };
        }),

    removeMember: (p: Principal, code: string, userId: string) =>
      load(p, code)
        .andThen(({ c }) => (c.createdById === userId ? errAsync(appError.conflict("The preparer stays a member")) : repo.removeMember(c.id, userId, p.userId).map(() => c)))
        .map(() => ({ ok: true })),

    comments: (p: Principal, code: string) => loadAsMember(p, code).andThen(({ c }) => repo.comments(c.id)).map((cs) => cs.map(toComment)),

    addComment: (p: Principal, code: string, input: CommentInput & { documentIds?: string[] }) =>
      loadAsMember(p, code)
        .andThen(({ c }) => {
          // Mentions can only point at case members; others are dropped.
          const memberIds = new Set(c.members.map((m) => m.user.id));
          const mentions = [...new Set(input.mentions)].filter((id) => memberIds.has(id) && id !== p.userId);
          return repo.addComment({ caseId: c.id, authorId: p.userId, body: input.body, parentId: input.parentId, mentions, documentIds: input.documentIds ?? [] }).map((cm) => ({ c, cm, mentions }));
        })
        .map(({ c, cm, mentions }) => {
          const comment = toComment(cm);
          notify.toCase(c.id, "case:comment", comment);
          mentions.forEach((id) => notify.toUser(id, "notification", { type: "mention", code: c.code, by: p.name }));
          return comment;
        }),

    editComment: (p: Principal, code: string, commentId: string, body: string) =>
      loadAsMember(p, code)
        .andThen(({ c }) => repo.comment(commentId).map((cm) => ({ c, cm })))
        .andThen(({ c, cm }) => {
          if (!cm || cm.caseId !== c.id) return errAsync(appError.notFound("Comment not found"));
          if (cm.authorId !== p.userId) return errAsync(appError.forbidden("You can only edit your own comments"));
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
        .andThen(({ c, cm }) => (cm && cm.caseId === c.id && cm.authorId === p.userId ? repo.deleteComment(cm.id).map(() => c) : errAsync(appError.forbidden("You can only delete your own comments"))))
        .map((c) => {
          notify.toCase(c.id, "case:updated", { code: c.code });
          return { ok: true };
        }),

    note: (p: Principal, code: string) => loadAsMember(p, code).andThen(({ c }) => repo.note(c.id, p.userId)).map((n) => ({ body: n?.body ?? "", updatedAt: n?.updatedAt.toISOString() ?? null })),
    saveNote: (p: Principal, code: string, body: string) =>
      loadAsMember(p, code).andThen(({ c }) => repo.saveNote(c.id, p.userId, body)).map((n) => ({ body: n.body, updatedAt: n.updatedAt.toISOString() })),

    addDocument: (p: Principal, code: string, file: { name: string; mimeType: string; size: number; storageKey: string }) =>
      load(p, code)
        .andThen(({ c, isMember }) => (isMember ? okAsync(c) : errAsync(appError.forbidden("Only case members can add documents"))))
        .andThen((c) => repo.addDocument({ caseId: c.id, uploadedById: p.userId, ...file }).map((d) => ({ c, d })))
        .map(({ c, d }) => {
          notify.toCase(c.id, "case:updated", { code: c.code });
          return { id: d.id, name: d.name, size: d.size };
        }),

    document: (p: Principal, code: string, id: string) =>
      load(p, code)
        .andThen(({ c }) => repo.document(id).map((d) => ({ c, d })))
        .andThen(({ c, d }) => (d && d.caseId === c.id ? okAsync(d) : errAsync(appError.notFound("Document not found")))),

    caseId: (p: Principal, code: string) => load(p, code).map(({ c, isMember }) => ({ id: c.id, isMember })),
  };
};

export type CasesService = ReturnType<typeof createCasesService>;
