import { Suspense } from "react";
import { RuleEditPage } from "@/pages/rule-edit";

export default function Page() {
  return (
    <Suspense>
      <RuleEditPage />
    </Suspense>
  );
}
