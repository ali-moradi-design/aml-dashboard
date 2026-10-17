import { z } from "zod";
import { workflowIssueSchema, workflowOverviewSchema, workflowVersionSchema, type WorkflowDraftInput } from "@aml/shared";
import { del, post, request } from "@/shared/api";

export const getWorkflow = (key: string) => request(`/workflows/${key}`, workflowOverviewSchema);
export const getWorkflowVersion = (id: string) => request(`/workflows/versions/${id}`, workflowVersionSchema);
export const createWorkflowDraft = (key: string) => post(`/workflows/${key}/draft`, z.object({ id: z.string() }), {});
export const saveWorkflowDraft = ({ id, ...input }: WorkflowDraftInput & { id: string }) =>
  request(`/workflows/versions/${id}`, z.object({ issues: z.array(workflowIssueSchema) }), { method: "PUT", body: JSON.stringify(input) });
export const discardWorkflowDraft = (id: string) => del(`/workflows/versions/${id}`, z.object({ ok: z.boolean() }));
export const publishWorkflow = (id: string) => post(`/workflows/versions/${id}/publish`, z.object({ id: z.string(), version: z.number() }), {});
