import { describe, expect, it } from "vitest";
import { guardRolePermissions } from "../admin";
import { applyMapping, validateRows } from "../imports";
import { nextRun } from "../jobs";
import { excerptOf, sanitizeNews } from "../news";

const lookup = {
  branches: new Map([["BER", "b1"]]),
  takenEmails: new Set(["taken@example.com"]),
  accounts: new Map([["DE89370400440532013000", { id: "a1", branchId: "b1" }]]),
};

describe("data import", () => {
  it("maps file columns to fields and reports problems with file row numbers", () => {
    const rows = applyMapping(
      [
        { Name: "Anna Example", Kind: "PERSON", Land: "DE", Branch: "BER", Mail: "anna@example.com" },
        { Name: "B", Kind: "ROBOT", Land: "DE", Branch: "LON", Mail: "taken@example.com" },
        { Name: "Carl Example", Kind: "PERSON", Land: "DE", Branch: "BER", Mail: "anna@example.com" },
      ],
      { name: "Name", type: "Kind", country: "Land", branchCode: "Branch", email: "Mail" },
    );
    const r = validateRows("customers", rows, lookup);
    expect(r.valid.map((v) => v.row)).toEqual([2]);
    expect(r.issues).toEqual(expect.arrayContaining([
      { row: 3, field: "name", message: "errors.min3" },
      { row: 3, field: "type", message: "errors.customerType" },
      { row: 4, field: "email", message: "errors.emailTaken" },
    ]));
    expect(r.errorRows).toBe(2);
  });

  it("only accepts transactions on accounts the user may see", () => {
    const base = { bookedAt: "2026-10-01T10:00:00Z", amount: "1200.50", currency: "EUR", direction: "OUT", channel: "WIRE", counterpartyName: "Acme", counterpartyCountry: "FR" };
    const r = validateRows("transactions", [{ ...base, iban: "DE89 3704 0044 0532 0130 00" }, { ...base, iban: "GB33BUKB20201555555555" }], lookup);
    expect(r.valid).toHaveLength(1);
    expect(r.issues).toEqual([{ row: 3, field: "iban", message: "errors.unknownAccount" }]);
  });
});

describe("admin, news and jobs", () => {
  it("keeps admin rights on the admin role and drops unknown permissions", () => {
    expect(guardRolePermissions("ADMIN", ["cases.view", "made.up"])).toEqual(["cases.view", "admin.manage"]);
    expect(guardRolePermissions("ANALYST", ["cases.view", "cases.view"])).toEqual(["cases.view"]);
  });

  it("removes scripts and unsafe attributes from news and opens links safely", () => {
    const html = sanitizeNews('<p onclick="x()">Hi <script>alert(1)</script><a href="https://example.com">link</a><img src=x onerror=y></p>');
    expect(html).toBe('<p>Hi <a href="https://example.com" target="_blank" rel="noopener noreferrer">link</a></p>');
    expect(excerptOf("<p>One <strong>two</strong></p><p>three</p>")).toBe("One two three");
  });

  it("computes the next run in the job's time zone", () => {
    const next = nextRun("0 6 * * *", "Europe/Berlin", new Date("2026-10-17T10:00:00Z"));
    expect(next?.toISOString()).toBe("2026-10-18T04:00:00.000Z");
    expect(nextRun("not a cron", "Europe/Berlin")).toBeNull();
  });
});
