"use client";

import type Highcharts from "highcharts";
import { useTranslation } from "react-i18next";
import type { Reports } from "@aml/shared";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatCompact, formatHours, formatNumber, formatPercent } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Chart } from "@/shared/ui/chart";
import { Note, Panel, PanelHeader } from "@/shared/ui/panel";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
/** Whole euros: report amounts are sums in the base currency, cents add nothing. */
const formatMoney = (v: number, _currency: "EUR", locale: Parameters<typeof formatNumber>[1]) => formatNumber(v, locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const useCountry = () => {
  const { t } = useTranslation();
  return (code: string) => t(`country.${code}`, { defaultValue: code });
};

/** Money from branch countries (left) to counterparty countries (right). Node ids are prefixed so DE→DE is two nodes. */
export const MoneyFlows = ({ data, highRisk }: { data: Reports; highRisk: Set<string> }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const country = useCountry();
  const links = data.flows.slice(0, 24);
  const total = sum(links.map((l) => l.amount));
  const risky = sum(links.filter((l) => highRisk.has(l.to)).map((l) => l.amount));
  const nodes = [...new Set(links.flatMap((l) => [`b:${l.from}`, `c:${l.to}`]))];

  return (
    <Panel className="min-w-0 flex-1">
      <PanelHeader eyebrow={t("reports.flows.eyebrow")} title={t("reports.flows.insight", { share: formatPercent(total ? (risky / total) * 100 : 0, locale), amount: formatMoney(risky, "EUR", locale) })} />
      {/* The diagram always runs left to right, so its column labels do too. */}
      <div dir="ltr" className="flex justify-between text-xs text-text-secondary">
        <span>{t("reports.flows.from")}</span>
        <span>{t("reports.flows.to")}</span>
      </div>
      <Chart
        height={460}
        options={(c): Highcharts.Options => ({
          tooltip: {
            pointFormatter() {
              const p = this as unknown as { from: string; to: string; weight: number; isNode?: boolean; name?: string; sum?: number };
              if (p.isNode) return `${p.name}: <b>${formatMoney(p.sum ?? 0, "EUR", locale)}</b>`;
              return `${country(p.from.slice(2))} → ${country(p.to.slice(2))}: <b>${formatMoney(p.weight, "EUR", locale)}</b>`;
            },
            headerFormat: "",
          },
          series: [
            {
              type: "sankey",
              name: t("reports.flows.eyebrow"),
              keys: ["from", "to", "weight"],
              data: links.map((l) => ({ from: `b:${l.from}`, to: `c:${l.to}`, weight: l.amount, color: highRisk.has(l.to) ? c["risk-high"] : c["chart-4"] })),
              nodes: nodes.map((id) => ({
                id,
                name: country(id.slice(2)),
                color: id.startsWith("c:") && highRisk.has(id.slice(2)) ? c["risk-high"] : id.startsWith("b:") ? c["chart-1"] : c["chart-2"],
              })),
              nodeWidth: 14,
              nodePadding: 10,
              linkOpacity: 0.35,
              curveFactor: 0.5,
              dataLabels: { style: { color: c.text, textOutline: "none", fontWeight: "normal", fontSize: "12px" }, nodeFormat: "{point.name}" },
            } as Highcharts.SeriesSankeyOptions,
          ],
        })}
      />
      <Note tone={risky ? "danger" : "neutral"}>{t("reports.flows.note")}</Note>
    </Panel>
  );
};

/** Alerts per weekday and hour (branch local time), full 24 hours. */
export const AlertHours = ({ data }: { data: Reports }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const days = [1, 2, 3, 4, 5, 6, 7].map((d) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, d)));
  const night = sum(data.heatmap.filter((h) => h.hour < 6 || h.hour >= 22).map((h) => h.count));
  const all = sum(data.heatmap.map((h) => h.count));

  return (
    <Panel className="min-w-0 flex-1">
      <PanelHeader eyebrow={t("reports.heat.eyebrow")} title={t("reports.heat.insight", { share: formatPercent(all ? (night / all) * 100 : 0, locale) })} />
      <p className="-mt-3 text-xs text-text-secondary">{t("overview.heat.localTime")}</p>
      <Chart
        height={280}
        options={(c): Highcharts.Options => ({
          chart: { type: "heatmap" },
          xAxis: { categories: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")), lineWidth: 0, min: 0, max: 23, labels: { step: 2 } },
          yAxis: { categories: days, reversed: true, gridLineWidth: 0, min: 0, max: 6, startOnTick: false, endOnTick: false },
          colorAxis: { min: 0, stops: [[0, c.muted], [0.35, c["chart-4"]], [0.7, c["chart-2"]], [1, c["chart-1"]]] },
          tooltip: { formatter() { const p = this as unknown as { point: { x: number; y: number; value: number } }; return `${days[p.point.y]} ${String(p.point.x).padStart(2, "0")}:00 · <b>${formatNumber(p.point.value, locale)}</b>`; } },
          series: [{ type: "heatmap", data: data.heatmap.map((h) => [h.hour, h.weekday - 1, h.count]), borderWidth: 2, borderColor: c.card, borderRadius: 3 } as Highcharts.SeriesHeatmapOptions],
        })}
      />
    </Panel>
  );
};

