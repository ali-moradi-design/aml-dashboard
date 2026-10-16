import { healthSchema, type Health } from "@aml/shared";
import { request } from "@/shared/api";

/** Promise for GET /health. */
export const getHealth = (): Promise<Health> => request("/health", healthSchema);
