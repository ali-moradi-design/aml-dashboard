"use client";

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { conditionFields, type WorkflowCondition } from "@aml/shared";
import { useLocale } from "@/shared/i18n/use-locale";
import { formatCompact } from "@/shared/lib/format";

const SYMBOL = { gt: ">", gte: "≥", lt: "<", lte: "≤", eq: "=", neq: "≠" } as const;
const VALUE_NAMESPACE = {
  riskLevel: "risk",
  priority: "priority",
  recommendation: "recommendation",
} as const;

/** "Amount > 1M", "Recommendation = File a SAR": a condition in a few words. */
export const useConditionText = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  return useCallback(
    (c: WorkflowCondition) => {
      const def = conditionFields[c.field];
      const value =
        def.type === "number"
          ? formatCompact(Number(c.value), locale)
          : t(`${VALUE_NAMESPACE[c.field as keyof typeof VALUE_NAMESPACE]}.${c.value}`);
      return `${t(`workflow.field.${c.field}`)} ${SYMBOL[c.operator]} ${value}`;
    },
    [t, locale],
  );
};
