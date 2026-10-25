import { Suspense } from "react";
import { NewsPage } from "@/_pages/news";

export default function Page() {
  return (
    <Suspense>
      <NewsPage />
    </Suspense>
  );
}
