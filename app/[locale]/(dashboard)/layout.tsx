"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AuthRefreshProvider } from "@/components/providers/auth-refresh-provider";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useLocale } from "next-intl";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const locale = useLocale();
  const isRTL = locale === "ar";
  const { isAuthenticated } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

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
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div
          className="transition-all duration-300"
          style={{
            [isRTL ? 'marginRight' : 'marginLeft']: 'var(--sidebar-width, 16rem)'
          }}
        >
          <Header />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </AuthRefreshProvider>
  );
}
