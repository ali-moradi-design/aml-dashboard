import { Suspense } from "react";
import { NotificationsPage } from "@/_pages/notifications";

export default function Page() {
  return (
    <Suspense>
      <NotificationsPage />
    </Suspense>
  );
}
