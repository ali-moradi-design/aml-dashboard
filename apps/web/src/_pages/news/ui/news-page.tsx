"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NewsCard, useNews } from "@/entities/news";
import { useCan } from "@/entities/session";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatNumber } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/panel";
import { Segmented } from "@/shared/ui/segmented";
import { Skeleton } from "@/shared/ui/skeleton";

type Show = "all" | "unread" | "scheduled";

export const NewsPage = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  const can = useCan();
  const manager = can("news.create");
  const { data, isPending, isError, refetch } = useNews();
  const [show, setShow] = useState<Show>("all");

  // Pinned posts first, then the newest.
  const sorted = [...(data ?? [])].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.publishAt.localeCompare(a.publishAt),
  );
  const visible = sorted.filter((p) =>
    show === "unread"
      ? !p.read && p.state === "live"
      : show === "scheduled"
        ? p.state === "scheduled"
        : true,
  );
  const unread = sorted.filter((p) => !p.read && p.state === "live").length;

  return (
    <>
      <PageHeader
        title={t("news.title")}
        subtitle={
          data ? t("news.subtitle", { count: unread, n: formatNumber(unread, locale) }) : undefined
        }
        actions={
          manager ? (
            <Button size="lg" asChild>
              <Link href={href("/news/new")}>
                <Plus /> {t("news.new")}
              </Link>
            </Button>
          ) : null
        }
      />
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
        <Segmented
          label={t("news.show")}
          value={show}
          onChange={setShow}
          options={[
            { value: "all", label: t("news.all") },
            { value: "unread", label: t("news.unreadOnly") },
            ...(manager ? [{ value: "scheduled" as const, label: t("news.scheduledOnly") }] : []),
          ]}
        />
      </div>
      {isError ? (
        <div className="rounded-lg border border-border bg-card p-6">
          <p>{t("errors.generic")}</p>
          <Button variant="outline" className="mt-3" onClick={() => refetch()}>
            {t("errors.retry")}
          </Button>
        </div>
      ) : isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : visible.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((p) => (
            <NewsCard key={p.id} post={p} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-border bg-card p-10 text-center text-text-secondary">
          {t("news.empty")}
        </p>
      )}
    </>
  );
};
