"use client";

import { useTranslation } from "react-i18next";
import { useHealth } from "@/entities/system";

/** Small card that proves the web app can reach the API and the database. */
export const SystemStatus = () => {
  const { t } = useTranslation();
  const { data, isPending, isError } = useHealth();

  const dot = isError ? "bg-risk-high" : data?.database === "up" ? "bg-risk-low" : "bg-risk-medium";
  const text = isPending
    ? t("system.checking")
    : isError
      ? t("system.unreachable")
      : `${t("system.database")}: ${data.database}`;

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-6">
      <span className="text-xs text-text-secondary">{t("system.apiStatus")}</span>
      <div className="flex items-center gap-2 text-base">
        <span className={`size-2 rounded-full ${dot}`} aria-hidden />
        <span>{text}</span>
      </div>
    </section>
  );
};
