"use client";

import { useTranslations } from "next-intl";
import { Users, Calendar, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { user } = useAuthStore();

  const stats = [
    {
      title: t("stats.totalEmployees"),
      value: "248",
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: t("stats.onLeave"),
      value: "12",
      icon: Calendar,
      color: "text-yellow-500",
    },
    {
      title: t("stats.pendingRequests"),
      value: "8",
      icon: Clock,
      color: "text-orange-500",
    },
    {
      title: t("stats.lateToday"),
      value: "3",
      icon: CheckCircle,
      color: "text-red-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("welcomeMessage", { name: user?.fullName || "User" })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
