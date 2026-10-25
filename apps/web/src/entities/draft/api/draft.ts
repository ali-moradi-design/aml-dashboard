"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { z } from "zod";
import { draftSchema } from "@aml/shared";
import { del, request } from "@/shared/api";

export type DraftKind = "case" | "customer";

export const draftKeys = { one: (kind: DraftKind) => ["drafts", kind] as const };

/** Promises for the autosave endpoints. */
export const getDraft = (kind: DraftKind) => request(`/drafts/${kind}`, draftSchema.nullable());
export const saveDraft = ({ kind, data, step }: { kind: DraftKind; data: unknown; step: number }) =>
  request(`/drafts/${kind}`, z.object({ updatedAt: z.string() }), {
    method: "PUT",
    body: JSON.stringify({ data, step }),
  });
export const deleteDraft = (kind: DraftKind) =>
  del(`/drafts/${kind}`, z.object({ ok: z.boolean() }));

export const useDraft = (kind: DraftKind) =>
  useQuery({
    queryKey: draftKeys.one(kind),
    queryFn: () => getDraft(kind),
    staleTime: Infinity,
    retry: false,
  });

export const useDeleteDraft = (kind: DraftKind) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteDraft(kind),
    onSuccess: () => qc.setQueryData(draftKeys.one(kind), null),
  });
};

/** Saves the form one second after the last change (only once the user has changed something). */
export const useAutosaveDraft = (
  kind: DraftKind,
  values: unknown,
  step: number,
  enabled: boolean,
) => {
  const save = useMutation({ mutationFn: saveDraft });
  const last = useRef("");
  const json = JSON.stringify(values);
  useEffect(() => {
    if (!enabled || json === last.current) return;
    const id = setTimeout(() => {
      last.current = json;
      save.mutate({ kind, data: JSON.parse(json), step });
    }, 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- save is stable enough; keyed on content
  }, [json, step, enabled, kind]);
  return { savedAt: save.data?.updatedAt ?? null, saving: save.isPending };
};
