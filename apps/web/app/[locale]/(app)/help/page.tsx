import { Suspense } from "react";
import { HelpPage } from "@/pages/help";

export default function Page() {
  return (
    <Suspense>
      <HelpPage />
    </Suspense>
  );
}
