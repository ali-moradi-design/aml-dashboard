import { Suspense } from "react";
import { AdminPage } from "@/_pages/admin";

export default function Page() {
  return (
    <Suspense>
      <AdminPage />
    </Suspense>
  );
}
