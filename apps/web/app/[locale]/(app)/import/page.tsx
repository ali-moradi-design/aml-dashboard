import { Suspense } from "react";
import { ImportPage } from "@/pages/import";

export default function Page() {
  return (
    <Suspense>
      <ImportPage />
    </Suspense>
  );
}
