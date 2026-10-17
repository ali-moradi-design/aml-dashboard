import { Suspense } from "react";
import { ReportsPage } from "@/pages/reports";

export default function Page() {
  return (
    <Suspense>
      <ReportsPage />
    </Suspense>
  );
}
