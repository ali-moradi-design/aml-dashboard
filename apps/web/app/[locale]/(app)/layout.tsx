import { AppLayout } from "@/_app/layout";

export default function SignedInLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
