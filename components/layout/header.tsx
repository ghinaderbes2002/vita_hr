"use client";

import { useTranslations, useLocale } from "next-intl";
import { useTheme } from "next-themes";
import {
  Bell, Moon, Sun, Globe, LogOut, CheckCheck, ExternalLink, AlertTriangle, Settings,
  Clock, AlertCircle, RotateCcw, FileText, AlertOctagon, Coffee, DollarSign,
  Stethoscope, CalendarClock, Package, Users, Mail, Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useUnreadCount, useNotifications, useMarkAsRead, useMarkAllAsRead } from "@/lib/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export function Header() {
  const t = useTranslations();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: notifications = [] } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifList: any[] = Array.isArray(notifications) ? notifications : [];

  const changeLocale = (locale: "ar" | "en" | "tr") => {
    router.replace(pathname, { locale });
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const EVAL_NOTIF_TYPES = ["PROBATION_END_REMINDER", "EVALUATION_ASSIGNED"];

  type NotifCfg = {
    icon: React.ComponentType<{ className?: string }> | null;
    iconClass: string;
    bgClass: string;
    dotClass: string;
    route?: string;
  };

  const NOTIF_CONFIG: Record<string, NotifCfg> = {
    LEAVE_REQUEST_PENDING_APPROVAL:  { icon: AlertTriangle, iconClass: "text-amber-500",  bgClass: "bg-amber-50/60 dark:bg-amber-950/20",  dotClass: "bg-amber-500" },
    TARDINESS_BALANCE_USED:          { icon: Clock,         iconClass: "text-yellow-500", bgClass: "bg-yellow-50/60 dark:bg-yellow-950/20", dotClass: "bg-yellow-500", route: "/leaves/my-hourly-balance" },
    TARDINESS_BALANCE_LOW:           { icon: AlertCircle,   iconClass: "text-orange-500", bgClass: "bg-orange-50/60 dark:bg-orange-950/20", dotClass: "bg-orange-500", route: "/leaves/my-hourly-balance" },
    TARDINESS_BALANCE_DEPLETED:      { icon: AlertTriangle, iconClass: "text-red-500",    bgClass: "bg-red-50/60 dark:bg-red-950/20",       dotClass: "bg-red-500",    route: "/leaves/my-hourly-balance" },
    TARDINESS_COMPENSATION_DUE:      { icon: Bell,          iconClass: "text-yellow-500", bgClass: "bg-yellow-50/60 dark:bg-yellow-950/20", dotClass: "bg-yellow-500" },
    TARDINESS_DEDUCTION_PENDING:     { icon: DollarSign,    iconClass: "text-red-500",    bgClass: "bg-red-50/60 dark:bg-red-950/20",       dotClass: "bg-red-500",    route: "/payroll" },
    TARDINESS_OFFSET_RESTORED:       { icon: RotateCcw,     iconClass: "text-green-500",  bgClass: "bg-green-50/60 dark:bg-green-950/20",   dotClass: "bg-green-500",  route: "/leaves/my-hourly-balance" },
    MONTHLY_PAYROLL_READY:           { icon: FileText,      iconClass: "text-blue-500",   bgClass: "bg-blue-50/60 dark:bg-blue-950/20",     dotClass: "bg-blue-500",   route: "/payroll" },
    ATTENDANCE_NEEDS_REVIEW:         { icon: AlertOctagon,  iconClass: "text-orange-500", bgClass: "bg-orange-50/60 dark:bg-orange-950/20", dotClass: "bg-orange-500", route: "/attendance/needs-review" },
    BREAK_EXCEEDED:                  { icon: Coffee,        iconClass: "text-orange-500", bgClass: "bg-orange-50/60 dark:bg-orange-950/20", dotClass: "bg-orange-500", route: "/attendance/records" },
    ANOMALY_OVERTIME:                { icon: AlertCircle,   iconClass: "text-orange-500", bgClass: "bg-orange-50/60 dark:bg-orange-950/20", dotClass: "bg-orange-500", route: "/attendance/needs-review" },
    ANOMALY_MANY_STAMPS:             { icon: AlertCircle,   iconClass: "text-orange-500", bgClass: "bg-orange-50/60 dark:bg-orange-950/20", dotClass: "bg-orange-500", route: "/attendance/needs-review" },
    ANOMALY_NO_STAMP:                { icon: AlertCircle,   iconClass: "text-red-500",    bgClass: "bg-red-50/60 dark:bg-red-950/20",       dotClass: "bg-red-500",    route: "/attendance/needs-review" },
    CLINIC_APPOINTMENT_REMINDER:     { icon: CalendarClock, iconClass: "text-teal-500",   bgClass: "bg-teal-50/60 dark:bg-teal-950/20",     dotClass: "bg-teal-500",   route: "/clinic/appointments" },
    CLINIC_CASE_STATUS_CHANGED:      { icon: Stethoscope,   iconClass: "text-indigo-500", bgClass: "bg-indigo-50/60 dark:bg-indigo-950/20", dotClass: "bg-indigo-500", route: "/clinic/prosthetics" },
    CLINIC_LOW_STOCK:                { icon: Package,       iconClass: "text-orange-500", bgClass: "bg-orange-50/60 dark:bg-orange-950/20", dotClass: "bg-orange-500", route: "/clinic/inventory" },
    CLINIC_COMMITTEE_PENDING:        { icon: Users,         iconClass: "text-purple-500", bgClass: "bg-purple-50/60 dark:bg-purple-950/20", dotClass: "bg-purple-500", route: "/clinic/prosthetics" },
    CLINIC_DELIVERY_READY:           { icon: Stethoscope,   iconClass: "text-green-500",  bgClass: "bg-green-50/60 dark:bg-green-950/20",   dotClass: "bg-green-500",  route: "/clinic/prosthetics" },
    INFO:                            { icon: Mail,          iconClass: "text-blue-500",   bgClass: "bg-blue-50/60 dark:bg-blue-950/20",     dotClass: "bg-blue-500" },
    PENALTY_DECISION:                { icon: AlertTriangle, iconClass: "text-red-500",    bgClass: "bg-red-50/60 dark:bg-red-950/20",       dotClass: "bg-red-500" },
    REWARD_DECISION:                 { icon: Trophy,        iconClass: "text-amber-500",  bgClass: "bg-amber-50/60 dark:bg-amber-950/20",   dotClass: "bg-amber-500" },
  };

  const DEFAULT_NOTIF_CFG: NotifCfg = {
    icon: null, iconClass: "text-blue-500", bgClass: "bg-blue-50/50 dark:bg-blue-950/20", dotClass: "bg-blue-500",
  };

  const getEvalLink = (notif: any): string | null => {
    const evalId = notif.data?.evaluationId;
    if (!evalId) return null;
    return `/${locale}/probation-evaluations/${evalId}`;
  };

  const handleNotifClick = (notif: any) => {
    if (!notif.isRead) markAsRead.mutate(notif.id);
    const evalLink = EVAL_NOTIF_TYPES.includes(notif.type) ? getEvalLink(notif) : null;
    const mailLink = notif.type === "INFO" && notif.data?.messageId
      ? `/${locale}/mail?messageId=${notif.data.messageId}`
      : null;
    const requestLink = ["PENALTY_DECISION", "REWARD_DECISION"].includes(notif.type) && notif.data?.requestId
      ? `/${locale}/requests/${notif.data.requestId}`
      : null;
    const configRoute = NOTIF_CONFIG[notif.type]?.route;
    const target = evalLink || mailLink || requestLink || notif.actionUrl || (configRoute ? `/${locale}${configRoute}` : null);
    if (target) router.push(target);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between px-5">
      {/* START (right in RTL) — ERP Workspace */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {/* <span className="text-xs font-medium hidden sm:inline">ERP Workspace</span>
        <Settings className="h-4 w-4" /> */}
      </div>

      <div className="flex items-center gap-2">
        {/* Language */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Globe className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => changeLocale("ar")}>العربية</DropdownMenuItem>
            <DropdownMenuItem onClick={() => changeLocale("en")}>English</DropdownMenuItem>
            <DropdownMenuItem onClick={() => changeLocale("tr")}>Turkce</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {(unreadCount as number) > 0 && (
                <span className="absolute -top-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {(unreadCount as number) > 9 ? "9+" : unreadCount as number}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="text-sm font-semibold">الإشعارات</p>
              {(unreadCount as number) > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => markAllAsRead.mutate()}
                  disabled={markAllAsRead.isPending}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  قراءة الكل
                </Button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifList.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  لا توجد إشعارات
                </div>
              ) : (
                notifList.slice(0, 10).map((notif: any) => {
                  const cfg = NOTIF_CONFIG[notif.type] ?? DEFAULT_NOTIF_CFG;
                  const NotifIcon = cfg.icon;
                  return (
                    <div
                      key={notif.id}
                      className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b last:border-0 ${!notif.isRead ? cfg.bgClass : ""}`}
                      onClick={() => handleNotifClick(notif)}
                    >
                      {NotifIcon && (
                        <NotifIcon className={`h-4 w-4 ${cfg.iconClass} shrink-0 mt-0.5`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-snug ${!notif.isRead ? "font-medium" : "text-muted-foreground"}`}>
                            {notif.titleAr || notif.titleEn || notif.title}
                          </p>
                          {!notif.isRead && (
                            <span className={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${cfg.dotClass}`} />
                          )}
                        </div>
                        {(notif.messageAr || notif.message) && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.messageAr || notif.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: ar })}
                        </p>
                        {EVAL_NOTIF_TYPES.includes(notif.type) && getEvalLink(notif) && (
                          <button
                            type="button"
                            className="mt-1.5 text-xs text-primary font-medium hover:underline"
                            onClick={(e) => { e.stopPropagation(); router.push(getEvalLink(notif)!); }}
                          >
                            اذهب للتقييم ←
                          </button>
                        )}
                      </div>
                      {notif.actionUrl && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />}
                    </div>
                  );
                })
              )}
            </div>
            <div className="border-t px-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => router.push("/notifications")}
              >
                عرض جميع الإشعارات
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors outline-none">
              <div className="hidden sm:block text-start leading-tight">
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <p className="text-sm font-semibold">{user?.fullName || "User"}</p>
              </div>
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImage} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                  {user?.fullName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="ml-2 h-4 w-4" />
              {t("user.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
