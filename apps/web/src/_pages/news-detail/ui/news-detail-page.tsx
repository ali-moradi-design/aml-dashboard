"use client";

import Link from "next/link";
import { ArrowLeft, Paperclip, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  NewsStateBadge,
  PinnedBadge,
  ReadMeter,
  useDeleteNews,
  useMarkNewsRead,
  useNewsPost,
} from "@/entities/news";
import { apiUrl, isHttpError } from "@/shared/api";
import { useHref, useLocale } from "@/shared/i18n/use-locale";
import { formatDate, formatDateTime, formatNumber, formatRelative } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Panel, PanelHeader } from "@/shared/ui/panel";
import { Skeleton } from "@/shared/ui/skeleton";

const fileSize = (bytes: number, locale: Parameters<typeof formatNumber>[1]) =>
  bytes >= 1024 * 1024
    ? `${formatNumber(bytes / 1024 / 1024, locale, { maximumFractionDigits: 1 })} MB`
    : `${formatNumber(Math.ceil(bytes / 1024), locale)} KB`;

export const NewsDetailPage = ({ id }: { id: string }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const href = useHref();
  const router = useRouter();
  const { data: post, isPending, error } = useNewsPost(id);
  const markRead = useMarkNewsRead();
  const remove = useDeleteNews();
  const [confirm, setConfirm] = useState(false);
  const marked = useRef(false);

  // Opening a live post counts as reading it (once per visit).
  useEffect(() => {
    if (post && !post.read && post.state === "live" && !marked.current) {
      marked.current = true;
      markRead.mutate(post.id);
    }
  }, [post, markRead]);

  if (isPending) return <Skeleton className="h-150" />;
  if (error || !post)
    return (
      <Panel>
        <p>
          {isHttpError(error) && error.status === 404 ? t("news.notFound") : t("errors.generic")}
        </p>
      </Panel>
    );

  return (
    <>
      <Link
        href={href("/news")}
        className="flex w-fit items-center gap-1.5 text-sm text-link hover:underline"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" /> {t("news.back")}
      </Link>
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <article className="min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-card">
          {post.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- cover served by the API
            <img src={apiUrl(post.coverUrl)} alt="" className="aspect-16/6 w-full object-cover" />
          ) : null}
          <div className="flex flex-col gap-4 p-8">
            <div className="flex flex-wrap items-center gap-2">
              {post.pinned ? <PinnedBadge /> : null}
              {post.canEdit ? <NewsStateBadge state={post.state} /> : null}
              <span className="text-sm text-text-secondary">
                {t("news.byline", { author: post.authorName })} ·{" "}
                <time dateTime={post.publishAt} title={formatDateTime(post.publishAt, locale)}>
                  {formatDate(post.publishAt, locale, { dateStyle: "long" })}
                </time>
              </span>
            </div>
            <h1 className="text-2xl text-heading">{post.title}</h1>
            {/* Sanitized on the server (sanitize-html) when the post is saved and again when it is read. */}
            <div className="news-body" dangerouslySetInnerHTML={{ __html: post.body }} />
            {post.attachments.length ? (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <p className="text-xs text-text-secondary">{t("news.attachments")}</p>
                <ul className="flex flex-wrap gap-2">
                  {post.attachments.map((a) => (
                    <li key={a.id}>
                      <a
                        href={apiUrl(`/news/files/${a.id}`)}
                        className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                      >
                        <Paperclip className="size-4 text-text-secondary" /> {a.name}{" "}
                        <span className="text-xs text-text-secondary">
                          {fileSize(a.size, locale)}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </article>

        {post.canEdit ? (
          <aside className="flex w-full flex-col gap-6 xl:w-85">
            <Panel>
              <PanelHeader eyebrow={t("news.manage")} />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" asChild>
                  <Link href={href(`/news/${post.id}/edit`)}>
                    <Pencil /> {t("news.edit")}
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="text-risk-high-text"
                  onClick={() => setConfirm(true)}
                >
                  <Trash2 /> {t("news.delete")}
                </Button>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-text-secondary">{t("news.publishAt")}</dt>
                  <dd>{formatDateTime(post.publishAt, locale)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-text-secondary">{t("news.expiresAt")}</dt>
                  <dd>
                    {post.expiresAt ? formatDateTime(post.expiresAt, locale) : t("news.never")}
                  </dd>
                </div>
              </dl>
            </Panel>
            {post.readers && post.audienceSize !== null ? (
              <Panel>
                <PanelHeader
                  eyebrow={t("news.readers")}
                  title={
                    post.readers.length
                      ? t("news.readersInsight", {
                          count: post.audienceSize - post.readers.length,
                          n: formatNumber(post.audienceSize - post.readers.length, locale),
                        })
                      : t("news.noReaders")
                  }
                />
                <ReadMeter read={post.readers.length} total={post.audienceSize} />
                <ul className="flex max-h-80 flex-col divide-y divide-border overflow-y-auto">
                  {post.readers.map((r) => (
                    <li
                      key={`${r.name}-${r.readAt}`}
                      className="flex items-center justify-between gap-3 py-2 text-sm"
                    >
                      <span>{r.name}</span>
                      <time
                        className="text-xs text-text-secondary"
                        dateTime={r.readAt}
                        title={formatDateTime(r.readAt, locale)}
                      >
                        {formatRelative(r.readAt, locale)}
                      </time>
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}
          </aside>
        ) : null}
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("news.deleteTitle")}</DialogTitle>
            <DialogDescription>{t("news.deleteHint")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              {t("forms.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(post.id, { onSuccess: () => router.replace(href("/news")) })
              }
            >
              {t("news.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
