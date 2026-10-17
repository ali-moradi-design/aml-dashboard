import { Suspense } from "react";
import { CasesPage } from "@/pages/cases";

export default function Page() {
  return (
    <Suspense>
      <CasesPage />
    </Suspense>
  );
}