/** Open alerts and decisions per person, sorted by load. */
export const Workload = ({ data }: { data: Reports }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const people = data.workload.slice(0, 12);
  const top = people[0];
  const avg = people.length ? sum(people.map((p) => p.openAlerts)) / people.length : 0;

  return (
    <Panel className="min-w-0 flex-1">
      <PanelHeader
        eyebrow={t("reports.workload.eyebrow")}
        title={top ? t("reports.workload.insight", { name: top.name, count: formatNumber(top.openAlerts, locale), times: formatNumber(avg ? top.openAlerts / avg : 0, locale, { maximumFractionDigits: 1 }) }) : t("reports.empty")}
      />
      <div className="flex gap-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-chart-1" />{t("reports.workload.open")}</span>
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-chart-4" />{t("reports.workload.decided")}</span>
      </div>
      <Chart
        height={Math.max(220, people.length * 34)}
        options={(c): Highcharts.Options => ({
          chart: { type: "bar" },
          xAxis: { categories: people.map((p) => p.name), lineWidth: 0 },
          yAxis: { min: 0, plotLines: [{ value: avg, color: c["text-secondary"], dashStyle: "Dash", width: 1, zIndex: 3, label: { text: `${t("overview.trend.avg")} ${formatNumber(Math.round(avg), locale)}`, style: { color: c["text-secondary"], fontSize: "12px" } } }] },
          tooltip: { shared: true },
          plotOptions: { bar: { borderRadius: 3, borderWidth: 0, pointPadding: 0.1, groupPadding: 0.15 } },
          series: [
            { type: "bar", name: t("reports.workload.open"), color: c["chart-1"], data: people.map((p) => p.openAlerts) },
            { type: "bar", name: t("reports.workload.decided"), color: c["chart-4"], data: people.map((p) => p.decided) },
          ],
        })}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-xs text-text-secondary">
              {["name", "role", "median", "cases"].map((k) => <th key={k} className="h-8 border-b border-border px-2 text-start font-normal">{t(`reports.workload.${k}`)}</th>)}
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.name}>
                <td className="border-b border-border px-2 py-2">{p.name}</td>
                <td className="border-b border-border px-2 py-2 text-text-secondary">{t(`role.${p.role}`)}</td>
                <td className="border-b border-border px-2 py-2">{p.medianHours === null ? "—" : formatHours(p.medianHours, locale)}</td>
                <td className="border-b border-border px-2 py-2">{formatNumber(p.openCases, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
};

/** From alert to report, with the drop at every step. */
export const ReviewFunnelReport = ({ data }: { data: Reports }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const f = data.funnel;
  const steps = [["alerts", f.alerts], ["reviewed", f.reviewed], ["escalated", f.escalated], ["cases", f.cases], ["reported", f.reported]] as const;

  return (
    <Panel className="w-full xl:w-[440px] xl:shrink-0">
      <PanelHeader eyebrow={t("reports.funnel.eyebrow")} title={t("reports.funnel.insight", { share: formatPercent(f.alerts ? (f.reported / f.alerts) * 100 : 0, locale), reported: formatNumber(f.reported, locale) })} />
      <Chart
        height={300}
        options={(c): Highcharts.Options => ({
          tooltip: { pointFormatter() { return `<b>${formatNumber((this as unknown as { y: number }).y, locale)}</b>`; } },
          series: [
            {
              type: "funnel",
              name: t("reports.funnel.eyebrow"),
              neckWidth: "26%",
              neckHeight: "0%",
              width: "62%",
              center: ["36%", "50%"],
              borderWidth: 0,
              colors: [c["chart-1"], c["chart-2"], c["chart-3"], c["chart-4"], c["chart-5"]],
              dataLabels: { enabled: true, inside: false, style: { color: c.text, textOutline: "none", fontWeight: "normal", fontSize: "12px" }, format: "{point.name}" },
              data: steps.map(([k, v]) => ({ name: t(`reports.funnel.${k}`), y: v })),
            } as Highcharts.SeriesFunnelOptions,
          ],
        })}
      />
      <ol className="grid grid-cols-5 gap-1 text-center text-xs">
        {steps.map(([k, v], i) => (
          <li key={k} className="flex flex-col gap-0.5">
            <span className="text-sm text-heading">{formatCompact(v, locale)}</span>
            <span className={cn("rounded-sm px-1 py-px text-text-secondary", i > 0 && "bg-muted")}>{i > 0 ? `→ ${formatPercent(steps[i - 1]![1] ? (v / steps[i - 1]![1]) * 100 : 0, locale)}` : " "}</span>
          </li>
        ))}
      </ol>
    </Panel>
  );
};

/** Money in and out per counterparty country; high-risk countries flagged. */
export const CountriesTable = ({ data }: { data: Reports }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const country = useCountry();
  const rows = [...data.countries].sort((a, b) => b.inAmount + b.outAmount - (a.inAmount + a.outAmount));
  const max = Math.max(...rows.map((r) => Math.max(r.inAmount, r.outAmount)), 1);
  const riskyOut = sum(rows.filter((r) => r.highRisk).map((r) => r.outAmount));
  const riskyIn = sum(rows.filter((r) => r.highRisk).map((r) => r.inAmount));

  return (
    <Panel>
      <PanelHeader eyebrow={t("reports.countries.eyebrow")} title={t("reports.countries.insight", { ratio: formatNumber(riskyIn ? riskyOut / riskyIn : 0, locale, { maximumFractionDigits: 1 }) })} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="text-xs text-text-secondary">
              <th className="h-9 border-b border-border px-3 text-start font-normal">{t("reports.countries.country")}</th>
              <th className="h-9 border-b border-border px-3 text-end font-normal">{t("reports.countries.in")}</th>
              <th className="h-9 border-b border-border px-3 text-end font-normal">{t("reports.countries.out")}</th>
              <th className="h-9 border-b border-border px-3 text-end font-normal">{t("reports.countries.net")}</th>
              <th className="h-9 w-[30%] border-b border-border px-3 font-normal"><span className="sr-only">{t("reports.countries.bars")}</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.country} className={cn(r.highRisk && "bg-risk-high-bg/40")}>
                <td className="border-b border-border px-3 py-2">
                  <span className="flex items-center gap-2">
                    {country(r.country)}
                    {r.highRisk ? <span className="rounded-full bg-risk-high-bg px-2 py-px text-xs text-risk-high-text">{t("reports.countries.highRisk")}</span> : null}
                  </span>
                </td>
                <td className="ltr-nums border-b border-border px-3 py-2 text-end">{formatMoney(r.inAmount, "EUR", locale)}</td>
                <td className="ltr-nums border-b border-border px-3 py-2 text-end">{formatMoney(r.outAmount, "EUR", locale)}</td>
                <td className={cn("ltr-nums border-b border-border px-3 py-2 text-end", r.inAmount - r.outAmount < 0 && "text-risk-high-text")}>{formatMoney(r.inAmount - r.outAmount, "EUR", locale)}</td>
                <td className="border-b border-border px-3 py-2">
                  <div className="flex flex-col gap-1" aria-hidden>
                    <span className="h-1.5 rounded-full bg-chart-2" style={{ width: `${(r.inAmount / max) * 100}%` }} />
                    <span className={cn("h-1.5 rounded-full", r.highRisk ? "bg-risk-high" : "bg-chart-4")} style={{ width: `${(r.outAmount / max) * 100}%` }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
};
