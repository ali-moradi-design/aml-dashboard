import { Suspense } from "react";
import { NewsPage } from "@/pages/news";

export default function Page() {
  return (
    <Suspense>
      <NewsPage />
    </Suspense>
  );
}
