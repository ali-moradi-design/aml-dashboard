"use client";

import type Highcharts from "highcharts";
import { useTranslation } from "react-i18next";
import type { Overview } from "@aml/shared";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatNumber, formatPercent, formatWeekday } from "@/shared/lib/format";
import { useRuleText } from "@/entities/rule";
import { Chart } from "@/shared/ui/chart";
import { Note, Panel, PanelHeader } from "@/shared/ui/panel";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** New alerts vs. false positives with the 7-day average and the peak day marked. */
export const AlertTrend = ({ data }: { data: Overview }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const created = data.trend.map((d) => d.created);
  const fp = data.trend.map((d) => d.falsePositive);
  const avg = Math.round(sum(created) / Math.max(created.length, 1));
  const peak = created.indexOf(Math.max(...created));
  const fpShare = sum(created) ? Math.round((sum(fp) / sum(created)) * 100) : 0;
  const delta = data.kpis.openAlertsDelta;

  return (
    <Panel className="min-w-0 flex-1">
      <PanelHeader
        eyebrow={t("overview.trend.eyebrow")}
        title={t(delta >= 0 ? "overview.trend.insightUp" : "overview.trend.insightDown", { pct: formatPercent(Math.abs(delta), locale), share: formatPercent(fpShare, locale) })}
      />
      <div className="flex gap-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-chart-2" />{t("overview.trend.created")}</span>
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-chart-4" />{t("overview.trend.falsePositive")}</span>
        <span className="flex items-center gap-1.5"><i className="h-0.5 w-3.5 bg-text-secondary" />{t("overview.trend.average")}</span>
      </div>
      <Chart
        height={240}
        options={(c): Highcharts.Options => ({
          xAxis: { categories: data.trend.map((d) => formatWeekday(d.day, locale)), crosshair: { color: c.border } },
          yAxis: {
            min: 0,
            plotLines: [{ value: avg, color: c["text-secondary"], dashStyle: "Dash", width: 1, zIndex: 3, label: { text: `${t("overview.trend.avg")} ${formatNumber(avg, locale)}`, align: "left", style: { color: c["text-secondary"], fontSize: "12px" } } }],
          },
          tooltip: { shared: true },
          plotOptions: { areaspline: { fillColor: c["accent-soft"], lineWidth: 2.5, marker: { enabled: false } }, spline: { marker: { enabled: false } } },
          series: [
            {
              type: "areaspline",
              name: t("overview.trend.created"),
              color: c["chart-2"],
              data: created.map((y, i) => (i === peak ? { y, marker: { enabled: true, radius: 5, fillColor: c.card, lineColor: c["chart-2"], lineWidth: 3 } } : y)),
            },
            { type: "spline", name: t("overview.trend.falsePositive"), color: c["chart-4"], dashStyle: "ShortDash", lineWidth: 2, data: fp },
          ],
        })}
      />
      <div className="grid grid-cols-3 gap-3">
        {[
          [sum(created), t("overview.trend.statCreated")],
          [sum(fp), t("overview.trend.statFp", { share: formatPercent(fpShare, locale) })],
          [data.funnel.escalated, t("overview.trend.statEscalated")],
        ].map(([v, l]) => (
          <div key={String(l)} className="rounded-md bg-muted px-3 py-2.5">
            <p className="text-base text-heading">{formatNumber(Number(v), locale)}</p>
            <p className="text-xs text-text-secondary">{l}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
};

/** Alerts by rule: share (donut) and hit rate (table), so noisy rules stand out. */
export const RulesBreakdown = ({ data }: { data: Overview }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const total = sum(data.byRule.map((r) => r.count));
  const top = data.byRule[0];
  const best = [...data.byRule].sort((a, b) => b.hitRate - a.hitRate)[0];
  const worst = [...data.byRule].sort((a, b) => a.hitRate - b.hitRate)[0];
  const colors = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"];
  const ruleText = useRuleText();

  return (
    <Panel className="w-full xl:w-[380px] xl:shrink-0">
      <PanelHeader
        eyebrow={t("overview.rules.eyebrow")}
        title={top ? t("overview.rules.insight", { rule: ruleText.name(top.code, top.name), share: formatPercent(total ? (top.count / total) * 100 : 0, locale) }) : undefined}
      />
      <div className="relative mx-auto size-[164px]">
        <Chart
          height={164}
          options={(c): Highcharts.Options => ({
            chart: { spacing: [0, 0, 0, 0] },
            tooltip: { pointFormat: "<b>{point.y}</b>" },
            plotOptions: { pie: { innerSize: "68%", borderWidth: 3, borderColor: c.card, dataLabels: { enabled: false } } },
            series: [{ type: "pie", data: data.byRule.map((r, i) => ({ name: ruleText.name(r.code, r.name), y: r.count, color: c[colors[i]!.slice(2) as "chart-1"] })) }],
          })}
        />
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-xl text-heading">{formatNumber(total, locale)}</p>
            <p className="text-xs text-text-secondary">{t("overview.rules.alerts")}</p>
          </div>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-text-secondary">
            <th className="pb-1 text-start font-normal">{t("overview.rules.rule")}</th>
            <th className="pb-1 text-end font-normal">{t("overview.rules.count")}</th>
            <th className="pb-1 text-end font-normal">{t("overview.rules.hitRate")}</th>
          </tr>
        </thead>
        <tbody>
          {data.byRule.map((r, i) => (
            <tr key={r.code}>
              <td className="py-1">
                <span className="me-2 inline-block size-2 rounded-full" style={{ background: `var(${colors[i]})` }} />
                {ruleText.name(r.code, r.name)}
              </td>
              <td className="py-1 text-end">{formatNumber(r.count, locale)}</td>
              <td className="py-1 text-end text-heading">{formatPercent(r.hitRate, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {best && worst ? <Note>{t("overview.rules.note", { best: ruleText.name(best.code, best.name), worst: ruleText.name(worst.code, worst.name), rate: formatPercent(worst.hitRate, locale) })}</Note> : null}
    </Panel>
  );
};

/** When alerts are raised: weekday × 2-hour heatmap with the strongest cell called out. */
export const AlertHeatmap = ({ data }: { data: Overview }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const days = [1, 2, 3, 4, 5, 6, 7].map((d) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, d)));
  const grid = data.heatmap.map((h) => [h.hourBucket, h.weekday - 1, h.count] as [number, number, number]);
  const peak = data.heatmap.reduce((a, b) => (b.count > (a?.count ?? -1) ? b : a), data.heatmap[0]);
  const avg = sum(data.heatmap.map((h) => h.count)) / 84;

  return (
    <Panel className="min-w-0 flex-1">
      <PanelHeader eyebrow={t("overview.heat.eyebrow")} title={t("overview.heat.insight")} />
      <p className="-mt-3 text-xs text-text-secondary">{t("overview.heat.localTime")}</p>
      <Chart
        height={250}
        options={(c): Highcharts.Options => ({
          chart: { type: "heatmap" },
          xAxis: { categories: Array.from({ length: 12 }, (_, i) => `${String(i * 2).padStart(2, "0")}`), lineWidth: 0, min: 0, max: 11 },
          yAxis: { categories: days, reversed: true, gridLineWidth: 0, min: 0, max: 6, startOnTick: false, endOnTick: false },
          colorAxis: { min: 0, stops: [[0, c.muted], [0.35, c["chart-4"]], [0.7, c["chart-2"]], [1, c["chart-1"]]] },
          tooltip: { formatter() { const p = this as unknown as { point: { x: number; y: number; value: number } }; return `${days[p.point.y]} ${String(p.point.x * 2).padStart(2, "0")}:00 · <b>${p.point.value}</b>`; } },
          series: [{ type: "heatmap", data: grid, borderWidth: 3, borderColor: c.card, borderRadius: 4, dataLabels: { enabled: false } } as Highcharts.SeriesHeatmapOptions],
        })}
      />
      {peak ? (
        <Note tone={peak.count > avg * 3 ? "danger" : "neutral"}>
          {t("overview.heat.callout", {
            day: days[peak.weekday - 1],
            from: `${String(peak.hourBucket * 2).padStart(2, "0")}:00`,
            to: `${String(peak.hourBucket * 2 + 2).padStart(2, "0")}:00`,
            count: formatNumber(peak.count, locale),
            times: formatNumber(Math.round(peak.count / Math.max(avg, 1)), locale),
          })}
        </Note>
      ) : null}
    </Panel>
  );
};

/** Review funnel with the conversion between steps. */
export const ReviewFunnel = ({ data }: { data: Overview }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const f = data.funnel;
  const steps = [
    ["raised", f.raised, null],
    ["reviewed", f.reviewed, f.raised],
    ["escalated", f.escalated, f.reviewed],
    ["reported", f.reported, f.escalated],
  ] as const;
  const ratio = f.escalated ? Math.round(f.raised / f.escalated) : 0;

  return (
    <Panel className="w-full xl:w-[380px] xl:shrink-0">
      <PanelHeader eyebrow={t("overview.funnel.eyebrow")} title={t("overview.funnel.insight", { ratio: formatNumber(ratio, locale), reported: formatNumber(f.reported, locale) })} />
      <div className="flex flex-1 items-end gap-2">
        {steps.map(([key, value, prev], i) => (
          <div key={key} className="flex flex-1 flex-col items-center gap-1.5 text-xs">
            <span className={prev ? "rounded-sm bg-muted px-1.5 py-px text-text-secondary" : "invisible"}>
              → {formatPercent(prev ? (value / prev) * 100 : 100, locale)}
            </span>
            <span className="text-sm text-heading">{formatNumber(value, locale)}</span>
            <div
              className="w-full rounded-t-md rounded-b-xs transition-[filter] hover:brightness-110"
              style={{ height: Math.max(6, Math.round((130 * value) / Math.max(f.raised, 1))), background: `var(--chart-${i + 1})` }}
            />
            <span className="text-text">{t(`overview.funnel.${key}`)}</span>
          </div>
        ))}
      </div>
      <Note>{t("overview.funnel.note")}</Note>
    </Panel>
  );
};

/** Open alerts by branch, split by risk level; sorted by share of high risk. */
export const RiskByBranch = ({ data }: { data: Overview }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const max = Math.max(...data.riskByBranch.map((b) => b.high + b.medium + b.low), 1);
  const top = data.riskByBranch[0];
  const share = (b: (typeof data.riskByBranch)[number]) => Math.round((b.high / Math.max(1, b.high + b.medium + b.low)) * 100);

  return (
    <Panel className="w-full xl:w-[380px] xl:shrink-0">
      <PanelHeader eyebrow={t("overview.branches.eyebrow")} title={top ? t("overview.branches.insight", { city: top.city, share: formatPercent(share(top), locale) }) : undefined} />
      <div className="flex gap-4 text-xs text-text-secondary">
        {(["high", "medium", "low"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <i className={`size-2 rounded-full bg-risk-${k}`} />
            {t(`risk.${k.toUpperCase()}`)}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-4">
        {data.riskByBranch.map((b) => {
          const total = b.high + b.medium + b.low;
          return (
            <div key={b.code} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="flex-1">{b.city}</span>
                <span className="text-xs text-risk-high-text">{t("overview.branches.high", { share: formatPercent(share(b), locale) })}</span>
                <span className="text-heading">{formatNumber(total, locale)}</span>
              </div>
              <div className="flex h-2 gap-0.5" style={{ width: `${(total / max) * 100}%` }} dir="ltr">
                <i className="rounded-sm bg-risk-high" style={{ flex: b.high }} />
                <i className="rounded-sm bg-risk-medium" style={{ flex: b.medium }} />
                <i className="rounded-sm bg-risk-low" style={{ flex: b.low }} />
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
};
