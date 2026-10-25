"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { z } from "zod";
import {
  notificationPageSchema,
  notificationSchema,
  type AppNotification,
  type NotificationType,
} from "@aml/shared";
import { post, request } from "@/shared/api";
import { getSocket } from "@/shared/api/socket";

type Filter = { unread?: boolean; type?: NotificationType };
const qs = (f: Filter & { cursor?: string }) =>
  new URLSearchParams(
    Object.entries({
      unread: f.unread ? "true" : undefined,
      type: f.type,
      cursor: f.cursor,
    }).filter(([, v]) => v) as Array<[string, string]>,
  ).toString();

export const getNotifications = (f: Filter & { cursor?: string }) =>
  request(`/notifications?${qs(f)}`, notificationPageSchema);
export const markNotificationsRead = (body: { ids?: string[]; all?: boolean }) =>
  post("/notifications/read", z.object({ updated: z.number() }), body);

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (f: Filter) => ["notifications", "list", f] as const,
  latest: () => ["notifications", "latest"] as const,
};

/** Latest items and the unread count for the bell. */
export const useLatestNotifications = () =>
  useQuery({
    queryKey: notificationKeys.latest(),
    queryFn: () => getNotifications({}),
    staleTime: 30_000,
  });

export const useNotificationList = (f: Filter) =>
  useInfiniteQuery({
    queryKey: notificationKeys.list(f),
    queryFn: ({ pageParam }) => getNotifications({ ...f, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

export const useMarkRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
};

/** A pushed notification refreshes the bell and the center; the callback can show a toast. */
export const useNotificationsLive = (onNew?: (n: AppNotification) => void) => {
  const qc = useQueryClient();
  useEffect(() => {
    const socket = getSocket();
    const handler = (payload: unknown) => {
      void qc.invalidateQueries({ queryKey: notificationKeys.all });
      const parsed = notificationSchema.safeParse(payload);
      if (parsed.success) onNew?.(parsed.data);
    };
    socket.on("notification", handler);
    return () => {
      socket.off("notification", handler);
    };
  }, [qc, onNew]);
};
