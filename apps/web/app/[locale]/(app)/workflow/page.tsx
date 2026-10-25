import { Suspense } from "react";
import { WorkflowPage } from "@/_pages/workflow";

export default function Page() {
  return (
    <Suspense>
      <WorkflowPage />
    </Suspense>
  );
}
