"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { AlertRow, GridQuery } from "@aml/shared";
import { alertsQueryOptions, RiskBadge, StatusBadge } from "@/entities/alert";
import { useRuleText } from "@/entities/rule";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatDateTime, formatMoney, formatNumber } from "@/shared/lib/format";
import { DataTable, type DataColumn } from "@/shared/ui/data-table";

type Props = { filters: GridQuery["filters"]; onCount?: (n: number) => void };

/** Alert table: sorting and paging happen in the API. */
export const AlertsGrid = ({ filters, onCount }: Props) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  const router = useRouter();
  const ruleText = useRuleText();

  const columns = useMemo<Array<DataColumn<AlertRow>>>(
    () => [
      {
        accessorKey: "code",
        header: t("alerts.col.code"),
        size: 120,
        meta: { className: "font-mono text-link" },
      },
      {
        accessorKey: "createdAt",
        header: t("alerts.col.created"),
        size: 170,
        cell: ({ row }) => formatDateTime(row.original.createdAt, locale),
      },
      {
        accessorKey: "riskLevel",
        header: t("alerts.col.risk"),
        size: 110,
        cell: ({ row }) => <RiskBadge level={row.original.riskLevel} />,
      },
      {
        accessorKey: "score",
        header: t("alerts.col.score"),
        size: 90,
        meta: { numeric: true },
        cell: ({ row }) => formatNumber(row.original.score, locale),
      },
      {
        accessorKey: "status",
        header: t("alerts.col.status"),
        size: 160,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "ruleName",
        header: t("alerts.col.rule"),
        size: 200,
        meta: { grow: true },
        cell: ({ row }) => ruleText.name(row.original.ruleCode, row.original.ruleName),
      },
      {
        accessorKey: "customerName",
        header: t("alerts.col.customer"),
        size: 180,
        meta: { grow: true },
      },
      {
        id: "branchCode",
        accessorFn: (r) => r.branchCity,
        header: t("alerts.col.branch"),
        size: 120,
        cell: ({ row }) =>
          t(`city.${row.original.branchCity}`, { defaultValue: row.original.branchCity }),
      },
      {
        id: "baseAmount",
        header: t("alerts.col.amount"),
        size: 150,
        meta: { numeric: true },
        cell: ({ row }) =>
          row.original.amount && row.original.currency
            ? formatMoney(row.original.amount, row.original.currency, locale)
            : "—",
      },
      {
        accessorKey: "assigneeName",
        header: t("alerts.col.assignee"),
        size: 150,
        enableSorting: false,
        cell: ({ row }) => row.original.assigneeName ?? t("alerts.unassigned"),
      },
    ],
    [t, locale, ruleText],
  );

  return (
    <DataTable<AlertRow>
      label={t("alerts.title")}
      className="h-[calc(100dvh-330px)] min-h-120"
      columns={columns}
      query={(req) => alertsQueryOptions({ ...req, filters })}
      resetKey={filters}
      initialSort={[{ id: "createdAt", desc: true }]}
      getRowId={(r) => r.id}
      onRowClick={(r) => router.push(href(`/alerts/${r.code}`))}
      onCount={onCount}
    />
  );
};
