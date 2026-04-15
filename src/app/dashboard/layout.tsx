import DashboardLayout from "@/components/DashboardLayout";
import { OrgProvider } from "@/lib/org-context";
import BookmarkTracker from "@/components/BookmarkTracker";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <OrgProvider>
      <BookmarkTracker />
      <DashboardLayout>{children}</DashboardLayout>
    </OrgProvider>
  );
}
