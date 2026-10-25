import { describe, expect, it } from "vitest";
import type { CriteriaGroup } from "@aml/shared";
import { criteriaToWhere } from "./criteria-to-where";

describe("criteriaToWhere", () => {
  it("returns an empty filter for an empty group", () => {
    expect(criteriaToWhere({ kind: "group", combinator: "and", children: [] })).toEqual({});
  });

  it("builds nested AND/OR trees", () => {
    const tree: CriteriaGroup = {
      kind: "group",
      combinator: "and",
      children: [
        { kind: "condition", field: "channel", operator: "eq", value: "CASH" },
        {
          kind: "group",
          combinator: "or",
          children: [
            { kind: "condition", field: "baseAmount", operator: "between", value: [9000, 9999] },
            {
              kind: "condition",
              field: "counterpartyCountry",
              operator: "in",
              value: ["XA", "XB"],
            },
          ],
        },
      ],
    };
    expect(criteriaToWhere(tree)).toEqual({
      AND: [
        { channel: "CASH" },
        {
          OR: [
            { baseAmount: { gte: 9000, lte: 9999 } },
            { counterpartyCountry: { in: ["XA", "XB"] } },
          ],
        },
      ],
    });
  });

  it("matches text case-insensitively with contains", () => {
    expect(
      criteriaToWhere({
        kind: "group",
        combinator: "and",
        children: [
          { kind: "condition", field: "counterpartyName", operator: "contains", value: "trading" },
        ],
      }),
    ).toEqual({
      AND: [{ counterpartyName: { contains: "trading", mode: "insensitive" } }],
    });
  });

  it("filters by branch code through the relation", () => {
    expect(
      criteriaToWhere({
        kind: "group",
        combinator: "or",
        children: [
          { kind: "condition", field: "branchCode", operator: "in", value: ["BER", "LON"] },
        ],
      }),
    ).toEqual({
      OR: [{ branch: { code: { in: ["BER", "LON"] } } }],
    });
  });
});
