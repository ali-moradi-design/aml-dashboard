import { Suspense } from "react";
import { CasesPage } from "@/_pages/cases";

export default function Page() {
  return (
    <Suspense>
      <CasesPage />
    </Suspense>
  );
}
