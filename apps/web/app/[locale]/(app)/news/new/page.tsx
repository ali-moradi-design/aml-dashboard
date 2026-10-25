import { Suspense } from "react";
import { NewsEditPage } from "@/_pages/news-edit";

export default function Page() {
  return (
    <Suspense>
      <NewsEditPage />
    </Suspense>
  );
}
