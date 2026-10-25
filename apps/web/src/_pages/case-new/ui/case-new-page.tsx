"use client";

import { useTranslation } from "react-i18next";
import { CaseWizard } from "./case-wizard";
import { PageHeader } from "@/shared/ui/panel";

export const CaseNewPage = ({ fromAlert }: { fromAlert?: string }) => {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t("caseNew.title")} subtitle={fromAlert ? t("caseNew.fromAlert", { code: fromAlert }) : t("caseNew.subtitle")} />
      <CaseWizard fromAlert={fromAlert} />
    </>
  );
};
