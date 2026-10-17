import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { NetworkQuery } from "@aml/shared";
import { getFeaturedCustomer, getNetwork, getNetworkPath } from "./requests";

export const networkKeys = {
  all: ["network"] as const,
  graph: (q: NetworkQuery) => [...networkKeys.all, "graph", q] as const,
  path: (q: object) => [...networkKeys.all, "path", q] as const,
  featured: () => [...networkKeys.all, "featured"] as const,
};

export const networkQueryOptions = (q: NetworkQuery) => ({ queryKey: networkKeys.graph(q), queryFn: () => getNetwork(q), staleTime: 60_000 });
export const useNetwork = (q: NetworkQuery | null) => useQuery({ ...networkQueryOptions(q!), enabled: Boolean(q), placeholderData: keepPreviousData });

export const useNetworkPath = (q: (Omit<NetworkQuery, "center" | "hops"> & { source: string; target: string }) | null) =>
  useQuery({ queryKey: networkKeys.path(q ?? {}), queryFn: () => getNetworkPath(q!), enabled: Boolean(q), staleTime: 60_000 });

export const useFeaturedCustomer = (enabled: boolean) => useQuery({ queryKey: networkKeys.featured(), queryFn: getFeaturedCustomer, enabled, staleTime: Infinity });
