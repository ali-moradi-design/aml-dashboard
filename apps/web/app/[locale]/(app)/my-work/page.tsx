import { Suspense } from "react";
import { MyWorkPage } from "@/_pages/my-work";

export default function Page() {
  return (
    <Suspense>
      <MyWorkPage />
    </Suspense>
  );
}
