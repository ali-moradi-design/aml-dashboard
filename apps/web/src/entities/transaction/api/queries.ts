import { useQuery } from "@tanstack/react-query";
import { queryTransactions, type TransactionQuery } from "./requests";

export const transactionKeys = {
  all: ["transactions"] as const,
  list: (q: TransactionQuery) => [...transactionKeys.all, "list", q] as const,
};

export const transactionsQueryOptions = (q: TransactionQuery) => ({
  queryKey: transactionKeys.list(q),
  queryFn: () => queryTransactions(q),
});

export const useTransactions = (q: TransactionQuery) => useQuery(transactionsQueryOptions(q));
