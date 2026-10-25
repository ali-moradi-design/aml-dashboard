"use client";

import { History, Play } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { JobRow, JobRun } from "@aml/shared";
import { cronPresets, JobScheduleDialog } from "./job-schedule-dialog";
import { useJobRuns, useJobs, useRunJob } from "@/entities/job";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatDateTime, formatNumber, formatPercent, formatRelative } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Note, PageHeader, Panel, PanelHeader } from "@/shared/ui/panel";
import { Skeleton } from "@/shared/ui/skeleton";
import { Sparkline } from "@/shared/ui/sparkline";

const statusClass: Record<JobRun["status"], string> = {
  RUNNING: "bg-brand-soft text-heading",
  SUCCEEDED: "bg-risk-low-bg text-risk-low-text",
  FAILED: "bg-risk-high-bg text-risk-high-text",
};

const RunStatus = ({ status }: { status: JobRun["status"] }) => {
  const { t } = useTranslation();
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap", statusClass[status])}>{t(`jobs.status.${status}`)}</span>;
};

const seconds = (run: JobRun) => (run.finishedAt ? (new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000 : null);

const useScheduleText = () => {
  const { t } = useTranslation();
  return (cron: string) => {
    const preset = cronPresets.find((p) => p.cron === cron);
    return preset ? t(`jobs.presets.${preset.key}`) : cron;
  };
};

const RunHistory = ({ job }: { job: JobRow }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data, isPending } = useJobRuns(job.key);
  if (isPending) return <Skeleton className="h-40" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-start text-xs text-text-secondary">
            {["started", "duration", "result", "trigger", "stats"].map((c) => <th key={c} className="h-9 border-b border-border px-3 text-start font-normal">{t(`jobs.history.${c}`)}</th>)}
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((r) => {
            const s = seconds(r);
            return (
              <tr key={r.id} className="align-top">
                <td className="border-b border-border px-3 py-2.5 whitespace-nowrap">{formatDateTime(r.startedAt, locale)}</td>
                <td className="border-b border-border px-3 py-2.5">{s === null ? "—" : `${formatNumber(s, locale, { maximumFractionDigits: 1 })} ${t("jobs.sec")}`}</td>
                <td className="border-b border-border px-3 py-2.5"><RunStatus status={r.status} /></td>
                <td className="border-b border-border px-3 py-2.5">{r.triggeredByName ?? t("jobs.bySchedule")}</td>
                <td className="border-b border-border px-3 py-2.5 text-text-secondary">
                  {r.error ? <span className="text-risk-high-text">{r.error}</span> : Object.entries(r.stats ?? {}).map(([k, v]) => `${t(`jobs.stats.${k}`, { defaultValue: k })}: ${formatNumber(v, locale)}`).join(" · ") || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const JobCard = ({ job, onHistory, showing }: { job: JobRow; onHistory: () => void; showing: boolean }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const scheduleText = useScheduleText();
  const run = useRunJob();
  const last = job.lastRun;
  const avg = job.durations.length ? job.durations.reduce((a, b) => a + b, 0) / job.durations.length : 0;

  return (
    <Panel className={cn("gap-4", showing && "border-brand")}>
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base text-text">{t(`jobs.names.${job.key}`, { defaultValue: job.name })}</h2>
            {!job.enabled ? <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-text-secondary">{t("jobs.paused")}</span> : null}
          </div>
          <p className="mt-1 text-sm text-text-secondary">{t(`jobs.descriptions.${job.key}`, { defaultValue: job.description })}</p>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-text-secondary">{t("jobs.schedule")}</dt>
          <dd className="mt-0.5">{scheduleText(job.cron)}</dd>
          <dd className="ltr-nums w-fit font-mono text-xs text-text-secondary">{job.cron}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-secondary">{t("jobs.nextRun")}</dt>
          <dd className="mt-0.5">{job.nextRunAt ? <time dateTime={job.nextRunAt} title={formatDateTime(job.nextRunAt, locale)}>{formatRelative(job.nextRunAt, locale)}</time> : "—"}</dd>
          <dd className="text-xs text-text-secondary">{job.timezone}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-secondary">{t("jobs.lastRun")}</dt>
          <dd className="mt-0.5 flex flex-col items-start gap-1">
            {last ? (
              <>
                <RunStatus status={last.status} />
                <time className="text-xs text-text-secondary" dateTime={last.startedAt} title={formatDateTime(last.startedAt, locale)}>{formatRelative(last.startedAt, locale)}</time>
              </>
            ) : t("jobs.never")}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-text-secondary">{t("jobs.successRate")}</dt>
          <dd className={cn("mt-0.5 text-lg", job.successRate < 90 && "text-risk-high-text")}>{formatPercent(job.successRate, locale)}</dd>
        </div>
      </dl>

      <div className="flex items-end gap-4 rounded-md bg-muted px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-text-secondary">{t("jobs.duration")}</p>
          <p className="text-sm">{t("jobs.avgDuration", { value: formatNumber(avg, locale, { maximumFractionDigits: 1 }) })}</p>
        </div>
        {job.durations.length > 1 ? <Sparkline values={job.durations} width={160} height={36} /> : null}
      </div>

      {last?.status === "FAILED" && last.error ? <Note tone="danger">{last.error}</Note> : null}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={run.isPending || last?.status === "RUNNING"} onClick={() => run.mutate(job.key)}>
          <Play /> {run.isPending ? t("jobs.running") : t("jobs.runNow")}
        </Button>
        <JobScheduleDialog job={job} />
        <Button variant="ghost" size="sm" aria-expanded={showing} onClick={onHistory}><History /> {t("jobs.historyButton")}</Button>
      </div>
    </Panel>
  );
};

export const JobsPage = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data, isPending, isError, refetch } = useJobs();
  const [history, setHistory] = useState<string | null>(null);
  const failing = data?.filter((j) => j.lastRun?.status === "FAILED") ?? [];
  const shown = data?.find((j) => j.key === history);

  return (
    <>
      <PageHeader
        title={t("jobs.title")}
        subtitle={
          data
            ? failing.length
              ? t("jobs.subtitleFailing", { count: failing.length, n: formatNumber(failing.length, locale) })
              : t("jobs.subtitleOk", { count: data.length, n: formatNumber(data.length, locale) })
            : undefined
        }
      />
      {isError ? (
        <Panel>
          <p>{t("errors.generic")}</p>
          <Button variant="outline" className="w-fit" onClick={() => refetch()}>{t("errors.retry")}</Button>
        </Panel>
      ) : isPending ? (
        <div className="grid gap-4 xl:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-72" />)}</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.map((j) => <JobCard key={j.id} job={j} showing={history === j.key} onHistory={() => setHistory((h) => (h === j.key ? null : j.key))} />)}
        </div>
      )}
      {shown ? (
        <Panel>
          <PanelHeader eyebrow={t("jobs.historyTitle")} title={t(`jobs.names.${shown.key}`, { defaultValue: shown.name })} actions={<Button variant="ghost" size="sm" onClick={() => setHistory(null)}>{t("forms.close")}</Button>} />
          <RunHistory job={shown} />
        </Panel>
      ) : null}
    </>
  );
};
