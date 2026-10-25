import { Suspense } from "react";
import { ReportsPage } from "@/_pages/reports";

export default function Page() {
  return (
    <Suspense>
      <ReportsPage />
    </Suspense>
  );
}
