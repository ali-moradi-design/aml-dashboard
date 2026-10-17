import { AppLayout } from "@/widgets/app-layout";

export default function SignedInLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
