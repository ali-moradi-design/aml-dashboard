"use client";

import { useTranslation } from "react-i18next";
import { OnboardingWizard } from "@/features/customer-onboarding";
import { PageHeader } from "@/shared/ui/panel";

export const CustomerNewPage = () => {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t("onboarding.title")} subtitle={t("onboarding.subtitle")} />
      <OnboardingWizard />
    </>
  );
};
