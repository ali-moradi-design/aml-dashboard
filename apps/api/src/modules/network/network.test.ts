import { describe, expect, it } from "vitest";
import { buildNetwork, maskIban, rangeOf } from "./network.service";

const account = (id: string, regionId: string, clearanceRank = 1, customerId = `cust-${id}`) => ({
  id,
  iban: `DE89370400440532013${id.padStart(3, "0")}`,
  currency: "EUR",
  status: "ACTIVE",
  branch: { regionId },
  customer: {
    id: customerId,
    code: `CU-${id}`,
    name: `Customer ${id}`,
    type: "PERSON" as const,
    country: "DE",
    riskScore: 40,
    pep: false,
    clearanceRank,
    shareholders: [],
  },
  _count: { alerts: 1 },
});
const scope = { regionIds: ["EU"], clearanceRank: 2 };
const at = new Date("2026-10-01T10:00:00Z");

describe("account network", () => {
  it("masks accounts outside the user's region or clearance and hides their owner", () => {
    const g = buildNetwork({
      scope,
      center: "1",
      truncated: false,
      walked: [
        { id: "1", depth: 0 },
        { id: "2", depth: 1 },
        { id: "3", depth: 1 },
      ],
      accounts: [account("1", "EU"), account("2", "GULF"), account("3", "EU", 4)],
      transfers: [
        { source: "1", target: "2", amount: 5000, count: 2n, last_at: at },
        { source: "2", target: "3", amount: 900, count: 1n, last_at: at },
      ],
      externals: [],
    });
    const byId = new Map(g.nodes.map((n) => [n.id, n]));
    expect(byId.get("2")).toMatchObject({
      kind: "account",
      restricted: true,
      ownerCode: null,
      iban: "DE89 •••• 3002",
    });
    expect(byId.get("3")).toMatchObject({ restricted: true });
    expect(g.nodes.filter((n) => n.kind === "customer").map((n) => n.id)).toEqual(["c:cust-1"]);
    // a transfer between two restricted accounts is not shown
    expect(g.edges.filter((e) => e.kind === "transfer").map((e) => e.id)).toEqual(["t:1>2"]);
  });

  it("keeps few counterparties far from the center but every high-risk one", () => {
    const ext = (accountId: string, iban: string, country: string, rank: number) => ({
      account_id: accountId,
      iban,
      name: iban,
      country,
      out_amount: 1000,
      in_amount: 0,
      count: 1n,
      last_at: at,
      rank: BigInt(rank),
    });
    const g = buildNetwork({
      scope,
      center: "1",
      truncated: false,
      walked: [
        { id: "1", depth: 0 },
        { id: "2", depth: 2 },
      ],
      accounts: [account("1", "EU"), account("2", "EU")],
      transfers: [],
      externals: [
        ext("1", "GB1", "GB", 4),
        ext("1", "GB2", "GB", 5),
        ext("2", "FR1", "FR", 1),
        ext("2", "XA1", "XA", 7),
      ],
    });
    expect(
      g.nodes
        .filter((n) => n.kind === "external")
        .map((n) => n.id)
        .sort(),
    ).toEqual(["x:GB1", "x:XA1"]);
  });

  it("treats the end date as a whole day", () => {
    const r = rangeOf({ from: "2026-10-01", to: "2026-10-01", minAmount: 0 });
    expect(r.to.getTime() - r.from.getTime()).toBe(86_400_000);
    expect(maskIban("GB33BUKB20201555555555")).toBe("GB33 •••• 5555");
  });
});
