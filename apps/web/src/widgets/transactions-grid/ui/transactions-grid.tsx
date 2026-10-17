"use client";

import type { ColDef } from "ag-grid-community";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { CriteriaGroup, TransactionRow } from "@aml/shared";
import { transactionsQueryOptions } from "@/entities/transaction";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatDateTime, formatMoney } from "@/shared/lib/format";
import { useServerDatasource } from "@/shared/lib/use-server-datasource";
import { DataGrid } from "@/shared/ui/data-grid";

type Filters = { criteria?: CriteriaGroup; search?: string };

/** Hundreds of thousands of rows: AG Grid server-side row model, sorting and AND/OR filtering in the API. */
export const TransactionsGrid = ({ filters, onCount }: { filters: Filters; onCount?: (n: number) => void }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const datasource = useServerDatasource(
    (block, f) => transactionsQueryOptions({ ...block, criteria: f.criteria, filters: f.search ? { search: f.search } : {} }),
    filters,
    onCount,
  );

  const columns = useMemo<ColDef<TransactionRow>[]>(
    () => [
      { field: "ref", headerName: t("transactions.col.ref"), width: 140, cellClass: "font-mono" },
      { field: "bookedAt", headerName: t("transactions.col.date"), width: 170, sort: "desc", valueFormatter: (p) => (p.value ? formatDateTime(p.value, locale) : "") },
      { field: "direction", headerName: t("transactions.col.direction"), width: 110, sortable: false, valueFormatter: (p) => (p.value ? t(`direction.${p.value}`) : "") },
      { field: "channel", headerName: t("transactions.col.channel"), width: 110, valueFormatter: (p) => (p.value ? t(`channel.${p.value}`) : "") },
      { field: "amount", headerName: t("transactions.col.amount"), width: 150, type: "numericColumn", valueFormatter: (p) => (p.data ? formatMoney(p.data.amount, p.data.currency, locale) : "") },
      { field: "baseAmount", headerName: t("transactions.col.base"), width: 140, type: "numericColumn", valueFormatter: (p) => (p.data ? formatMoney(p.data.baseAmount, "EUR", locale) : "") },
      { field: "customerName", headerName: t("transactions.col.customer"), flex: 1, minWidth: 180, sortable: false },
      { field: "counterpartyName", headerName: t("transactions.col.counterparty"), flex: 1, minWidth: 180, sortable: false },
      { field: "counterpartyCountry", headerName: t("transactions.col.country"), width: 100 },
      { field: "iban", headerName: t("transactions.col.iban"), width: 240, sortable: false, cellClass: "font-mono ltr-nums" },
      { field: "branchCode", headerName: t("transactions.col.branch"), width: 110, valueGetter: (p) => p.data?.branchCity },
    ],
    [t, locale],
  );

  return (
    <div className="h-[calc(100dvh-300px)] min-h-[480px]">
      <DataGrid<TransactionRow>
        rowModelType="serverSide"
        serverSideDatasource={datasource}
        cacheBlockSize={100}
        columnDefs={columns}
        defaultColDef={{ sortable: true, resizable: true }}
        getRowId={(p) => p.data.id}
      />
    </div>
  );
};
