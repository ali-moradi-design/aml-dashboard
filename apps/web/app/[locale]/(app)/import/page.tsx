import { Suspense } from "react";
import { ImportPage } from "@/_pages/import";

export default function Page() {
  return (
    <Suspense>
      <ImportPage />
    </Suspense>
  );
}
