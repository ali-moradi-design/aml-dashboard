"use client";

import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { IServerSideDatasource } from "ag-grid-community";
import { useMemo } from "react";

type Page<T> = { rows: T[]; rowCount: number };
type QueryOptions<T> = { queryKey: QueryKey; queryFn: () => Promise<Page<T>> };

/**
 * Bridges AG Grid's server-side row model and React Query: every block the grid asks for is
 * fetched through the entity's query options (same promise, same cache keys as the hooks).
 */
export const useServerDatasource = <T, F>(
  build: (block: { startRow: number; endRow: number; sortModel: Array<{ colId: string; sort: "asc" | "desc" }> }, filters: F) => QueryOptions<T>,
  filters: F,
  onCount?: (count: number) => void,
): IServerSideDatasource => {
  const qc = useQueryClient();
  const key = JSON.stringify(filters);
  return useMemo<IServerSideDatasource>(
    () => ({
      getRows: async (params) => {
        const { startRow = 0, endRow = 50, sortModel } = params.request;
        try {
          const page = await qc.fetchQuery({ ...build({ startRow, endRow, sortModel: sortModel as never }, filters), staleTime: 15_000 });
          onCount?.(page.rowCount);
          params.success({ rowData: page.rows, rowCount: page.rowCount });
        } catch {
          params.fail();
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild only when filters change
    [qc, key],
  );
};
