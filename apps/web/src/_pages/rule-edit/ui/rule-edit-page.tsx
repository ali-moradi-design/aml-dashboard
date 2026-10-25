"use client";

import { useTranslation } from "react-i18next";
import { RuleForm } from "./rule-form";
import { useRule, useRuleText } from "@/entities/rule";
import { useCan } from "@/entities/session";
import { Panel, PageHeader } from "@/shared/ui/panel";
import { Skeleton } from "@/shared/ui/skeleton";

/** New rule when `code` is missing, otherwise edit (the code itself stays fixed). */
export const RuleEditPage = ({ code }: { code?: string }) => {
  const { t } = useTranslation();
  const can = useCan();
  const ruleText = useRuleText();
  const rule = useRule(code ?? "", Boolean(code));

  if (!can("rules.manage"))
    return (
      <Panel>
        <p>{t("ruleForm.noPermission")}</p>
      </Panel>
    );
  if (code && rule.isPending) return <Skeleton className="h-140" />;
  if (code && !rule.data)
    return (
      <Panel>
        <p>{t("ruleDetail.notFound")}</p>
      </Panel>
    );

  return (
    <>
      <PageHeader
        title={
          rule.data
            ? t("ruleForm.editTitle", { name: ruleText.name(rule.data.code, rule.data.name) })
            : t("ruleForm.newTitle")
        }
        subtitle={t("ruleForm.subtitle")}
      />
      <RuleForm rule={rule.data} />
    </>
  );
};
