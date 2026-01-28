import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AuthRefreshProvider } from "@/components/providers/auth-refresh-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthRefreshProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="mr-64">
          <Header />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </AuthRefreshProvider>
  );
}
