import type { Response } from "express";
import type { Permission, RoleKey } from "@aml/shared";

/** The signed-in user as seen by services. Built once per request by the auth middleware. */
export type Principal = {
  userId: string;
  sessionId: string;
  email: string;
  name: string;
  role: RoleKey;
  roleName: string;
  clearanceRank: number;
  regionIds: string[];
  regions: Array<{ code: string; name: string }>;
  permissions: ReadonlySet<string>;
};

/**
 * Data scope for repositories. A record is visible only when its branch is in one of the
 * user's regions AND its clearance rank is not above the user's clearance.
 */
export type AccessScope = {
  regionIds: string[];
  clearanceRank: number;
};

export const scopeOf = (p: Principal): AccessScope => ({ regionIds: p.regionIds, clearanceRank: p.clearanceRank });

export const can = (p: Principal, permission: Permission) => p.permissions.has(permission);

export const principalOf = (res: Response): Principal => {
  const principal = res.locals.principal as Principal | undefined;
  if (!principal) throw new Error("principalOf() used on a route without requireAuth");
  return principal;
};
