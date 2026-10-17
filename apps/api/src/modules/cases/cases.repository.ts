import { ResultAsync } from "neverthrow";
import type { CaseCreate, CaseStatus, CaseUpdate, GridQuery } from "@aml/shared";
import type { Db } from "../../db/prisma";
import { Prisma } from "../../generated/prisma/client";
import type { AccessScope } from "../../shared/access";
import { appError } from "../../shared/errors";
import { alertRowInclude, listFilter } from "../../shared/mappers";

const dbError = (cause: unknown) => appError.unexpected("Database error", cause);

export const caseScope = (s: AccessScope): Prisma.CaseWhereInput => ({
  branch: { regionId: { in: s.regionIds } },
  clearanceRank: { lte: s.clearanceRank },
});

export const caseRowInclude = {
  branch: { select: { city: true } },
  createdBy: { select: { name: true } },
  parties: { where: { role: "SUBJECT" }, select: { name: true }, take: 1 },
  _count: { select: { alerts: true } },
} satisfies Prisma.CaseInclude;

const sortable: Record<string, (d: Prisma.SortOrder) => Prisma.CaseOrderByWithRelationInput> = {
  code: (d) => ({ code: d }),
  title: (d) => ({ title: d }),
  status: (d) => ({ status: d }),
  priority: (d) => ({ priority: d }),
  riskLevel: (d) => ({ riskLevel: d }),
  dueAt: (d) => ({ dueAt: d }),
  createdAt: (d) => ({ createdAt: d }),
  updatedAt: (d) => ({ updatedAt: d }),
  totalAmount: (d) => ({ totalAmount: d }),
};

export const caseFilterWhere = (f: GridQuery["filters"], userId: string): Prisma.CaseWhereInput => {
  const status = listFilter(f.status) as CaseStatus[] | undefined;
  const priority = listFilter(f.priority) as Array<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL"> | undefined;
  const search = typeof f.search === "string" ? f.search.trim() : "";
  return {
    ...(status ? { status: { in: status } } : {}),
    ...(priority ? { priority: { in: priority } } : {}),
    ...(f.mine === "true" ? { OR: [{ createdById: userId }, { members: { some: { userId } } }] } : {}),
    ...(search ? { AND: [{ OR: [{ code: { contains: search, mode: "insensitive" } }, { title: { contains: search, mode: "insensitive" } }] }] } : {}),
  };
};

const detailInclude = {
  ...caseRowInclude,
  parties: { include: { accounts: true, customer: { select: { code: true } } } },
  approvedBy: { select: { name: true } },
  alerts: { include: alertRowInclude, orderBy: { createdAt: "desc" } },
  documents: { where: { commentId: null }, orderBy: { createdAt: "desc" } },
  members: { include: { user: { select: { id: true, name: true, role: { select: { key: true } } } } } },
  events: { orderBy: { createdAt: "desc" }, take: 50 },
} satisfies Prisma.CaseInclude;

