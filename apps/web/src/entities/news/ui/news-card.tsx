"use client";

import Link from "next/link";
import { Megaphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { NewsRow } from "@aml/shared";
import { apiUrl } from "@/shared/api";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatDate } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { NewsStateBadge, PinnedBadge, ReadMeter } from "./news-badges";

/** One post in the news list and the overview widget. Unread posts get a dot before the title. */
export const NewsCard = ({ post, compact }: { post: NewsRow; compact?: boolean }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  return (
    <Link
      href={href(`/news/${post.id}`)}
      className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {!compact ? (
        post.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- cover served by the API
          <img src={apiUrl(post.coverUrl)} alt="" className="aspect-[16/7] w-full object-cover" />
        ) : (
          <div className="grid aspect-[16/7] w-full place-items-center bg-muted text-text-secondary" aria-hidden>
            <Megaphone className="size-8" strokeWidth={1.25} />
          </div>
        )
      ) : null}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {post.pinned ? <PinnedBadge /> : null}
          {post.readCount !== null ? <NewsStateBadge state={post.state} /> : null}
          <span className="text-xs text-text-secondary">
            {post.authorName} · <time dateTime={post.publishAt}>{formatDate(post.publishAt, locale)}</time>
          </span>
        </div>
        <h2 className={cn("flex items-start gap-2 text-base text-text group-hover:text-link", !post.read && "text-heading")}>
          {!post.read ? <span className="mt-2 size-2 shrink-0 rounded-full bg-brand" aria-label={t("news.unread")} /> : null}
          <span className="line-clamp-2">{post.title}</span>
        </h2>
        {!compact ? <p className="line-clamp-3 text-sm text-text-secondary">{post.excerpt}</p> : null}
        {post.readCount !== null && post.audienceSize !== null && post.state !== "scheduled" ? (
          <div className="mt-auto pt-2">
            <ReadMeter read={post.readCount} total={post.audienceSize} />
          </div>
        ) : null}
      </div>
    </Link>
  );
};
