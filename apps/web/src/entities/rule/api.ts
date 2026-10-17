"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ruleDetailSchema, ruleRowSchema, type RuleForm } from "@aml/shared";
import { post, request } from "@/shared/api";

const codeSchema = z.object({ code: z.string() });

export const getRules = () => request("/rules", z.array(ruleRowSchema));
export const getRule = (code: string) => request(`/rules/${code}`, ruleDetailSchema);
export const createRule = (input: RuleForm) => post("/rules", codeSchema, input);
export const updateRule = (input: RuleForm) => request(`/rules/${input.code}`, codeSchema, { method: "PUT", body: JSON.stringify(input) });

export const ruleKeys = { all: ["rules"] as const, list: () => ["rules", "list"] as const, detail: (code: string) => ["rules", "detail", code] as const };

export const useRules = () => useQuery({ queryKey: ruleKeys.list(), queryFn: getRules });
export const useRule = (code: string, enabled = true) => useQuery({ queryKey: ruleKeys.detail(code), queryFn: () => getRule(code), enabled });

export const useSaveRule = (mode: "create" | "update") => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mode === "create" ? createRule : updateRule,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ruleKeys.all });
      void qc.invalidateQueries({ queryKey: ["reference"] });
    },
  });
};
