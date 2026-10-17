import { Router, type RequestHandler } from "express";
import { ResultAsync } from "neverthrow";
import { alertSlaHours, availableTransitions, slaDeadline, stepOf, workflowGraphSchema, type MyWork } from "@aml/shared";
import type { Db } from "../../db/prisma";
import { principalOf, scopeOf, type AccessScope, type Principal } from "../../shared/access";
import { appError } from "../../shared/errors";
import { handle } from "../../shared/http";
import { alertRowInclude, toAlertRow } from "../../shared/mappers";
import { caseRowInclude, caseScope } from "../cases/cases.repository";
import { caseFacts, toCaseRow } from "../cases/cases.service";

const dbError = (cause: unknown) => appError.unexpected("Database error", cause);
const DAY = 86_400_000;

// Repository
export const createMyWorkRepository = (db: Db) => ({
  alerts: (s: AccessScope, userId: string) =>
    ResultAsync.fromPromise(
      db.$transaction([
        db.alert.findMany({
          where: { assigneeId: userId, status: { in: ["NEW", "IN_REVIEW"] }, branch: { regionId: { in: s.regionIds } }, clearanceRank: { lte: s.clearanceRank } },
          include: alertRowInclude,
          orderBy: { createdAt: "asc" },
          take: 60,
        }),
        db.alert.count({ where: { assigneeId: userId, status: { in: ["NEW", "IN_REVIEW"] }, branch: { regionId: { in: s.regionIds } }, clearanceRank: { lte: s.clearanceRank } } }),
      ]),
      dbError,
    ),
  openCases: (s: AccessScope, userId: string) =>
    ResultAsync.fromPromise(
      db.case.findMany({
        where: { AND: [caseScope(s), { status: { in: ["OPEN", "PENDING_APPROVAL", "APPROVED"] } }] },
        include: { ...caseRowInclude, workflowVersion: { select: { graph: true } }, members: { where: { userId }, select: { userId: true } } },
      }),
      dbError,
    ),
  mentions: (s: AccessScope, userId: string) =>
    ResultAsync.fromPromise(
      db.caseComment.findMany({
        where: { mentions: { has: userId }, deletedAt: null, createdAt: { gte: new Date(Date.now() - 90 * DAY) }, case: caseScope(s) },
        include: { author: { select: { name: true } }, case: { select: { code: true, title: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      dbError,
    ),
});

// Service: the same workflow engine as the case page decides what lands in the inbox.
export const createMyWorkService = ({ repo }: { repo: ReturnType<typeof createMyWorkRepository> }) => ({
  get: (p: Principal) => {
    const s = scopeOf(p);
    return ResultAsync.combine([repo.alerts(s, p.userId), repo.openCases(s, p.userId), repo.mentions(s, p.userId)] as const).map(([[alerts, alertsTotal], cases, mentions]): MyWork => ({
      alerts: alerts
        .map((a) => ({ ...toAlertRow(a), slaDueAt: new Date(a.createdAt.getTime() + alertSlaHours[a.riskLevel] * 3_600_000).toISOString() }))
        .sort((a, b) => a.slaDueAt.localeCompare(b.slaDueAt)),
      alertsTotal,
      cases: cases
        .flatMap((c) => {
          if (!c.workflowVersion) return [];
          const graph = workflowGraphSchema.parse(c.workflowVersion.graph);
          // Four-eyes blocks are someone else's work; missing findings are still this user's job.
          const actions = availableTransitions(graph, caseFacts(c), { userId: p.userId, role: p.role, isMember: c.members.length > 0 }).filter((a) => a.blocked !== "fourEyes");
          if (!actions.length) return [];
          return [{
            ...toCaseRow(c),
            stepName: stepOf(graph, c.step)?.name ?? { en: c.step },
            slaDueAt: slaDeadline(graph, c.step, c.stepEnteredAt)?.toISOString() ?? null,
            actions: actions.map((a) => ({ id: a.transition.id, label: a.transition.label, blocked: a.blocked })),
          }];
        })
        .sort((a, b) => (a.slaDueAt ?? "9").localeCompare(b.slaDueAt ?? "9")),
      mentions: mentions.map((m) => ({ id: m.id, caseCode: m.case.code, caseTitle: m.case.title, authorName: m.author.name, body: m.body.slice(0, 220), createdAt: m.createdAt.toISOString() })),
    }));
  },
});

// Routes
export const createMyWorkModule = ({ db, requireAuth }: { db: Db; requireAuth: RequestHandler }) => {
  const service = createMyWorkService({ repo: createMyWorkRepository(db) });
  return Router().use(requireAuth).get("/", handle((_req, res) => service.get(principalOf(res))));
};
