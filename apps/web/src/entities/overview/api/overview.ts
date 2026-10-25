import { useQuery } from "@tanstack/react-query";
import { overviewSchema } from "@aml/shared";
import { request } from "@/shared/api";

export const overviewKeys = { all: ["overview"] as const };

/** Promise for GET /overview. */
export const getOverview = () => request("/overview", overviewSchema);

/** Hook for GET /overview, refreshed every minute. */
export const useOverview = () =>
  useQuery({ queryKey: overviewKeys.all, queryFn: getOverview, refetchInterval: 60_000 });
