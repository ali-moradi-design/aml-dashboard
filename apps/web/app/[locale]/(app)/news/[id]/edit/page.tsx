import { Suspense } from "react";
import { NewsEditPage } from "@/_pages/news-edit";

const Edit = async ({ params }: { params: Promise<{ id: string }> }) => <NewsEditPage id={(await params).id} />;

export default function Page({ params }: PageProps<"/[locale]/news/[id]/edit">) {
  return (
    <Suspense>
      <Edit params={params} />
    </Suspense>
  );
}
