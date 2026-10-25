import { z } from "zod";
import {
  alertDetailSchema,
  alertPageSchema,
  alertStatuses,
  type AlertDecision,
  type GridQuery,
} from "@aml/shared";
import { post, request } from "@/shared/api";

export const queryAlerts = (query: GridQuery) => post("/alerts/query", alertPageSchema, query);
export const getAlert = (id: string) => request(`/alerts/${id}`, alertDetailSchema);
export const decideAlert = ({ id, ...input }: AlertDecision & { id: string }) =>
  post(
    `/alerts/${id}/decision`,
    z.object({ id: z.string(), status: z.enum(alertStatuses) }),
    input,
  );
