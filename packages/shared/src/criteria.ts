import { z } from "zod";

/**
 * AND/OR criteria tree, used by the rule builder and the transaction advanced search.
 * The same schema validates the form in the browser and the request in the API.
 */

export const criteriaFields = {
  baseAmount: { type: "number" },
  amount: { type: "number" },
  currency: { type: "enum", options: ["EUR", "USD", "TRY", "AED"] },
  channel: { type: "enum", options: ["CASH", "WIRE", "CARD", "ONLINE"] },
  direction: { type: "enum", options: ["IN", "OUT"] },
  counterpartyCountry: { type: "text" },
  counterpartyName: { type: "text" },
  branchCode: { type: "text" },
  bookedAt: { type: "date" },
} as const;

export type CriteriaField = keyof typeof criteriaFields;
export const criteriaFieldSchema = z.enum(Object.keys(criteriaFields) as [CriteriaField, ...CriteriaField[]]);

export const operatorsByType = {
  number: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "in"],
  enum: ["eq", "neq", "in"],
  text: ["eq", "neq", "contains", "in"],
  date: ["gte", "lte", "between"],
} as const;

export const operatorSchema = z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "between", "in", "contains"]);
export type Operator = z.infer<typeof operatorSchema>;

const valueSchema = z.union([z.string(), z.number(), z.array(z.string()), z.tuple([z.number(), z.number()]), z.tuple([z.string(), z.string()])]);

export const conditionSchema = z.object({
  kind: z.literal("condition"),
  field: criteriaFieldSchema,
  operator: operatorSchema,
  value: valueSchema,
});
export type Condition = z.infer<typeof conditionSchema>;

export type CriteriaGroup = {
  kind: "group";
  combinator: "and" | "or";
  children: Array<CriteriaGroup | Condition>;
};

export const criteriaGroupSchema: z.ZodType<CriteriaGroup> = z.lazy(() =>
  z.object({
    kind: z.literal("group"),
    combinator: z.enum(["and", "or"]),
    children: z.array(z.union([criteriaGroupSchema, conditionSchema])).max(30),
  }),
);

export const emptyCriteria = (): CriteriaGroup => ({ kind: "group", combinator: "and", children: [] });
