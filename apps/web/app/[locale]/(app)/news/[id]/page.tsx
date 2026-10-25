import { Suspense } from "react";
import { NewsDetailPage } from "@/_pages/news-detail";

const Detail = async ({ params }: { params: Promise<{ id: string }> }) => <NewsDetailPage id={(await params).id} />;

export default function Page({ params }: PageProps<"/[locale]/news/[id]">) {
  return (
    <Suspense>
      <Detail params={params} />
    </Suspense>
  );
}
