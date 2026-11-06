import { Suspense } from "react";
import { AppLayout, AppShellSkeleton, SessionPrefetch } from "@/_app/layout";

/**
 * Partial prerendering: the skeleton is the static shell, served at once from the build.
 * SessionPrefetch reads the session cookie, so everything inside the boundary streams in the
 * same response with the user and settings already loaded.
 */
export default function SignedInLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <SessionPrefetch>
        <AppLayout>{children}</AppLayout>
      </SessionPrefetch>
    </Suspense>
  );
}
