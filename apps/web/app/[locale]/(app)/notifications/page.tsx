import { Suspense } from "react";
import { NotificationsPage } from "@/pages/notifications";

export default function Page() {
  return (
    <Suspense>
      <NotificationsPage />
    </Suspense>
  );
}
