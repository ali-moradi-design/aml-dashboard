"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { adminReferenceSchema, adminUserSchema, auditPageSchema, type BranchInput, type GridQuery, type RoleKey, type UserInput } from "@aml/shared";
import { post, request } from "@/shared/api";

const put = <T>(path: string, schema: z.ZodType<T>, body: unknown) => request(path, schema, { method: "PUT", body: JSON.stringify(body) });

export const getAdminReference = () => request("/admin/reference", adminReferenceSchema);
export const getAdminUsers = () => request("/admin/users", z.array(adminUserSchema));
export const saveUser = ({ id, ...input }: UserInput & { id?: string }) => (id ? put(`/admin/users/${id}`, adminUserSchema, input) : post("/admin/users", adminUserSchema, input));
export const saveRolePermissions = ({ role, permissions }: { role: RoleKey; permissions: string[] }) => put(`/admin/roles/${role}`, z.object({ role: z.string(), permissions: z.array(z.string()) }), { permissions });
export const saveBranch = ({ id, ...input }: BranchInput & { id?: string }) => (id ? put(`/admin/branches/${id}`, z.object({ id: z.string() }), input) : post("/admin/branches", z.object({ id: z.string() }), input));
export const renameClearance = ({ rank, name }: { rank: number; name: string }) => put(`/admin/clearance/${rank}`, z.object({ ok: z.boolean() }), { name });
export const queryAudit = (q: GridQuery) => post("/admin/audit", auditPageSchema, q);

export const adminKeys = {
  all: ["admin"] as const,
  reference: () => ["admin", "reference"] as const,
  users: () => ["admin", "users"] as const,
  audit: (q: GridQuery) => ["admin", "audit", q] as const,
};

export const useAdminReference = () => useQuery({ queryKey: adminKeys.reference(), queryFn: getAdminReference });
export const useAdminUsers = () => useQuery({ queryKey: adminKeys.users(), queryFn: getAdminUsers });
export const auditQueryOptions = (q: GridQuery) => ({ queryKey: adminKeys.audit(q), queryFn: () => queryAudit(q) });

const useInvalidate = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: adminKeys.all });
};
export const useSaveUser = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: saveUser, onSuccess: invalidate });
};
export const useSaveRolePermissions = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: saveRolePermissions, onSuccess: invalidate });
};
export const useSaveBranch = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: saveBranch, onSuccess: invalidate });
};
export const useRenameClearance = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: renameClearance, onSuccess: invalidate });
};
