"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { CustomerRow, GridQuery } from "@aml/shared";
import { customersQueryOptions } from "@/entities/customer";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatDate, formatNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { DataTable, type DataColumn } from "@/shared/ui/data-table";

const RiskCell = ({ value }: { value: number }) => {
  const locale = useLocale();
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-muted" dir="ltr">
        <span className={cn("block h-full rounded-full", value >= 70 ? "bg-risk-high" : value >= 40 ? "bg-risk-medium" : "bg-risk-low")} style={{ width: `${value}%` }} />
      </span>
      {formatNumber(value, locale)}
    </span>
  );
};

export const CustomersGrid = ({ filters, onCount }: { filters: GridQuery["filters"]; onCount?: (n: number) => void }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  const router = useRouter();

  const columns = useMemo<Array<DataColumn<CustomerRow>>>(
    () => [
      { accessorKey: "code", header: t("customers.col.code"), size: 120, meta: { className: "font-mono text-link" } },
      { accessorKey: "name", header: t("customers.col.name"), size: 220, meta: { grow: true } },
      { accessorKey: "type", header: t("customers.col.type"), size: 120, enableSorting: false, cell: ({ row }) => t(`customerType.${row.original.type}`) },
      { accessorKey: "country", header: t("customers.col.country"), size: 110, cell: ({ row }) => t(`country.${row.original.country}`, { defaultValue: row.original.country }) },
      { accessorKey: "branchCity", header: t("customers.col.branch"), size: 120, enableSorting: false, cell: ({ row }) => t(`city.${row.original.branchCity}`, { defaultValue: row.original.branchCity }) },
      { accessorKey: "riskScore", header: t("customers.col.risk"), size: 130, cell: ({ row }) => <RiskCell value={row.original.riskScore} /> },
      { accessorKey: "kycStatus", header: t("customers.col.kyc"), size: 130, cell: ({ row }) => t(`kycStatus.${row.original.kycStatus}`) },
      { accessorKey: "pep", header: t("customers.col.pep"), size: 90, enableSorting: false, cell: ({ row }) => (row.original.pep ? t("common.yes") : "") },
      { accessorKey: "openAlerts", header: t("customers.col.alerts"), size: 120, enableSorting: false, meta: { numeric: true }, cell: ({ row }) => (row.original.openAlerts ? formatNumber(row.original.openAlerts, locale) : "") },
      { accessorKey: "createdAt", header: t("customers.col.since"), size: 140, cell: ({ row }) => formatDate(row.original.createdAt, locale) },
    ],
    [t, locale],
  );

  return (
    <DataTable<CustomerRow>
      label={t("customers.title")}
      className="h-[calc(100dvh-300px)] min-h-[480px]"
      columns={columns}
      query={(req) => customersQueryOptions({ ...req, filters })}
      resetKey={filters}
      initialSort={[{ id: "riskScore", desc: true }]}
      getRowId={(r) => r.id}
      onRowClick={(r) => router.push(href(`/customers/${r.code}`))}
      onCount={onCount}
    />
  );
};
