import { Suspense } from "react";
import { LoginPage } from "@/_pages/login";

export default function Page() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
