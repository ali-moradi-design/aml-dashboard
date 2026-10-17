import { z } from "zod";

// Account network graph: customers, accounts, outside counterparties and shareholders as nodes;
// transfers and ownership as edges. Built from Postgres recursive queries (no graph database).

export const networkQuerySchema = z.object({
  /** A customer code (CU-...) or an account id. */
  center: z.string().min(1),
  hops: z.coerce.number().int().min(1).max(3).default(2),
  from: z.string().date(),
  to: z.string().date(),
  minAmount: z.coerce.number().min(0).default(0),
});
export type NetworkQuery = z.infer<typeof networkQuerySchema>;

export const networkNodeSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("customer"), id: z.string(), code: z.string(), name: z.string(), type: z.enum(["PERSON", "COMPANY"]),
    country: z.string(), riskScore: z.number(), pep: z.boolean(), openAlerts: z.number(),
  }),
  z.object({
    kind: z.literal("account"), id: z.string(), iban: z.string(), currency: z.string(), status: z.string(), depth: z.number(),
    /** Outside the user's regions or clearance: shown masked and never expanded. */
    restricted: z.boolean(), ownerCode: z.string().nullable(), riskScore: z.number().nullable(), openAlerts: z.number(),
  }),
  z.object({ kind: z.literal("external"), id: z.string(), iban: z.string(), name: z.string(), country: z.string(), highRisk: z.boolean() }),
  z.object({ kind: z.literal("shareholder"), id: z.string(), name: z.string(), type: z.enum(["PERSON", "COMPANY"]), country: z.string() }),
]);
export type NetworkNode = z.infer<typeof networkNodeSchema>;

export const networkEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  kind: z.enum(["transfer", "owns"]),
  /** EUR for transfers, share in percent for ownership. */
  amount: z.number(),
  count: z.number(),
  lastAt: z.string().nullable(),
});
export type NetworkEdge = z.infer<typeof networkEdgeSchema>;

export const networkGraphSchema = z.object({
  center: z.string().nullable(),
  nodes: z.array(networkNodeSchema),
  edges: z.array(networkEdgeSchema),
  /** True when the walk hit the node limit; the user can narrow the time range or raise the minimum amount. */
  truncated: z.boolean(),
});
export type NetworkGraph = z.infer<typeof networkGraphSchema>;

/** Shortest chain of transfers between two accounts, with the nodes needed to draw it. */
export const networkPathSchema = z.object({ path: z.array(z.string()), graph: networkGraphSchema });
export type NetworkPath = z.infer<typeof networkPathSchema>;
