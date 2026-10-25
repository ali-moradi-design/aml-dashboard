"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";

/** Rule names and descriptions come from the database in English; show the translation when one exists. */
export const useRuleText = () => {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      name: (code: string, fallback: string) => t(`ruleName.${code}`, { defaultValue: fallback }),
      description: (code: string, fallback: string) =>
        t(`ruleDescription.${code}`, { defaultValue: fallback }),
    }),
    [t],
  );
};
