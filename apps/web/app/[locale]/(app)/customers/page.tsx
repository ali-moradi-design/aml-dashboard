import { Suspense } from "react";
import { CustomersPage } from "@/_pages/customers";

export default function Page() {
  return (
    <Suspense>
      <CustomersPage />
    </Suspense>
  );
}
