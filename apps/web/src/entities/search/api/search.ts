"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { searchResultSchema } from "@aml/shared";
import { request } from "@/shared/api";

export const search = (q: string) =>
  request(`/search?${new URLSearchParams({ q })}`, searchResultSchema);

export const searchKeys = {
  all: ["search"] as const,
  query: (q: string) => ["search", q] as const,
};

/** Customers, cases and alerts for the command palette; starts at two characters. */
export const useSearch = (q: string) =>
  useQuery({
    queryKey: searchKeys.query(q),
    queryFn: () => search(q),
    enabled: q.trim().length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
