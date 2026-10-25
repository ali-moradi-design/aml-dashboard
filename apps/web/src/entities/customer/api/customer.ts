"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  customerPageSchema,
  customerProfileSchema,
  type CustomerOnboarding,
  type GridQuery,
  type KycUpdate,
} from "@aml/shared";
import { post, request } from "@/shared/api";

const codeSchema = z.object({ code: z.string() });

// Promises: one per API call.
export const queryCustomers = (q: GridQuery) => post("/customers/query", customerPageSchema, q);
export const getCustomer = (code: string) => request(`/customers/${code}`, customerProfileSchema);
export const createCustomer = (input: CustomerOnboarding) => post("/customers", codeSchema, input);
export const updateKyc = ({ code, ...input }: KycUpdate & { code: string }) =>
  request(`/customers/${code}/kyc`, codeSchema, { method: "PUT", body: JSON.stringify(input) });
export const checkEmail = (email: string) =>
  request(
    `/customers/check-email?email=${encodeURIComponent(email)}`,
    z.object({ available: z.boolean() }),
  );
export const checkIban = (iban: string) =>
  request(
    `/customers/check-iban?iban=${encodeURIComponent(iban)}`,
    z.object({ valid: z.boolean(), available: z.boolean() }),
  );

export const customerKeys = {
  all: ["customers"] as const,
  list: (q: GridQuery) => [...customerKeys.all, "list", q] as const,
  detail: (code: string) => [...customerKeys.all, "detail", code] as const,
};

// Hooks: one per API call.
export const customersQueryOptions = (q: GridQuery) => ({
  queryKey: customerKeys.list(q),
  queryFn: () => queryCustomers(q),
});
export const useCustomers = (q: GridQuery) => useQuery(customersQueryOptions(q));
export const useCustomer = (code: string) =>
  useQuery({ queryKey: customerKeys.detail(code), queryFn: () => getCustomer(code) });

export const useCreateCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => qc.invalidateQueries({ queryKey: customerKeys.all }),
  });
};

export const useUpdateKyc = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateKyc,
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: customerKeys.detail(v.code) }),
  });
};
