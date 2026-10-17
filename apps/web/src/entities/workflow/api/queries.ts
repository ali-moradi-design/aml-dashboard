import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createWorkflowDraft, discardWorkflowDraft, getWorkflow, getWorkflowVersion, publishWorkflow, saveWorkflowDraft } from "./requests";

export const workflowKeys = {
  all: ["workflows"] as const,
  overview: (key: string) => [...workflowKeys.all, "overview", key] as const,
  version: (id: string) => [...workflowKeys.all, "version", id] as const,
};

export const useWorkflow = (key: string) => useQuery({ queryKey: workflowKeys.overview(key), queryFn: () => getWorkflow(key) });
export const useWorkflowVersion = (id: string | null) => useQuery({ queryKey: workflowKeys.version(id ?? ""), queryFn: () => getWorkflowVersion(id!), enabled: Boolean(id) });

const useInvalidate = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: workflowKeys.all });
};

export const useCreateWorkflowDraft = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: createWorkflowDraft, onSuccess: invalidate });
};
export const useSaveWorkflowDraft = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: saveWorkflowDraft, onSuccess: invalidate });
};
export const useDiscardWorkflowDraft = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: discardWorkflowDraft, onSuccess: invalidate });
};
export const usePublishWorkflow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: publishWorkflow,
    // New cases start on the new version; case pages show "newer version available" from now on.
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: workflowKeys.all }), qc.invalidateQueries({ queryKey: ["cases"] })]),
  });
};
