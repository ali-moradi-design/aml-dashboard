import { Suspense } from "react";
import { NetworkPage } from "@/pages/network";

export default function Page() {
  return (
    <Suspense>
      <NetworkPage />
    </Suspense>
  );
}
