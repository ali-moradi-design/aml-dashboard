"use client";

import { FileSpreadsheet, Printer } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ReportRange } from "@aml/shared";
import { useExportReports, useReports } from "@/entities/report";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatDate } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Note, PageHeader, Panel } from "@/shared/ui/panel";
import { Segmented } from "@/shared/ui/segmented";
import { Skeleton } from "@/shared/ui/skeleton";
import { AlertHours, CountriesTable, MoneyFlows, ReviewFunnelReport, Workload } from "./report-charts";

const PRESETS = ["7", "30", "90", "custom"] as const;
type Preset = (typeof PRESETS)[number];

const day = (d: Date) => d.toISOString().slice(0, 10);
const lastDays = (n: number): ReportRange => {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - (n - 1));
  return { from: day(from), to: day(to) };
};

export const ReportsPage = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const [preset, setPreset] = useState<Preset>("30");
  const [range, setRange] = useState<ReportRange>(() => lastDays(30));
  const valid = range.from <= range.to;
  const { data, isPending, isError, isPlaceholderData, refetch } = useReports(range);
  const exportXlsx = useExportReports();
  const highRisk = new Set(data?.countries.filter((c) => c.highRisk).map((c) => c.country));

  const choose = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") setRange(lastDays(Number(p)));
  };

  return (
    <>
      <PageHeader
        title={t("reports.title")}
        subtitle={t("reports.subtitle", { from: formatDate(range.from, locale), to: formatDate(range.to, locale) })}
        actions={
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" size="lg" disabled={exportXlsx.isPending || !valid} onClick={() => exportXlsx.mutate(range)}>
              <FileSpreadsheet /> {exportXlsx.isPending ? t("reports.exporting") : t("reports.excel")}
            </Button>
            <Button variant="outline" size="lg" onClick={() => window.print()}><Printer /> {t("reports.pdf")}</Button>
          </div>
        }
      />
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4 print:hidden">
        <Segmented label={t("reports.range")} value={preset} onChange={choose} options={PRESETS.map((p) => ({ value: p, label: t(`reports.presets.${p}`) }))} />
        {preset === "custom" ? (
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="report-from">{t("reports.from")}</label>
            <Input id="report-from" type="date" className="w-40" value={range.from} max={range.to} onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))} />
            <span className="text-text-secondary">–</span>
            <label className="sr-only" htmlFor="report-to">{t("reports.to")}</label>
            <Input id="report-to" type="date" className="w-40" value={range.to} min={range.from} onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))} />
          </div>
        ) : null}
        {exportXlsx.isError ? <span className="text-sm text-risk-high-text">{t("errors.generic")}</span> : null}
      </div>
      <p className="hidden text-xs text-text-secondary print:block">{t("reports.printNote")}</p>

      {!valid ? (
        <Note tone="danger">{t("errors.startBeforeEnd")}</Note>
      ) : isError ? (
        <Panel>
          <p>{t("errors.generic")}</p>
          <Button variant="outline" className="w-fit" onClick={() => refetch()}>{t("errors.retry")}</Button>
        </Panel>
      ) : isPending ? (
        <>
          <Skeleton className="h-[540px]" />
          <div className="grid gap-6 xl:grid-cols-2"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
        </>
      ) : (
        <div className={isPlaceholderData ? "flex flex-col gap-6 opacity-60 transition-opacity" : "flex flex-col gap-6 transition-opacity"}>
          <MoneyFlows data={data} highRisk={highRisk} />
          <div className="flex flex-col gap-6 xl:flex-row print:break-inside-avoid">
            <AlertHours data={data} />
            <ReviewFunnelReport data={data} />
          </div>
          <div className="print:break-before-page"><Workload data={data} /></div>
          <CountriesTable data={data} />
        </div>
      )}
    </>
  );
};
