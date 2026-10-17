import { Suspense } from "react";
import { WorkflowPage } from "@/pages/workflow";

export default function Page() {
  return (
    <Suspense>
      <WorkflowPage />
    </Suspense>
  );
}
