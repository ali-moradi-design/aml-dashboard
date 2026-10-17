"use client";

import { keepPreviousData, useQuery, type QueryKey } from "@tanstack/react-query";
import {
  columnResizingFeature,
  columnSizingFeature,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type PaginationState,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { directionOf } from "@aml/shared";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { Button } from "./button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Skeleton } from "./skeleton";

export type DataColumnMeta = {
  /** Takes the free width; `size` becomes its minimum. */
  grow?: boolean;
  /** Numbers line up on the end edge. */
  numeric?: boolean;
  className?: string;
};

const features = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  columnSizingFeature,
  columnResizingFeature,
  columnMeta: {} as DataColumnMeta,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- column value types differ per column
export type DataColumn<T extends RowData> = ColumnDef<typeof features, T, any>;

/** The same request shape the API grid endpoints accept. */
export type PageRequest = { startRow: number; endRow: number; sortModel: Array<{ colId: string; sort: "asc" | "desc" }> };
type Page<T> = { rows: T[]; rowCount: number };

type Props<T extends RowData> = {
  columns: Array<DataColumn<T>>;
  /** Builds the entity's query options (same promise and cache key as its hook). */
  query: (req: PageRequest) => { queryKey: QueryKey; queryFn: () => Promise<Page<T>> };
  /** Anything that narrows the result; changing it goes back to page 1. */
  resetKey?: unknown;
  initialSort?: SortingState;
  pageSize?: number;
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  onCount?: (count: number) => void;
  label: string;
  className?: string;
};

const PAGE_SIZES = [25, 50, 100];
const empty: never[] = [];

/**
 * Server-driven table on TanStack Table: sorting and paging happen in the API, React Query owns
 * the rows. Keeps the previous page on screen while the next one loads.
 */
export const DataTable = <T extends RowData>({ columns, query, resetKey, initialSort = [], pageSize = 50, getRowId, onRowClick, onCount, label, className }: Props<T>) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const rtl = directionOf(locale) === "rtl";
  const [sorting, setSorting] = useState<SortingState>(initialSort);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize });

  // New filters or a new sort start again from the first page (adjusting state during render).
  const key = JSON.stringify([resetKey, sorting]);
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }

  const { pageIndex, pageSize: size } = pagination;
  const result = useQuery({
    ...query({
      startRow: pageIndex * size,
      endRow: (pageIndex + 1) * size,
      sortModel: sorting.map((s) => ({ colId: s.id, sort: s.desc ? "desc" : "asc" })),
    }),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
  const rowCount = result.data?.rowCount;

  useEffect(() => {
    if (rowCount !== undefined) onCount?.(rowCount);
  }, [rowCount, onCount]);

  const table = useTable({
    features,
    columns,
    data: (result.data?.rows as T[] | undefined) ?? empty,
    rowCount,
    getRowId: (row) => getRowId(row),
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    manualSorting: true,
    manualPagination: true,
    sortDescFirst: true,
    enableSortingRemoval: false,
    columnResizeMode: "onChange",
    columnResizeDirection: rtl ? "rtl" : "ltr",
  });

  const headers = table.getHeaderGroups()[0]?.headers ?? [];
  const minWidth = headers.reduce((sum, h) => sum + h.getSize(), 0);
  const from = rowCount ? pageIndex * size + 1 : 0;
  const to = Math.min((pageIndex + 1) * size, rowCount ?? 0);
  const pageCount = Math.max(table.getPageCount(), 1);
  const Prev = rtl ? ChevronRight : ChevronLeft;
  const Next = rtl ? ChevronLeft : ChevronRight;
  const First = rtl ? ChevronsRight : ChevronsLeft;
  const Last = rtl ? ChevronsLeft : ChevronsRight;

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card", className)}>
      <div className={cn("min-h-0 flex-1 overflow-auto transition-opacity", result.isPlaceholderData && "opacity-60")}>
        <table aria-label={label} aria-busy={result.isFetching} className="w-full table-fixed border-separate border-spacing-0 text-[13px]" style={{ minWidth }}>
          <colgroup>
            {headers.map((h) => (
              <col key={h.id} style={h.column.columnDef.meta?.grow && !table.state.columnSizing[h.id] ? undefined : { width: h.getSize() }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10 bg-card">
            <tr>
              {headers.map((h) => {
                const meta = h.column.columnDef.meta;
                const sorted = h.column.getIsSorted();
                const canSort = h.column.getCanSort();
                return (
                  <th
                    key={h.id}
                    scope="col"
                    aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                    className="relative h-10 border-b border-border px-3 text-start text-xs font-normal text-text-secondary"
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={h.column.getToggleSortingHandler()}
                        className={cn("inline-flex max-w-full items-center gap-1 rounded-sm hover:text-text focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", meta?.numeric && "ms-auto flex", sorted && "text-text")}
                      >
                        <span className="truncate"><table.FlexRender header={h} /></span>
                        {sorted === "asc" ? <ArrowUp className="size-3.5 shrink-0" /> : sorted === "desc" ? <ArrowDown className="size-3.5 shrink-0" /> : <ArrowUpDown className="size-3.5 shrink-0 opacity-40" />}
                      </button>
                    ) : (
                      <span className={cn("block truncate", meta?.numeric && "text-end")}><table.FlexRender header={h} /></span>
                    )}
                    {h.column.getCanResize() ? (
                      <span
                        aria-hidden
                        onMouseDown={h.getResizeHandler()}
                        onTouchStart={h.getResizeHandler()}
                        onDoubleClick={() => h.column.resetSize()}
                        className="absolute inset-y-2 end-0 w-1.5 cursor-col-resize touch-none rounded-full select-none hover:bg-border"
                      />
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {result.isPending
              ? Array.from({ length: 10 }, (_, i) => (
                  <tr key={i}>
                    {headers.map((h) => (
                      <td key={h.id} className="h-11 border-b border-border px-3"><Skeleton className="h-3.5 w-3/4" /></td>
                    ))}
                  </tr>
                ))
              : table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    onKeyDown={onRowClick ? (e) => { if (e.key === "Enter") onRowClick(row.original); } : undefined}
                    className={cn("hover:bg-muted", onRowClick && "cursor-pointer focus-visible:bg-muted focus-visible:outline-none")}
                  >
                    {row.getAllCells().map((cell) => {
                      const meta = cell.column.columnDef.meta;
                      return (
                        <td key={cell.id} className={cn("h-11 truncate border-b border-border px-3", meta?.numeric && "ltr-nums text-end", meta?.className)}>
                          <table.FlexRender cell={cell} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
          </tbody>
        </table>
        {result.isError ? <p className="p-6 text-center text-text-secondary">{t("errors.generic")}</p> : null}
        {result.isSuccess && rowCount === 0 ? <p className="p-10 text-center text-text-secondary">{t("table.empty")}</p> : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2 text-xs text-text-secondary">
        <div className="flex items-center gap-2">
          <span>{t("table.rowsPerPage")}</span>
          <Select value={String(size)} onValueChange={(v) => table.setPageSize(Number(v))}>
            <SelectTrigger className="h-8 w-[76px]" aria-label={t("table.rowsPerPage")}><SelectValue /></SelectTrigger>
            <SelectContent>{PAGE_SIZES.map((n) => <SelectItem key={n} value={String(n)}>{formatNumber(n, locale)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <span aria-live="polite">
          {t("table.range", { from: formatNumber(from, locale), to: formatNumber(to, locale), total: formatNumber(rowCount ?? 0, locale) })}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" disabled={!table.getCanPreviousPage()} onClick={() => table.firstPage()} aria-label={t("table.first")}><First /></Button>
          <Button variant="ghost" size="icon" className="size-8" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} aria-label={t("table.previous")}><Prev /></Button>
          <span className="px-2">{t("table.page", { page: formatNumber(pageIndex + 1, locale), pages: formatNumber(pageCount, locale) })}</span>
          <Button variant="ghost" size="icon" className="size-8" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} aria-label={t("table.next")}><Next /></Button>
          <Button variant="ghost" size="icon" className="size-8" disabled={!table.getCanNextPage()} onClick={() => table.lastPage()} aria-label={t("table.last")}><Last /></Button>
        </div>
      </div>
    </div>
  );
};
