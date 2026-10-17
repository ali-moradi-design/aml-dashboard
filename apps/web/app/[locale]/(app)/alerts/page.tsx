import { Suspense } from "react";
import { AlertsPage } from "@/pages/alerts";

export default function Page() {
  return (
    <Suspense>
      <AlertsPage />
    </Suspense>
  );
}
