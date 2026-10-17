"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useOverview } from "@/entities/overview";
import { useMe } from "@/entities/session";
import { useHref } from "@/shared/i18n/use-locale";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/panel";
import { Skeleton } from "@/shared/ui/skeleton";
import { AlertHeatmap, AlertTrend, ReviewFunnel, RiskByBranch, RulesBreakdown } from "./charts";
import { KpiRow } from "./kpi-row";
import { LatestNews } from "./latest-news";
import { NeedsDecision } from "./needs-decision";

const greetingKey = () => {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
};

export const OverviewPage = () => {
  const { t } = useTranslation();
  const href = useHref();
  const { data: me } = useMe();
  const { data, isPending, isError, refetch } = useOverview();

  return (
    <>
      <PageHeader
        title={t("overview.title")}
        subtitle={
          me && data
            ? t("overview.subtitle", {
                greeting: t(`overview.greeting.${greetingKey()}`),
                name: me.name.split(" ")[0],
                count: data.kpis.highRiskAlerts,
              })
            : undefined
        }
        actions={
          <Button variant="outline" size="lg" asChild>
            <Link href={href("/reports")}>
              <Download /> {t("overview.export")}
            </Link>
          </Button>
        }
      />

      {isError ? (
        <div className="rounded-lg border border-border bg-card p-6">
          <p>{t("errors.generic")}</p>
          <Button variant="outline" className="mt-3" onClick={() => refetch()}>
            {t("errors.retry")}
          </Button>
        </div>
      ) : isPending ? (
        <>
          <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32" />)}</div>
          <Skeleton className="h-96" />
        </>
      ) : (
        <>
          <KpiRow data={data} />
          <div className="flex flex-col gap-6 xl:flex-row">
            <AlertTrend data={data} />
            <RulesBreakdown data={data} />
          </div>
          <div className="flex flex-col gap-6 xl:flex-row">
            <AlertHeatmap data={data} />
            <ReviewFunnel data={data} />
          </div>
          <div className="flex flex-col gap-6 xl:flex-row">
            <NeedsDecision data={data} />
            <RiskByBranch data={data} />
          </div>
          <LatestNews />
        </>
      )}
    </>
  );
};
