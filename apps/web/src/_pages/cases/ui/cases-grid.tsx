"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { CaseRow, GridQuery } from "@aml/shared";
import { RiskBadge } from "@/entities/alert";
import { casesQueryOptions, CaseStatusBadge, DueLabel, PriorityLabel } from "@/entities/case";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatMoney, formatNumber, formatRelative } from "@/shared/lib/format";
import { DataTable, type DataColumn } from "@/shared/ui/data-table";

export const CasesGrid = ({
  filters,
  onCount,
}: {
  filters: GridQuery["filters"];
  onCount?: (n: number) => void;
}) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  const router = useRouter();

  const columns = useMemo<Array<DataColumn<CaseRow>>>(
    () => [
      {
        accessorKey: "code",
        header: t("cases.col.code"),
        size: 110,
        meta: { className: "font-mono text-link" },
      },
      { accessorKey: "title", header: t("cases.col.title"), size: 240, meta: { grow: true } },
      {
        accessorKey: "status",
        header: t("cases.col.status"),
        size: 160,
        cell: ({ row }) => <CaseStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "priority",
        header: t("cases.col.priority"),
        size: 110,
        cell: ({ row }) => <PriorityLabel priority={row.original.priority} />,
      },
      {
        accessorKey: "riskLevel",
        header: t("cases.col.risk"),
        size: 100,
        cell: ({ row }) => <RiskBadge level={row.original.riskLevel} />,
      },
      {
        accessorKey: "subjectName",
        header: t("cases.col.subject"),
        size: 180,
        enableSorting: false,
        meta: { grow: true },
        cell: ({ row }) => row.original.subjectName ?? "—",
      },
      {
        accessorKey: "typology",
        header: t("cases.col.typology"),
        size: 160,
        enableSorting: false,
        cell: ({ row }) => t(`typology.${row.original.typology}`),
      },
      {
        accessorKey: "alertCount",
        header: t("cases.col.alerts"),
        size: 90,
        enableSorting: false,
        meta: { numeric: true },
        cell: ({ row }) => formatNumber(row.original.alertCount, locale),
      },
      {
        accessorKey: "totalAmount",
        header: t("cases.col.amount"),
        size: 140,
        enableSorting: false,
        meta: { numeric: true },
        cell: ({ row }) =>
          row.original.totalAmount ? formatMoney(row.original.totalAmount, "EUR", locale) : "—",
      },
      {
        accessorKey: "dueAt",
        header: t("cases.col.due"),
        size: 140,
        cell: ({ row }) => <DueLabel dueAt={row.original.dueAt} status={row.original.status} />,
      },
      {
        accessorKey: "updatedAt",
        header: t("cases.col.updated"),
        size: 130,
        cell: ({ row }) => formatRelative(row.original.updatedAt, locale),
      },
    ],
    [t, locale],
  );

  return (
    <DataTable<CaseRow>
      label={t("cases.title")}
      className="h-[calc(100dvh-300px)] min-h-120"
      columns={columns}
      query={(req) => casesQueryOptions({ ...req, filters })}
      resetKey={filters}
      initialSort={[{ id: "updatedAt", desc: true }]}
      getRowId={(r) => r.id}
      onRowClick={(r) => router.push(href(`/cases/${r.code}`))}
      onCount={onCount}
    />
  );
};
