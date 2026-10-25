import { Suspense } from "react";
import { HelpPage } from "@/_pages/help";

export default function Page() {
  return (
    <Suspense>
      <HelpPage />
    </Suspense>
  );
}
