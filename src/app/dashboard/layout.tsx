import DashboardLayout from "@/components/DashboardLayout";
import { OrgProvider } from "@/lib/org-context";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <OrgProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </OrgProvider>
  );
}
