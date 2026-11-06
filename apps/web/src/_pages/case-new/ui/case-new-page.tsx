"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CaseWizard } from "./case-wizard";
import { Note, PageHeader } from "@/shared/ui/panel";

export const CaseNewPage = ({ fromAlert }: { fromAlert?: string }) => {
  const { t } = useTranslation();
  // ?alert= comes from the URL, so it can name an alert that does not exist or is out of reach.
  const [prefillFailed, setPrefillFailed] = useState(false);
  const prefilled = fromAlert && !prefillFailed;
  return (
    <>
      <PageHeader
        title={t("caseNew.title")}
        subtitle={prefilled ? t("caseNew.fromAlert", { code: fromAlert }) : t("caseNew.subtitle")}
      />
      {prefillFailed ? <Note tone="danger">{t("alertDetail.notFound")}</Note> : null}
      <CaseWizard fromAlert={fromAlert} onPrefillFailed={() => setPrefillFailed(true)} />
    </>
  );
};
