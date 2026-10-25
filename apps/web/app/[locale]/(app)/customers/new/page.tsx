import { Suspense } from "react";
import { CustomerNewPage } from "@/_pages/customer-new";

export default function Page() {
  return (
    <Suspense>
      <CustomerNewPage />
    </Suspense>
  );
}
