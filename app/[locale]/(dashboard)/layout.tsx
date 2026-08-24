"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AuthRefreshProvider } from "@/components/providers/auth-refresh-provider";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useLocale } from "next-intl";
import { useMailNotification } from "@/lib/hooks/use-mail";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const locale = useLocale();
  const { isAuthenticated } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  useMailNotification();

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace(`/${locale}/login`);
    }
  }, [isAuthenticated, locale, router, hydrated]);

  if (!hydrated || !isAuthenticated) {
    return null;
  }

  return (
    <AuthRefreshProvider>
      <div className="min-h-screen">
        <Sidebar />
        {/* `dashboard-shift` keeps the sidebar gutter on lg+ only — below that the
            sidebar is an overlay drawer, so the content spans the full width. */}
        <div className="dashboard-shift transition-all duration-300 min-w-0">
          <Header />
          <main className="p-3 sm:p-4 lg:p-6 space-y-2 min-w-0 overflow-x-clip">{children}</main>
        </div>
      </div>
    </AuthRefreshProvider>
  );
}
