"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { importBatchSchema, type ImportValidate } from "@aml/shared";
import { post, request } from "@/shared/api";

export const getImports = () => request("/imports", z.array(importBatchSchema));
export const validateImport = (input: ImportValidate) => post("/imports/validate", importBatchSchema, input);
export const commitImport = (id: string) => post(`/imports/${id}/commit`, z.object({ id: z.string(), imported: z.number() }), {});
export const discardImport = (id: string) => post(`/imports/${id}/discard`, z.object({ ok: z.boolean() }), {});

export const importKeys = { all: ["imports"] as const, list: () => ["imports", "list"] as const };

export const useImports = () => useQuery({ queryKey: importKeys.list(), queryFn: getImports });

const useInvalidate = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: importKeys.all });
};
export const useValidateImport = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: validateImport, onSuccess: invalidate });
};
export const useCommitImport = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: commitImport, onSuccess: invalidate });
};
export const useDiscardImport = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: discardImport, onSuccess: invalidate });
};
