import { describe, expect, it } from "vitest";
import {
  caseScopeSchema,
  ibanFrom,
  isValidIban,
  onboardingIdentitySchema,
  onboardingProfileSchema,
  onboardingShareholdersSchema,
} from "@aml/shared";

const messages = (r: {
  success: boolean;
  error?: { issues: Array<{ path: PropertyKey[]; message: string }> };
}) => (r.success ? [] : r.error!.issues.map((i) => `${i.path.join(".")}:${i.message}`));

describe("shared form rules", () => {
  it("validates IBAN check digits", () => {
    expect(isValidIban("DE89 3704 0044 0532 0130 00")).toBe(true);
    expect(isValidIban("DE89 3704 0044 0532 0130 01")).toBe(false);
  });

  it("builds IBANs whose check digits validate", () => {
    expect(ibanFrom("DE", "370400440532013000")).toBe("DE89370400440532013000");
    for (const [country, bban] of [
      ["GB", "635884208138746299"],
      ["TR", "0006100519786457841326"],
      ["XA", "0123456789012345678"],
    ]) {
      expect(isValidIban(ibanFrom(country!, bban!))).toBe(true);
    }
  });

  it("requires person fields only for persons", () => {
    expect(messages(onboardingIdentitySchema.safeParse({ type: "PERSON" }))).toContain(
      "firstName:errors.required",
    );
    expect(messages(onboardingIdentitySchema.safeParse({ type: "COMPANY" }))).toContain(
      "companyName:errors.required",
    );
    expect(messages(onboardingIdentitySchema.safeParse({ type: "COMPANY" }))).not.toContain(
      "firstName:errors.required",
    );
  });

  it("rejects customers under 18", () => {
    const young = new Date();
    young.setFullYear(young.getFullYear() - 16);
    const r = onboardingIdentitySchema.safeParse({
      type: "PERSON",
      firstName: "Ana",
      lastName: "Lee",
      dateOfBirth: young.toISOString().slice(0, 10),
      nationality: "DE",
      occupation: "Student",
    });
    expect(messages(r)).toContain("dateOfBirth:errors.adult");
  });

  it("needs shareholders to add up to 100%", () => {
    const sh = (sharePercent: number) => ({
      name: "Owner",
      type: "PERSON",
      country: "DE",
      sharePercent,
      documents: [{ kind: "passport", number: "X1234567", expiresAt: "" }],
    });
    expect(
      messages(
        onboardingShareholdersSchema.safeParse({ type: "COMPANY", shareholders: [sh(60), sh(30)] }),
      ),
    ).toContain("shareholders:errors.shares100");
    expect(
      onboardingShareholdersSchema.safeParse({ type: "COMPANY", shareholders: [sh(60), sh(40)] })
        .success,
    ).toBe(true);
    expect(
      onboardingShareholdersSchema.safeParse({ type: "PERSON", shareholders: [] }).success,
    ).toBe(true);
  });

  it("keeps the minimum below the maximum", () => {
    expect(
      messages(
        onboardingProfileSchema.safeParse({
          sourceOfFunds: "salary",
          expectedMonthlyVolume: 1000,
          minTransaction: 500,
          maxTransaction: 100,
          pep: false,
        }),
      ),
    ).toContain("maxTransaction:errors.minBelowMax");
  });

  it("keeps the case period start before its end", () => {
    const r = caseScopeSchema.safeParse({
      periodStart: "2026-05-01",
      periodEnd: "2026-04-01",
      totalAmount: 10,
      summary: "x".repeat(40),
    });
    expect(messages(r)).toContain("periodEnd:errors.startBeforeEnd");
  });
});
