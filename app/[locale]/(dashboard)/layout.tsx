import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AuthRefreshProvider } from "@/components/providers/auth-refresh-provider";
import { getLocale } from "next-intl/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const isRTL = locale === "ar";

  return (
    <AuthRefreshProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div
          className="transition-all duration-300"
          style={{
            [isRTL ? 'marginRight' : 'marginLeft']: 'var(--sidebar-width, 18rem)'
          }}
        >
          <Header />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </AuthRefreshProvider>
  );
}
