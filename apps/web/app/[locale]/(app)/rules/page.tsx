import { Suspense } from "react";
import { RulesPage } from "@/_pages/rules";

export default function Page() {
  return (
    <Suspense>
      <RulesPage />
    </Suspense>
  );
}
