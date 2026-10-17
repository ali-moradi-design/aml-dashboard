import { Suspense } from "react";
import { RulesPage } from "@/pages/rules";

export default function Page() {
  return (
    <Suspense>
      <RulesPage />
    </Suspense>
  );
}
