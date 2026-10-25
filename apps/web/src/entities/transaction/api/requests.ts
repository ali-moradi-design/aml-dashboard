import { transactionPageSchema, type CriteriaGroup, type GridQuery } from "@aml/shared";
import { post } from "@/shared/api";

export type TransactionQuery = GridQuery & { criteria?: CriteriaGroup };

export const queryTransactions = (query: TransactionQuery) =>
  post("/transactions/query", transactionPageSchema, query);
