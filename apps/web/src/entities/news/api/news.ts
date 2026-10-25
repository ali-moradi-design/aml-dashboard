"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { newsDetailSchema, newsRowSchema, type NewsInput } from "@aml/shared";
import { del, post, request, upload } from "@/shared/api";

const uploaded = z.object({ id: z.string(), name: z.string(), size: z.number(), url: z.string() });

export const getNews = () => request("/news", z.array(newsRowSchema));
export const getNewsPost = (id: string) => request(`/news/${id}`, newsDetailSchema);
export const createNews = (input: NewsInput) => post("/news", z.object({ id: z.string() }), input);
export const updateNews = ({ id, ...input }: NewsInput & { id: string }) =>
  request(`/news/${id}`, z.object({ id: z.string() }), {
    method: "PUT",
    body: JSON.stringify(input),
  });
export const deleteNews = (id: string) => del(`/news/${id}`, z.object({ ok: z.boolean() }));
export const markNewsRead = (id: string) =>
  post(`/news/${id}/read`, z.object({ ok: z.boolean() }), {});
export const uploadNewsFile = ({
  file,
  kind,
  name,
}: {
  file: Blob;
  kind: "cover" | "file";
  name?: string;
}) => upload(`/news/uploads?kind=${kind}`, uploaded, file, name);

export const newsKeys = {
  all: ["news"] as const,
  list: () => ["news", "list"] as const,
  detail: (id: string) => ["news", "detail", id] as const,
};

export const useNews = () => useQuery({ queryKey: newsKeys.list(), queryFn: getNews });
export const useNewsPost = (id: string | null) =>
  useQuery({
    queryKey: newsKeys.detail(id ?? ""),
    queryFn: () => getNewsPost(id!),
    enabled: Boolean(id),
  });

const useInvalidate = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: newsKeys.all });
};
export const useSaveNews = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: NewsInput & { id?: string }) =>
      v.id ? updateNews(v as NewsInput & { id: string }) : createNews(v),
    onSuccess: invalidate,
  });
};
export const useDeleteNews = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: deleteNews, onSuccess: invalidate });
};
export const useMarkNewsRead = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: markNewsRead, onSuccess: invalidate });
};
export const useUploadNewsFile = () => useMutation({ mutationFn: uploadNewsFile });
