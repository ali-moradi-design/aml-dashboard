import { Suspense } from "react";
import { CustomersPage } from "@/pages/customers";

export default function Page() {
  return (
    <Suspense>
      <CustomersPage />
    </Suspense>
  );
}
