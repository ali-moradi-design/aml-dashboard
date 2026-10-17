import { errAsync, okAsync } from "neverthrow";
import type { AlertDecision, AlertDetail, GridQuery } from "@aml/shared";
import { scopeOf, type Principal } from "../../shared/access";
import { appError } from "../../shared/errors";
import { toAlertRow, toTransactionRow } from "../../shared/mappers";
import type { AlertsRepository } from "./alerts.repository";

const OPEN = new Set(["NEW", "IN_REVIEW"]);

export const createAlertsService = ({ repo, now = () => new Date() }: { repo: AlertsRepository; now?: () => Date }) => ({
  list: (p: Principal, q: GridQuery) =>
    repo.query(scopeOf(p), q, p.userId).map(([rows, rowCount]) => ({ rows: rows.map(toAlertRow), rowCount })),

  detail: (p: Principal, id: string) =>
    repo.findDetail(scopeOf(p), id).andThen((a) => {
      if (!a) return errAsync(appError.notFound("Alert not found"));
      return repo
        .accountHistory(a.accountId)
        .andThen((history) => repo.customerAlerts(scopeOf(p), a.customerId, a.id).map((prev) => ({ history, prev })))
        .map(
          ({ history, prev }): AlertDetail => ({
            alert: {
              ...toAlertRow(a),
              decisionNote: a.decisionNote,
              decidedAt: a.decidedAt?.toISOString() ?? null,
              decidedByName: a.decidedBy?.name ?? null,
              caseCode: a.case?.code ?? null,
            },
            rule: { code: a.rule.code, name: a.rule.name, description: a.rule.description, criteria: a.rule.criteria },
            customer: {
              id: a.customer.id,
              code: a.customer.code,
              name: a.customer.name,
              type: a.customer.type,
              country: a.customer.country,
              occupation: a.customer.occupation,
              riskScore: a.customer.riskScore,
              pep: a.customer.pep,
            },
            account: { iban: a.account.iban, currency: a.account.currency, status: a.account.status, openedAt: a.account.openedAt.toISOString() },
            transaction: a.transaction ? toTransactionRow(a.transaction) : null,
            history: history.map(toTransactionRow),
            previousAlerts: prev.map((x) => ({ code: x.code, status: x.status, ruleName: x.rule.name, createdAt: x.createdAt.toISOString() })),
          }),
        );
    }),

  /** Analyst decision: close as false positive or escalate. Decided alerts cannot be decided again. */
  decide: (p: Principal, id: string, input: AlertDecision) =>
    repo.findDetail(scopeOf(p), id).andThen((a) => {
      if (!a) return errAsync(appError.notFound("Alert not found"));
      if (!OPEN.has(a.status)) return errAsync(appError.conflict("This alert was already decided"));
      return okAsync(a);
    })
      .andThen((a) =>
        repo.decide(a.id, {
          status: input.decision === "ESCALATE" ? "ESCALATED" : "CLOSED_FALSE_POSITIVE",
          decidedById: p.userId,
          decisionNote: input.note,
          decidedAt: now(),
        }),
      )
      .map((a) => ({ id: a.id, status: a.status })),
});

export type AlertsService = ReturnType<typeof createAlertsService>;
