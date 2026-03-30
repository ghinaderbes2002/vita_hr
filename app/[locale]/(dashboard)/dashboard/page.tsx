"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Users, Calendar, Clock, AlertCircle, PlusCircle, ClipboardList, Package, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { user } = useAuthStore();
  const locale = useLocale();
  const router = useRouter();

  const stats = [
    {
      title: t("stats.totalEmployees"),
      value: "248",
      icon: Users,
      iconBg: "bg-blue-50 dark:bg-blue-950",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: t("stats.onLeave"),
      value: "12",
      icon: Calendar,
      iconBg: "bg-amber-50 dark:bg-amber-950",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      title: t("stats.pendingRequests"),
      value: "8",
      icon: Clock,
      iconBg: "bg-orange-50 dark:bg-orange-950",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
    {
      title: t("stats.lateToday"),
      value: "3",
      icon: AlertCircle,
      iconBg: "bg-red-50 dark:bg-red-950",
      iconColor: "text-red-600 dark:text-red-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("welcomeMessage", { name: user?.fullName || "User" })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground font-medium truncate">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold mt-2 tracking-tight">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl shrink-0 ${stat.iconBg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto flex-col gap-2 py-4"
              onClick={() => router.push(`/${locale}/employees`)}>
              <Users className="h-5 w-5" />
              <span className="text-xs">الموظفون</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4"
              onClick={() => router.push(`/${locale}/requests/new`)}>
              <PlusCircle className="h-5 w-5" />
              <span className="text-xs">طلب جديد</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4"
              onClick={() => router.push(`/${locale}/requests/all`)}>
              <ClipboardList className="h-5 w-5" />
              <span className="text-xs">كل الطلبات</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4"
              onClick={() => router.push(`/${locale}/custodies`)}>
              <Package className="h-5 w-5" />
              <span className="text-xs">العهد</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
