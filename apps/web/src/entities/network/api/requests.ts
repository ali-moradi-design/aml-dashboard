import { z } from "zod";
import { networkGraphSchema, networkPathSchema, type NetworkQuery } from "@aml/shared";
import { request } from "@/shared/api";

const qs = (params: Record<string, string | number>) => new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();

export const getNetwork = (q: NetworkQuery) => request(`/network?${qs(q)}`, networkGraphSchema);
export const getNetworkPath = (q: Omit<NetworkQuery, "center" | "hops"> & { source: string; target: string }) => request(`/network/path?${qs(q)}`, networkPathSchema);
export const getFeaturedCustomer = () => request("/network/featured", z.object({ code: z.string().nullable() }));
