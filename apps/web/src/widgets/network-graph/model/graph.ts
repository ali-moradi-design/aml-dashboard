import Graph from "graphology";
import louvain from "graphology-communities-louvain";
import type { NetworkEdge, NetworkNode } from "@aml/shared";

export type Cluster = { id: number; nodes: string[]; accounts: number; amount: number; highRisk: boolean };

/** Pure: node size by kind and weight, so customers and the center stand out. */
export const nodeSize = (n: NetworkNode, isCenter: boolean) => {
  const base = n.kind === "customer" ? (n.pep ? 13 : 11) : n.kind === "account" ? 6 + Math.min(n.openAlerts, 4) : n.kind === "shareholder" ? 6 : 5;
  return isCenter ? base + 5 : base;
};

/** Pure: edge width grows with the money moved (log scale, so one huge transfer does not hide the rest). */
export const edgeSize = (e: NetworkEdge) => (e.kind === "owns" ? 0.8 : Math.min(7, Math.max(0.7, 0.6 + Math.log10(e.amount / 1000 + 1) * 1.8)));

export const nodeLabel = (n: NetworkNode, restricted: string) =>
  n.kind === "customer" ? n.name : n.kind === "account" ? (n.restricted ? restricted : `•••• ${n.iban.slice(-4)}`) : n.name;

/** 0-100 risk used for color: the customer's score, or "high" for high-risk countries. */
export const nodeRisk = (n: NetworkNode): number | null =>
  n.kind === "customer" ? n.riskScore : n.kind === "account" ? n.riskScore : n.kind === "external" ? (n.highRisk ? 90 : null) : null;

/**
 * Pure: groups of accounts that move money mostly among themselves (Louvain on transfer edges,
 * owners attached to their accounts). Clusters of three or more accounts are worth a look.
 */
export const detectClusters = (nodes: NetworkNode[], edges: NetworkEdge[]): { communities: Map<string, number>; clusters: Cluster[] } => {
  const g = new Graph({ type: "undirected", multi: false });
  for (const n of nodes) g.addNode(n.id);
  for (const e of edges) {
    if (e.source === e.target || !g.hasNode(e.source) || !g.hasNode(e.target)) continue;
    const weight = e.kind === "owns" ? 3 : Math.log10(e.amount + 10);
    if (g.hasEdge(e.source, e.target)) g.updateEdgeAttribute(e.source, e.target, "weight", (w: number) => w + weight);
    else g.addEdge(e.source, e.target, { weight });
  }
  if (!g.size) return { communities: new Map(), clusters: [] };
  const mapping = louvain(g, { getEdgeWeight: "weight", rng: seeded(7) });
  const communities = new Map(Object.entries(mapping));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const groups = new Map<number, string[]>();
  for (const [id, c] of communities) groups.set(c, [...(groups.get(c) ?? []), id]);
  const clusters = [...groups.entries()]
    .map(([id, members]): Cluster => {
      const set = new Set(members);
      return {
        id,
        nodes: members,
        accounts: members.filter((m) => byId.get(m)?.kind === "account").length,
        amount: edges.filter((e) => e.kind === "transfer" && set.has(e.source) && set.has(e.target)).reduce((s, e) => s + e.amount, 0),
        highRisk: members.some((m) => {
          const n = byId.get(m);
          return n?.kind === "external" && n.highRisk;
        }),
      };
    })
    .filter((c) => c.accounts >= 3)
    .sort((a, b) => b.amount - a.amount);
  return { communities, clusters };
};

/** Small deterministic RNG so the same graph always gets the same clusters and layout. */
export const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

/** Merges graph pieces (first load, expansions, a path) without duplicates. */
export const mergeGraphs = (pieces: Array<{ nodes: NetworkNode[]; edges: NetworkEdge[] }>) => {
  const nodes = new Map<string, NetworkNode>();
  const edges = new Map<string, NetworkEdge>();
  for (const p of pieces) {
    for (const n of p.nodes) {
      const prev = nodes.get(n.id);
      // keep the depth closest to the center
      nodes.set(n.id, prev?.kind === "account" && n.kind === "account" ? { ...n, depth: Math.min(prev.depth, n.depth) } : n);
    }
    for (const e of p.edges) edges.set(e.id, e);
  }
  return { nodes: [...nodes.values()], edges: [...edges.values()].filter((e) => nodes.has(e.source) && nodes.has(e.target)) };
};
