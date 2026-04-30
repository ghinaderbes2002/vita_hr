"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Bell, CheckCheck, AlertTriangle, CheckCircle2, XCircle, Info, ExternalLink,
  Clock, FileWarning, CalendarX, User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from "@/lib/hooks/use-notifications";

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  LEAVE_REQUEST_PENDING_APPROVAL: {
    icon: AlertTriangle,
    color: "text-amber-500 bg-amber-50",
    label: "تأخر الموافقة",
  },
  LEAVE_REQUEST_SUBMITTED: {
    icon: Bell,
    color: "text-blue-500 bg-blue-50",
    label: "طلب إجازة جديد",
  },
  LEAVE_REQUEST_APPROVED: {
    icon: CheckCircle2,
    color: "text-green-500 bg-green-50",
    label: "إجازة مقبولة",
  },
  LEAVE_REQUEST_REJECTED: {
    icon: XCircle,
    color: "text-red-500 bg-red-50",
    label: "إجازة مرفوضة",
  },
  PROBATION_END_REMINDER: {
    icon: Clock,
    color: "text-orange-500 bg-orange-50",
    label: "انتهاء فترة التجربة",
  },
  CONTRACT_EXPIRY: {
    icon: CalendarX,
    color: "text-red-500 bg-red-50",
    label: "انتهاء العقد",
  },
  EMPLOYEES_WITHOUT_SCHEDULE: {
    icon: FileWarning,
    color: "text-amber-500 bg-amber-50",
    label: "بدون جدول دوام",
  },
  GENERAL: {
    icon: Info,
    color: "text-gray-500 bg-gray-100",
    label: "عام",
  },
};

function getConfig(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.GENERAL;
}

export default function NotificationsPage() {
  const locale = useLocale();
  const router = useRouter();

  const { data: notifications = [], isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifList: any[] = Array.isArray(notifications) ? notifications : [];
  const unreadCount = notifList.filter((n) => !n.isRead).length;
  const pendingApprovalList = notifList.filter((n) => n.type === "LEAVE_REQUEST_PENDING_APPROVAL");
  const hrAlertList = notifList.filter((n) =>
    ["PROBATION_END_REMINDER", "CONTRACT_EXPIRY", "EMPLOYEES_WITHOUT_SCHEDULE"].includes(n.type)
  );

  const handleClick = (notif: any) => {
    if (!notif.isRead) markAsRead.mutate(notif.id);
    if (notif.actionUrl) router.push(notif.actionUrl);
  };

  const handleViewEmployee = (e: React.MouseEvent, employeeId: string) => {
    e.stopPropagation();
    router.push(`/${locale}/employees/${employeeId}`);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الإشعارات</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">{unreadCount} إشعار غير مقروء</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            قراءة الكل
          </Button>
        )}
      </div>

      {/* Pending Approval Alert Section */}
      {pendingApprovalList.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              إجازات طبية تنتظر الموافقة منذ أكثر من 48 ساعة
              <Badge className="bg-amber-500 text-white ms-auto">{pendingApprovalList.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingApprovalList.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 rounded-lg border border-amber-200 bg-white px-4 py-3 cursor-pointer hover:bg-amber-50 transition-colors ${!n.isRead ? "border-amber-400" : ""}`}
                onClick={() => handleClick(n)}
              >
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.isRead ? "font-semibold" : "text-muted-foreground"}`}>{n.titleAr || n.titleEn || n.title}</p>
                  {(n.messageAr || n.message) && <p className="text-xs text-muted-foreground mt-0.5">{n.messageAr || n.message}</p>}
                  <p className="text-xs text-amber-600 mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ar })}
                  </p>
                </div>
                {n.actionUrl && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 shrink-0">
                    <ExternalLink className="h-3.5 w-3.5" />
                    عرض الطلب
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* HR Alerts Section */}
      {hrAlertList.length > 0 && (
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <FileWarning className="h-4 w-4" />
              تنبيهات HR
              <Badge className="bg-red-500 text-white ms-auto">{hrAlertList.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hrAlertList.map((n) => {
              const cfg = getConfig(n.type);
              const Icon = cfg.icon;
              const employeeId = n.data?.employeeId;
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 rounded-lg border bg-white px-4 py-3 cursor-pointer hover:bg-red-50 transition-colors ${!n.isRead ? "border-red-300" : "border-red-100"}`}
                  onClick={() => handleClick(n)}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.isRead ? "font-semibold" : "text-muted-foreground"}`}>
                      {n.titleAr || n.title}
                    </p>
                    {(n.messageAr || n.message) && (
                      <p className="text-xs text-muted-foreground mt-0.5">{n.messageAr || n.message}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <Badge variant="outline" className="text-xs">{cfg.label}</Badge>
                      {n.data?.daysRemaining !== undefined && (
                        <span className="text-xs text-red-600 font-medium">
                          متبقٍ: {n.data.daysRemaining} يوم
                        </span>
                      )}
                    </div>
                  </div>
                  {employeeId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 shrink-0 h-7 text-xs"
                      onClick={(e) => handleViewEmployee(e, employeeId)}
                    >
                      <User className="h-3 w-3" />
                      عرض الموظف
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* All Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            جميع الإشعارات
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : notifList.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">لا توجد إشعارات</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifList.map((notif) => {
                const cfg = getConfig(notif.type);
                const Icon = cfg.icon;
                return (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-muted/40 transition-colors ${
                      !notif.isRead
                        ? notif.type === "LEAVE_REQUEST_PENDING_APPROVAL"
                          ? "bg-amber-50/50"
                          : "bg-blue-50/30"
                        : ""
                    }`}
                    onClick={() => handleClick(notif)}
                  >
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${!notif.isRead ? "font-semibold" : "text-muted-foreground"}`}>
                          {notif.titleAr || notif.title}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          {!notif.isRead && (
                            <span className={`h-2 w-2 rounded-full ${
                              ["CONTRACT_EXPIRY","PROBATION_END_REMINDER","EMPLOYEES_WITHOUT_SCHEDULE"].includes(notif.type)
                                ? "bg-red-500"
                                : notif.type === "LEAVE_REQUEST_PENDING_APPROVAL"
                                ? "bg-amber-500"
                                : "bg-blue-500"
                            }`} />
                          )}
                          <Badge variant="outline" className="text-xs">{cfg.label}</Badge>
                        </div>
                      </div>
                      {(notif.messageAr || notif.message) && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notif.messageAr || notif.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {format(new Date(notif.createdAt), "yyyy/MM/dd HH:mm")} &middot;{" "}
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: ar })}
                      </p>
                    </div>
                    {notif.actionUrl && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
