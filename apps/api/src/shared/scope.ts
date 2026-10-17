import type { Prisma } from "../generated/prisma/client";
import type { AccessScope } from "./access";

// Layers 2 (region) and 3 (clearance) of the access model, applied in every query.

export const alertScope = (s: AccessScope): Prisma.AlertWhereInput => ({
  branch: { regionId: { in: s.regionIds } },
  clearanceRank: { lte: s.clearanceRank },
});

export const transactionScope = (s: AccessScope): Prisma.TransactionWhereInput => ({
  branch: { regionId: { in: s.regionIds } },
  account: { customer: { clearanceRank: { lte: s.clearanceRank } } },
});

export const customerScope = (s: AccessScope): Prisma.CustomerWhereInput => ({
  branch: { regionId: { in: s.regionIds } },
  clearanceRank: { lte: s.clearanceRank },
});
