import { Suspense } from "react";
import { JobsPage } from "@/_pages/jobs";

export default function Page() {
  return (
    <Suspense>
      <JobsPage />
    </Suspense>
  );
}
