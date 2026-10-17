import { Suspense } from "react";
import { AlertDetailPage } from "@/pages/alert-detail";

const Detail = async ({ params }: { params: Promise<{ id: string }> }) => <AlertDetailPage id={(await params).id} />;

export default function Page({ params }: PageProps<"/[locale]/alerts/[id]">) {
  return (
    <Suspense>
      <Detail params={params} />
    </Suspense>
  );
}
