import { Suspense } from "react";
import { RuleDetailPage } from "@/_pages/rule-detail";

const Detail = async ({ params }: { params: Promise<{ code: string }> }) => <RuleDetailPage code={(await params).code} />;

export default function Page({ params }: PageProps<"/[locale]/rules/[code]">) {
  return (
    <Suspense>
      <Detail params={params} />
    </Suspense>
  );
}
