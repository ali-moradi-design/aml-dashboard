import { Suspense } from "react";
import { NetworkPage } from "@/_pages/network";

export default function Page() {
  return (
    <Suspense>
      <NetworkPage />
    </Suspense>
  );
}
