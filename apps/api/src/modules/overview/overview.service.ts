import { ResultAsync } from "neverthrow";
import type { Overview } from "@aml/shared";
import { scopeOf, type Principal } from "../../shared/access";
import { toAlertRow } from "../../shared/mappers";
import type { OverviewRepository } from "./overview.repository";

const n = (v: bigint | number | null | undefined) => Number(v ?? 0);
const round1 = (v: number) => Math.round(v * 10) / 10;

/** Pure: percentage change, guarded against an empty previous period. */
export const percentChange = (current: number, previous: number) => (previous === 0 ? 0 : round1(((current - previous) / previous) * 100));

export const createOverviewService = ({ repo, now = () => new Date() }: { repo: OverviewRepository; now?: () => Date }) => ({
  get: (p: Principal) => {
    const s = scopeOf(p);
    const at = now();
    return ResultAsync.combine([
      repo.kpis(s, at),
      repo.days(s, at),
      repo.byRule(s, at),
      repo.heatmap(s, at),
      repo.funnel(s, at),
      repo.riskByBranch(s),
      repo.needsDecision(s),
    ] as const).map(([k, days, rules, heat, funnel, branches, needs]): Overview => ({
      kpis: {
        openAlerts: n(k.open),
        openAlertsDelta: percentChange(n(k.last7), n(k.prev7)),
        highRiskAlerts: n(k.high_open),
        highRiskToday: n(k.high_today),
        awaitingDecision: n(k.in_review),
        overdue: n(k.overdue),
        medianReviewHours: round1(k.median_hours ?? 0),
      },
      sparklines: {
        open: days.map((d) => n(d.created)),
        high: days.map((d) => n(d.high)),
        awaiting: days.map((d) => n(d.decided)),
        review: days.map((d) => round1(d.median_hours ?? 0)),
      },
      trend: days.map((d) => ({ day: d.day.toISOString(), created: n(d.created), falsePositive: n(d.false_positive) })),
      byRule: rules.map((r) => ({ code: r.code, name: r.name, count: n(r.count), hitRate: n(r.decided) ? Math.round((n(r.escalated) / n(r.decided)) * 100) : 0 })),
      heatmap: heat.map((h) => ({ weekday: h.weekday, hourBucket: h.bucket, count: n(h.count) })),
      funnel: { raised: n(funnel.raised), reviewed: n(funnel.reviewed), escalated: n(funnel.escalated), reported: n(funnel.reported) },
      riskByBranch: branches
        .map((b) => ({ code: b.code, city: b.city, high: n(b.high), medium: n(b.medium), low: n(b.low) }))
        .sort((a, b) => b.high / Math.max(1, b.high + b.medium + b.low) - a.high / Math.max(1, a.high + a.medium + a.low)),
      needsDecision: needs.map(toAlertRow),
    }));
  },
});

export type OverviewService = ReturnType<typeof createOverviewService>;
