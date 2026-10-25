"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { jobRowSchema, jobRunSchema, type JobInput } from "@aml/shared";
import { post, request } from "@/shared/api";

export const getJobs = () => request("/jobs", z.array(jobRowSchema));
export const getJobRuns = (key: string) => request(`/jobs/${key}/runs`, z.array(jobRunSchema));
export const updateJob = ({ key, ...input }: JobInput & { key: string }) => request(`/jobs/${key}`, z.object({ key: z.string() }), { method: "PUT", body: JSON.stringify(input) });
export const runJob = (key: string) => post(`/jobs/${key}/run`, z.object({ id: z.string(), status: z.string() }), {});

export const jobKeys = { all: ["jobs"] as const, list: () => ["jobs", "list"] as const, runs: (key: string) => ["jobs", "runs", key] as const };

export const useJobs = () => useQuery({ queryKey: jobKeys.list(), queryFn: getJobs, refetchInterval: 30_000 });
export const useJobRuns = (key: string | null) => useQuery({ queryKey: jobKeys.runs(key ?? ""), queryFn: () => getJobRuns(key!), enabled: Boolean(key) });

const useInvalidate = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: jobKeys.all });
};
export const useUpdateJob = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: updateJob, onSuccess: invalidate });
};
export const useRunJob = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: runJob, onSuccess: invalidate });
};
