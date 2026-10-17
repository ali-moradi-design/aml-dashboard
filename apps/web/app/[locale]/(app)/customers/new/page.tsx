import { Suspense } from "react";
import { CustomerNewPage } from "@/pages/customer-new";

export default function Page() {
  return (
    <Suspense>
      <CustomerNewPage />
    </Suspense>
  );
}
