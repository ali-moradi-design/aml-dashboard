"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { CriteriaGroup, TransactionRow } from "@aml/shared";
import { transactionsQueryOptions } from "@/entities/transaction";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatDateTime, formatMoney } from "@/shared/lib/format";
import { DataTable, type DataColumn } from "@/shared/ui/data-table";

type Filters = { criteria?: CriteriaGroup; search?: string };

/** Hundreds of thousands of rows: sorting, paging and AND/OR filtering all happen in the API. */
export const TransactionsGrid = ({ filters, onCount }: { filters: Filters; onCount?: (n: number) => void }) => {
  const { t } = useTranslation();
  const locale = useLocale();

  const columns = useMemo<Array<DataColumn<TransactionRow>>>(
    () => [
      { accessorKey: "ref", header: t("transactions.col.ref"), size: 140, meta: { className: "font-mono" } },
      { accessorKey: "bookedAt", header: t("transactions.col.date"), size: 170, cell: ({ row }) => formatDateTime(row.original.bookedAt, locale) },
      { accessorKey: "direction", header: t("transactions.col.direction"), size: 110, enableSorting: false, cell: ({ row }) => t(`direction.${row.original.direction}`) },
      { accessorKey: "channel", header: t("transactions.col.channel"), size: 110, cell: ({ row }) => t(`channel.${row.original.channel}`) },
      { accessorKey: "amount", header: t("transactions.col.amount"), size: 150, meta: { numeric: true }, cell: ({ row }) => formatMoney(row.original.amount, row.original.currency, locale) },
      { accessorKey: "baseAmount", header: t("transactions.col.base"), size: 140, meta: { numeric: true }, cell: ({ row }) => formatMoney(row.original.baseAmount, "EUR", locale) },
      { accessorKey: "customerName", header: t("transactions.col.customer"), size: 180, enableSorting: false, meta: { grow: true } },
      { accessorKey: "counterpartyName", header: t("transactions.col.counterparty"), size: 180, enableSorting: false, meta: { grow: true } },
      { accessorKey: "counterpartyCountry", header: t("transactions.col.country"), size: 100 },
      { accessorKey: "iban", header: t("transactions.col.iban"), size: 240, enableSorting: false, meta: { className: "font-mono ltr-nums" } },
      { id: "branchCode", accessorFn: (r) => r.branchCity, header: t("transactions.col.branch"), size: 110, cell: ({ row }) => t(`city.${row.original.branchCity}`, { defaultValue: row.original.branchCity }) },
    ],
    [t, locale],
  );

  return (
    <DataTable<TransactionRow>
      label={t("transactions.title")}
      className="h-[calc(100dvh-300px)] min-h-[480px]"
      columns={columns}
      query={(req) => transactionsQueryOptions({ ...req, criteria: filters.criteria, filters: filters.search ? { search: filters.search } : {} })}
      resetKey={filters}
      initialSort={[{ id: "bookedAt", desc: true }]}
      pageSize={100}
      getRowId={(r) => r.id}
      onCount={onCount}
    />
  );
};
