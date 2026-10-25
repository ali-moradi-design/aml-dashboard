import { Suspense } from "react";
import { AlertsPage } from "@/_pages/alerts";

export default function Page() {
  return (
    <Suspense>
      <AlertsPage />
    </Suspense>
  );
}
