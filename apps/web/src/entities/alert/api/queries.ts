import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GridQuery } from "@aml/shared";
import { decideAlert, getAlert, queryAlerts } from "./requests";

export const alertKeys = {
  all: ["alerts"] as const,
  lists: () => [...alertKeys.all, "list"] as const,
  list: (q: GridQuery) => [...alertKeys.lists(), q] as const,
  detail: (id: string) => [...alertKeys.all, "detail", id] as const,
};

export const alertsQueryOptions = (q: GridQuery) => ({
  queryKey: alertKeys.list(q),
  queryFn: () => queryAlerts(q),
});

export const useAlerts = (q: GridQuery) => useQuery(alertsQueryOptions(q));

export const useAlert = (id: string) =>
  useQuery({ queryKey: alertKeys.detail(id), queryFn: () => getAlert(id) });

export const useDecideAlert = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: decideAlert,
    onSuccess: () => {
      // Details are cached by code (from the URL) or by id, so refresh every detail query.
      void qc.invalidateQueries({ queryKey: [...alertKeys.all, "detail"] });
      void qc.invalidateQueries({ queryKey: alertKeys.lists() });
      void qc.invalidateQueries({ queryKey: ["overview"] });
    },
  });
};
