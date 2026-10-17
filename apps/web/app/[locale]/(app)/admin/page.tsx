import { Suspense } from "react";
import { AdminPage } from "@/pages/admin";

export default function Page() {
  return (
    <Suspense>
      <AdminPage />
    </Suspense>
  );
}
