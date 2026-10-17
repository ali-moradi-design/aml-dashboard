import { Suspense } from "react";
import { CustomerProfilePage } from "@/pages/customer-profile";

const Profile = async ({ params }: { params: Promise<{ code: string }> }) => <CustomerProfilePage code={(await params).code} />;

export default function Page({ params }: PageProps<"/[locale]/customers/[code]">) {
  return (
    <Suspense>
      <Profile params={params} />
    </Suspense>
  );
}
