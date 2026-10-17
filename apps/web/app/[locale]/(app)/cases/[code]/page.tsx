import { Suspense } from "react";
import { CaseDetailPage } from "@/pages/case-detail";

const Detail = async ({ params }: { params: Promise<{ code: string }> }) => <CaseDetailPage code={(await params).code} />;

export default function Page({ params }: PageProps<"/[locale]/cases/[code]">) {
  return (
    <Suspense>
      <Detail params={params} />
    </Suspense>
  );
}