export const createCasesRepository = (db: Db) => ({
  query: (s: AccessScope, q: GridQuery, userId: string) => {
    const where: Prisma.CaseWhereInput = { AND: [caseScope(s), caseFilterWhere(q.filters, userId)] };
    const orderBy = q.sortModel.filter((x) => sortable[x.colId]).map((x) => sortable[x.colId]!(x.sort));
    return ResultAsync.fromPromise(
      db.$transaction([
        db.case.findMany({
          where,
          include: caseRowInclude,
          orderBy: orderBy.length ? [...orderBy, { id: "asc" }] : [{ updatedAt: "desc" }, { id: "asc" }],
          skip: q.startRow,
          take: Math.min(q.endRow - q.startRow, 500),
        }),
        db.case.count({ where }),
      ]),
      dbError,
    );
  },

  board: (s: AccessScope, filters: GridQuery["filters"], userId: string) =>
    ResultAsync.fromPromise(
      Promise.all(
        (["OPEN", "PENDING_APPROVAL", "APPROVED", "REPORTED", "CLOSED"] as const).map(async (status) => {
          const where: Prisma.CaseWhereInput = { AND: [caseScope(s), caseFilterWhere(filters, userId), { status }] };
          const [count, cases] = await Promise.all([
            db.case.count({ where }),
            db.case.findMany({ where, include: caseRowInclude, orderBy: [{ priority: "desc" }, { dueAt: "asc" }], take: 20 }),
          ]);
          return { status, count, cases };
        }),
      ),
      dbError,
    ),

  detail: (s: AccessScope, code: string) =>
    ResultAsync.fromPromise(db.case.findFirst({ where: { AND: [caseScope(s), { OR: [{ code }, { id: code }] }] }, include: detailInclude }), dbError),

  userNames: (ids: string[]) =>
    ResultAsync.fromPromise(db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }), dbError),

  branchByCode: (code: string) => ResultAsync.fromPromise(db.branch.findUnique({ where: { code } }), dbError),

  alertsByCodes: (s: AccessScope, codes: string[]) =>
    ResultAsync.fromPromise(
      db.alert.findMany({ where: { code: { in: codes }, branch: { regionId: { in: s.regionIds } }, clearanceRank: { lte: s.clearanceRank } } }),
      dbError,
    ),

  customersByCodes: (codes: string[]) =>
    ResultAsync.fromPromise(db.customer.findMany({ where: { code: { in: codes } }, select: { id: true, code: true, clearanceRank: true } }), dbError),

  create: (input: CaseCreate, data: { branchId: string; userId: string; alertIds: string[]; clearanceRank: number; customerIds: Map<string, string> }) =>
    ResultAsync.fromPromise(
      db.$transaction(async (tx) => {
        const last = await tx.case.findFirst({ orderBy: { code: "desc" }, select: { code: true } });
        const code = `CS-${Number(last?.code.replace("CS-", "") ?? 1000) + 1}`;
        const created = await tx.case.create({
          data: {
            code,
            title: input.title,
            typology: input.typology,
            priority: input.priority,
            riskLevel: input.riskLevel,
            summary: input.summary,
            totalAmount: new Prisma.Decimal(input.totalAmount),
            periodStart: new Date(input.periodStart),
            periodEnd: new Date(input.periodEnd),
            dueAt: new Date(input.dueAt),
            clearanceRank: data.clearanceRank,
            branchId: data.branchId,
            createdById: data.userId,
            members: { create: { userId: data.userId, addedById: data.userId } },
            parties: {
              create: input.parties.map((p) => ({
                name: p.name,
                type: p.type,
                role: p.role,
                country: p.country,
                notes: p.notes || null,
                customerId: p.customerCode ? (data.customerIds.get(p.customerCode) ?? null) : null,
                accounts: { create: p.accounts.map((a) => ({ iban: a.iban.replace(/\s+/g, "").toUpperCase(), bankName: a.bankName, currency: a.currency })) },
              })),
            },
            events: { create: { type: "created", actorId: data.userId } },
          },
        });
        if (data.alertIds.length) await tx.alert.updateMany({ where: { id: { in: data.alertIds } }, data: { caseId: created.id } });
        await tx.auditLog.create({ data: { userId: data.userId, action: "case.create", entity: "case", entityId: created.id } });
        return created;
      }),
      dbError,
    ),

  update: (id: string, input: CaseUpdate, userId: string) =>
    ResultAsync.fromPromise(
      db.$transaction(async (tx) => {
        const c = await tx.case.update({ where: { id }, data: input });
        await tx.caseEvent.create({ data: { caseId: id, actorId: userId, type: "updated", data: Object.keys(input) } });
        return c;
      }),
      dbError,
    ),

  transition: (id: string, from: CaseStatus, to: CaseStatus, userId: string, extra: { note?: string; sarReference?: string }) =>
    ResultAsync.fromPromise(
      db.$transaction(async (tx) => {
        const now = new Date();
        const stamps: Prisma.CaseUpdateInput =
          to === "PENDING_APPROVAL" ? { submittedAt: now }
          : to === "APPROVED" ? { approvedAt: now, approvedBy: { connect: { id: userId } } }
          : to === "REPORTED" ? { reportedAt: now, sarReference: extra.sarReference ?? null }
          : to === "CLOSED" ? { closedAt: now }
          : {};
        const c = await tx.case.update({ where: { id }, data: { status: to, ...stamps } });
        await tx.caseEvent.create({ data: { caseId: id, actorId: userId, type: "status_changed", data: { from, to, note: extra.note ?? null } } });
        await tx.auditLog.create({ data: { userId, action: "case.transition", entity: "case", entityId: id, data: { from, to } } });
        return c;
      }),
      dbError,
    ),

  isMember: (caseId: string, userId: string) =>
    ResultAsync.fromPromise(db.caseMember.count({ where: { caseId, userId } }), dbError).map((n) => n > 0),

  addMember: (caseId: string, userId: string, addedById: string) =>
    ResultAsync.fromPromise(
      db.$transaction([
        db.caseMember.upsert({ where: { caseId_userId: { caseId, userId } }, create: { caseId, userId, addedById }, update: {} }),
        db.caseEvent.create({ data: { caseId, actorId: addedById, type: "member_added", data: { userId } } }),
      ]),
      dbError,
    ),

  removeMember: (caseId: string, userId: string, actorId: string) =>
    ResultAsync.fromPromise(
      db.$transaction([
        db.caseMember.deleteMany({ where: { caseId, userId } }),
        db.caseEvent.create({ data: { caseId, actorId, type: "member_removed", data: { userId } } }),
      ]),
      dbError,
    ),

  /** Users who may join a case: their regions include the case branch and their clearance is high enough. */
  eligibleUsers: (branchRegionId: string, clearanceRank: number) =>
    ResultAsync.fromPromise(
      db.user.findMany({
        where: { clearanceRank: { gte: clearanceRank }, regions: { some: { regionId: branchRegionId } } },
        select: { id: true, name: true, role: { select: { key: true } } },
        orderBy: { name: "asc" },
      }),
      dbError,
    ),

  branchRegion: (branchId: string) => ResultAsync.fromPromise(db.branch.findUniqueOrThrow({ where: { id: branchId } }), dbError).map((b) => b.regionId),

  // comments
  comments: (caseId: string) =>
    ResultAsync.fromPromise(
      db.caseComment.findMany({
        where: { caseId },
        include: { author: { select: { id: true, name: true, role: { select: { key: true } } } }, edits: { orderBy: { editedAt: "desc" } }, documents: true },
        orderBy: { createdAt: "asc" },
      }),
      dbError,
    ),

  comment: (id: string) => ResultAsync.fromPromise(db.caseComment.findUnique({ where: { id } }), dbError),

  addComment: (data: { caseId: string; authorId: string; body: string; parentId?: string; mentions: string[]; documentIds: string[] }) =>
    ResultAsync.fromPromise(
      db.$transaction(async (tx) => {
        const c = await tx.caseComment.create({
          data: { caseId: data.caseId, authorId: data.authorId, body: data.body, parentId: data.parentId ?? null, mentions: data.mentions },
          include: { author: { select: { id: true, name: true, role: { select: { key: true } } } }, edits: true, documents: true },
        });
        if (data.documentIds.length) await tx.caseDocument.updateMany({ where: { id: { in: data.documentIds }, caseId: data.caseId }, data: { commentId: c.id } });
        await tx.caseEvent.create({ data: { caseId: data.caseId, actorId: data.authorId, type: "comment_added", data: { commentId: c.id } } });
        return c;
      }),
      dbError,
    ),

  editComment: (id: string, body: string, previous: string) =>
    ResultAsync.fromPromise(
      db.caseComment.update({
        where: { id },
        data: { body, editedAt: new Date(), edits: { create: { body: previous } } },
        include: { author: { select: { id: true, name: true, role: { select: { key: true } } } }, edits: { orderBy: { editedAt: "desc" } }, documents: true },
      }),
      dbError,
    ),

  deleteComment: (id: string) => ResultAsync.fromPromise(db.caseComment.update({ where: { id }, data: { deletedAt: new Date() } }), dbError),

  // private notes
  note: (caseId: string, authorId: string) =>
    ResultAsync.fromPromise(db.privateNote.findUnique({ where: { caseId_authorId: { caseId, authorId } } }), dbError),
  saveNote: (caseId: string, authorId: string, body: string) =>
    ResultAsync.fromPromise(
      db.privateNote.upsert({ where: { caseId_authorId: { caseId, authorId } }, create: { caseId, authorId, body }, update: { body } }),
      dbError,
    ),

  // documents
  addDocument: (data: { caseId: string; name: string; mimeType: string; size: number; storageKey: string; uploadedById: string }) =>
    ResultAsync.fromPromise(
      db.$transaction(async (tx) => {
        const d = await tx.caseDocument.create({ data });
        await tx.caseEvent.create({ data: { caseId: data.caseId, actorId: data.uploadedById, type: "document_added", data: { name: data.name } } });
        return d;
      }),
      dbError,
    ),
  document: (id: string) => ResultAsync.fromPromise(db.caseDocument.findUnique({ where: { id } }), dbError),
});

export type CasesRepository = ReturnType<typeof createCasesRepository>;
