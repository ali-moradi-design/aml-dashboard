"use client";

import { useTranslation } from "react-i18next";
import type { ImportBatch } from "@aml/shared";
import { ImportWizard } from "@/features/import-wizard";
import { useImports } from "@/entities/import";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatDateTime, formatNumber, formatRelative } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { PageHeader, Panel, PanelHeader } from "@/shared/ui/panel";
import { Skeleton } from "@/shared/ui/skeleton";

const statusClass: Record<ImportBatch["status"], string> = {
  VALIDATED: "bg-risk-medium-bg text-risk-medium-text",
  IMPORTED: "bg-risk-low-bg text-risk-low-text",
  DISCARDED: "bg-muted text-text-secondary",
};

const History = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data, isPending } = useImports();
  const imported = (data ?? []).filter((b) => b.status === "IMPORTED");
  const rows = imported.reduce((s, b) => s + b.validRows, 0);

  return (
    <Panel className="w-full xl:w-[360px] xl:shrink-0">
      <PanelHeader eyebrow={t("import.history")} title={data ? t("import.historyInsight", { count: imported.length, n: formatNumber(imported.length, locale), rows: formatNumber(rows, locale) }) : undefined} />
      {isPending ? <Skeleton className="h-60" /> : null}
      <ul className="flex flex-col divide-y divide-border">
        {(data ?? []).map((b) => (
          <li key={b.id} className="flex flex-col gap-1 py-3">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm">{b.fileName}</span>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap", statusClass[b.status])}>{t(`import.status.${b.status}`)}</span>
            </div>
            <p className="text-xs text-text-secondary">
              {t(`import.kinds.${b.kind}`)} · {t("import.rowsSummary", { valid: formatNumber(b.validRows, locale), total: formatNumber(b.totalRows, locale) })} · {b.createdByName} ·{" "}
              <time dateTime={b.createdAt} title={formatDateTime(b.createdAt, locale)}>{formatRelative(b.createdAt, locale)}</time>
            </p>
          </li>
        ))}
      </ul>
      {data && !data.length ? <p className="text-sm text-text-secondary">{t("import.noHistory")}</p> : null}
    </Panel>
  );
};

export const ImportPage = () => {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t("import.title")} subtitle={t("import.subtitle")} />
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1"><ImportWizard /></div>
        <History />
      </div>
    </>
  );
};
