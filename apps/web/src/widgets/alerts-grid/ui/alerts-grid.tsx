"use client";

import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { AlertRow, GridQuery } from "@aml/shared";
import { alertsQueryOptions, RiskBadge, StatusBadge } from "@/entities/alert";
import { useRuleText } from "@/entities/rule";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatDateTime, formatMoney, formatNumber } from "@/shared/lib/format";
import { useServerDatasource } from "@/shared/lib/use-server-datasource";
import { DataGrid } from "@/shared/ui/data-grid";

type Props = { filters: GridQuery["filters"]; onCount?: (n: number) => void };

/** Alert grid on AG Grid's server-side row model: sorting and paging happen in the API. */
export const AlertsGrid = ({ filters, onCount }: Props) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  const router = useRouter();
  const ruleText = useRuleText();
  const datasource = useServerDatasource((block, f) => alertsQueryOptions({ ...block, filters: f }), filters, onCount);

  const columns = useMemo<ColDef<AlertRow>[]>(
    () => [
      { field: "code", headerName: t("alerts.col.code"), width: 120, cellClass: "font-mono text-link" },
      { field: "createdAt", headerName: t("alerts.col.created"), width: 170, sort: "desc", valueFormatter: (p) => (p.value ? formatDateTime(p.value, locale) : "") },
      { field: "riskLevel", headerName: t("alerts.col.risk"), width: 110, cellRenderer: (p: ICellRendererParams<AlertRow>) => (p.data ? <RiskBadge level={p.data.riskLevel} /> : null) },
      { field: "score", headerName: t("alerts.col.score"), width: 90, type: "numericColumn", valueFormatter: (p) => (p.value == null ? "" : formatNumber(p.value, locale)) },
      { field: "status", headerName: t("alerts.col.status"), width: 160, cellRenderer: (p: ICellRendererParams<AlertRow>) => (p.data ? <StatusBadge status={p.data.status} /> : null) },
      { field: "ruleName", headerName: t("alerts.col.rule"), flex: 1, minWidth: 200, valueFormatter: (p) => (p.data ? ruleText.name(p.data.ruleCode, p.data.ruleName) : "") },
      { field: "customerName", headerName: t("alerts.col.customer"), flex: 1, minWidth: 180 },
      { field: "branchCode", headerName: t("alerts.col.branch"), width: 120, valueGetter: (p) => p.data?.branchCity },
      {
        field: "baseAmount",
        headerName: t("alerts.col.amount"),
        width: 150,
        type: "numericColumn",
        valueFormatter: (p) => (p.data?.amount && p.data.currency ? formatMoney(p.data.amount, p.data.currency, locale) : "—"),
      },
      { field: "assigneeName", headerName: t("alerts.col.assignee"), width: 150, sortable: false, valueFormatter: (p) => p.value ?? t("alerts.unassigned") },
    ],
    [t, locale, ruleText],
  );

  return (
    <div className="h-[calc(100dvh-330px)] min-h-[480px]">
      <DataGrid<AlertRow>
        rowModelType="serverSide"
        serverSideDatasource={datasource}
        cacheBlockSize={50}
        columnDefs={columns}
        defaultColDef={{ sortable: true, resizable: true }}
        getRowId={(p) => p.data.id}
        rowClass="cursor-pointer"
        onRowClicked={(e) => e.data && router.push(href(`/alerts/${e.data.code}`))}
      />
    </div>
  );
};
