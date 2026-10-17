"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { NewsCard, useNews } from "@/entities/news";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatNumber } from "@/shared/lib/format";
import { Panel, PanelHeader } from "@/shared/ui/panel";
import { Skeleton } from "@/shared/ui/skeleton";

/** The three newest live posts, pinned ones first. */
export const LatestNews = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  const { data, isPending } = useNews();
  const live = (data ?? []).filter((p) => p.state === "live").sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.publishAt.localeCompare(a.publishAt));
  const unread = live.filter((p) => !p.read).length;
  if (!isPending && !live.length) return null;

  return (
    <Panel>
      <PanelHeader
        eyebrow={t("overview.news.eyebrow")}
        title={unread ? t("overview.news.unread", { count: unread, n: formatNumber(unread, locale) }) : t("overview.news.allRead")}
        actions={<Link href={href("/news")} className="text-sm text-link hover:underline">{t("overview.news.all")}</Link>}
      />
      {isPending ? (
        <Skeleton className="h-32" />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">{live.slice(0, 3).map((p) => <NewsCard key={p.id} post={p} compact />)}</div>
      )}
    </Panel>
  );
};
