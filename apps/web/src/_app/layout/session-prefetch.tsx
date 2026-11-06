import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { meSchema } from "@aml/shared";
import { sessionKeys } from "@/entities/session/server";
import { mySettingsSchema, settingsKeys } from "@/entities/settings/server";
import { serverRequest } from "@/shared/api/server";

/**
 * Server component in the dynamic part of the page (it reads the session cookie, so it sits
 * behind the layout's Suspense boundary). It loads the user and their settings on the server and
 * hands them to React Query, so the sidebar and app bar arrive in the same response instead of
 * waiting for two browser requests after hydration.
 */
export const SessionPrefetch = async ({ children }: { children: ReactNode }) => {
  const [me, settings] = await Promise.all([
    serverRequest("/auth/me", meSchema),
    serverRequest("/settings/me", mySettingsSchema),
  ]);
  const queryClient = new QueryClient();
  if (me) queryClient.setQueryData(sessionKeys.me(), me);
  if (settings) queryClient.setQueryData(settingsKeys.me(), settings);
  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
};
