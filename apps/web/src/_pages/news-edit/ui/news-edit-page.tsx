"use client";

import { useTranslation } from "react-i18next";
import { NewsEditor } from "@/features/news-editor";
import { useNewsPost } from "@/entities/news";
import { isHttpError } from "@/shared/api";
import { PageHeader, Panel } from "@/shared/ui/panel";
import { Skeleton } from "@/shared/ui/skeleton";

/** New post (no id) or edit an existing one. */
export const NewsEditPage = ({ id }: { id?: string }) => {
  const { t } = useTranslation();
  const { data: post, isPending, error } = useNewsPost(id ?? null);

  if (!id) {
    return (
      <>
        <PageHeader title={t("news.newTitle")} subtitle={t("news.newSubtitle")} />
        <NewsEditor />
      </>
    );
  }
  if (isPending) return <Skeleton className="h-[600px]" />;
  if (error || !post) return <Panel><p>{isHttpError(error) && error.status === 404 ? t("news.notFound") : t("errors.generic")}</p></Panel>;
  if (!post.canEdit) return <Panel><p>{t("news.cannotEdit")}</p></Panel>;
  return (
    <>
      <PageHeader title={t("news.editTitle")} subtitle={post.title} />
      {/* Keyed so the form starts from the loaded post. */}
      <NewsEditor key={post.id} post={post} />
    </>
  );
};
