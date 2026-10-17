import { useQuery } from "@tanstack/react-query";
import { referenceSchema } from "@aml/shared";
import { request } from "@/shared/api";

export const referenceKeys = { all: ["reference"] as const };

/** Promise for GET /reference (branches in the user's regions, rules). */
export const getReference = () => request("/reference", referenceSchema);

export const useReference = () => useQuery({ queryKey: referenceKeys.all, queryFn: getReference, staleTime: 30 * 60_000 });
