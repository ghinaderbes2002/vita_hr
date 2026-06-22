"use client";

import { useTranslations, useLocale } from "next-intl";
import { useTheme } from "next-themes";
import {
  Bell, Moon, Sun, Globe, LogOut, CheckCheck, ExternalLink, AlertTriangle,
  Clock, AlertCircle, RotateCcw, FileText, AlertOctagon, Coffee, DollarSign,
  Mail, Trophy, CheckCircle2, XCircle, ClipboardList, FileWarning,
  Cake, UserPlus, FileCheck, UserX, ListTodo, Briefcase,
  Settings, Users, Building2, GraduationCap, Shield, UserCog,
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
import { resolveNotificationLink } from "@/lib/notifications/notification-links";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export function Header() {
  const t = useTranslations();
  const { theme, setTheme } = useTheme();
  const { user, logout, isAdmin, hasRole } = useAuthStore();
  const showManagement = isAdmin() || hasRole("CEO") || hasRole("مدير تنفيذي") || hasRole("CFO");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: notifications = [] } = useNotifications({ limit: 50 } as any);
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

  type NotifCfg = {
    icon: React.ComponentType<{ className?: string }> | null;
    iconClass: string;
    bgClass: string;
    dotClass: string;
  };

  const NOTIF_CONFIG: Record<string, NotifCfg> = {
    LEAVE_REQUEST_SUBMITTED:         { icon: Bell,          iconClass: "text-blue-500",   bgClass: "bg-blue-50/60 dark:bg-blue-950/20",     dotClass: "bg-blue-500" },
    LEAVE_REQUEST_APPROVED:          { icon: CheckCircle2,  iconClass: "text-green-500",  bgClass: "bg-green-50/60 dark:bg-green-950/20",   dotClass: "bg-green-500" },
    LEAVE_REQUEST_REJECTED:          { icon: XCircle,       iconClass: "text-red-500",    bgClass: "bg-red-50/60 dark:bg-red-950/20",       dotClass: "bg-red-500" },
    LEAVE_REQUEST_CANCELLED:         { icon: XCircle,       iconClass: "text-gray-500",   bgClass: "bg-gray-50/60 dark:bg-gray-950/20",     dotClass: "bg-gray-500" },
    LEAVE_REQUEST_PENDING_APPROVAL:  { icon: AlertTriangle, iconClass: "text-amber-500",  bgClass: "bg-amber-50/60 dark:bg-amber-950/20",   dotClass: "bg-amber-500" },
    EVALUATION_ASSIGNED:             { icon: ClipboardList, iconClass: "text-purple-500", bgClass: "bg-purple-50/60 dark:bg-purple-950/20", dotClass: "bg-purple-500" },
    EVALUATION_SUBMITTED:            { icon: ClipboardList, iconClass: "text-purple-500", bgClass: "bg-purple-50/60 dark:bg-purple-950/20", dotClass: "bg-purple-500" },
    PROBATION_REMINDER:              { icon: Clock,         iconClass: "text-orange-500", bgClass: "bg-orange-50/60 dark:bg-orange-950/20", dotClass: "bg-orange-500" },
    PROBATION_END_REMINDER:          { icon: Clock,         iconClass: "text-orange-500", bgClass: "bg-orange-50/60 dark:bg-orange-950/20", dotClass: "bg-orange-500" },
    DOCUMENT_EXPIRY:                 { icon: FileWarning,   iconClass: "text-red-500",    bgClass: "bg-red-50/60 dark:bg-red-950/20",       dotClass: "bg-red-500" },
    CONTRACT_EXPIRY:                 { icon: FileWarning,   iconClass: "text-red-500",    bgClass: "bg-red-50/60 dark:bg-red-950/20",       dotClass: "bg-red-500" },
    BIRTHDAY:                        { icon: Cake,          iconClass: "text-pink-500",   bgClass: "bg-pink-50/60 dark:bg-pink-950/20",     dotClass: "bg-pink-500" },
    WELCOME:                         { icon: UserPlus,      iconClass: "text-green-500",  bgClass: "bg-green-50/60 dark:bg-green-950/20",   dotClass: "bg-green-500" },
    ATTENDANCE_ALERT:                { icon: AlertTriangle, iconClass: "text-red-500",    bgClass: "bg-red-50/60 dark:bg-red-950/20",       dotClass: "bg-red-500" },
    ATTENDANCE_JUSTIFICATION:        { icon: FileCheck,     iconClass: "text-orange-500", bgClass: "bg-orange-50/60 dark:bg-orange-950/20", dotClass: "bg-orange-500" },
    ATTENDANCE_NEEDS_REVIEW:         { icon: AlertOctagon,  iconClass: "text-orange-500", bgClass: "bg-orange-50/60 dark:bg-orange-950/20", dotClass: "bg-orange-500" },
    BREAK_EXCEEDED:                  { icon: Coffee,        iconClass: "text-orange-500", bgClass: "bg-orange-50/60 dark:bg-orange-950/20", dotClass: "bg-orange-500" },
    TARDINESS_BALANCE_USED:          { icon: Clock,         iconClass: "text-yellow-500", bgClass: "bg-yellow-50/60 dark:bg-yellow-950/20", dotClass: "bg-yellow-500" },
    TARDINESS_BALANCE_LOW:           { icon: AlertCircle,   iconClass: "text-orange-500", bgClass: "bg-orange-50/60 dark:bg-orange-950/20", dotClass: "bg-orange-500" },
    TARDINESS_BALANCE_DEPLETED:      { icon: AlertTriangle, iconClass: "text-red-500",    bgClass: "bg-red-50/60 dark:bg-red-950/20",       dotClass: "bg-red-500" },
    TARDINESS_COMPENSATION_DUE:      { icon: Bell,          iconClass: "text-yellow-500", bgClass: "bg-yellow-50/60 dark:bg-yellow-950/20", dotClass: "bg-yellow-500" },
    TARDINESS_DEDUCTION_PENDING:     { icon: DollarSign,    iconClass: "text-red-500",    bgClass: "bg-red-50/60 dark:bg-red-950/20",       dotClass: "bg-red-500" },
    TARDINESS_OFFSET_RESTORED:       { icon: RotateCcw,     iconClass: "text-green-500",  bgClass: "bg-green-50/60 dark:bg-green-950/20",   dotClass: "bg-green-500" },
    MONTHLY_PAYROLL_READY:           { icon: FileText,      iconClass: "text-blue-500",   bgClass: "bg-blue-50/60 dark:bg-blue-950/20",     dotClass: "bg-blue-500" },
    EMPLOYEES_WITHOUT_SCHEDULE:      { icon: UserX,         iconClass: "text-gray-500",   bgClass: "bg-gray-50/60 dark:bg-gray-950/20",     dotClass: "bg-gray-500" },
    ONBOARDING_TASK:                 { icon: ListTodo,      iconClass: "text-orange-500", bgClass: "bg-orange-50/60 dark:bg-orange-950/20", dotClass: "bg-orange-500" },
    OFFBOARDING_TASK:                { icon: ListTodo,      iconClass: "text-gray-500",   bgClass: "bg-gray-50/60 dark:bg-gray-950/20",     dotClass: "bg-gray-500" },
    PENALTY_DECISION:                { icon: AlertTriangle, iconClass: "text-red-500",    bgClass: "bg-red-50/60 dark:bg-red-950/20",       dotClass: "bg-red-500" },
    REWARD_DECISION:                 { icon: Trophy,        iconClass: "text-amber-500",  bgClass: "bg-amber-50/60 dark:bg-amber-950/20",   dotClass: "bg-amber-500" },
    ADDITIONAL_ASSIGNMENT_REQUEST:   { icon: Briefcase,     iconClass: "text-indigo-500", bgClass: "bg-indigo-50/60 dark:bg-indigo-950/20", dotClass: "bg-indigo-500" },
    ADDITIONAL_ASSIGNMENT_DECISION:  { icon: CheckCircle2,  iconClass: "text-green-500",  bgClass: "bg-green-50/60 dark:bg-green-950/20",   dotClass: "bg-green-500" },
    GENERAL:                         { icon: Mail,          iconClass: "text-blue-500",   bgClass: "bg-blue-50/60 dark:bg-blue-950/20",     dotClass: "bg-blue-500" },
  };

  const DEFAULT_NOTIF_CFG: NotifCfg = {
    icon: null, iconClass: "text-blue-500", bgClass: "bg-blue-50/50 dark:bg-blue-950/20", dotClass: "bg-blue-500",
  };

  const handleNotifClick = (notif: any) => {
    if (!notif.isRead) markAsRead.mutate(notif.id);
    const link = resolveNotificationLink(notif);
    if (link) router.push(link as any);
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

        {/* Management Quick Access */}
        {showManagement && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-3 py-2 border-b">
                <p className="text-xs font-semibold text-muted-foreground">الإدارة</p>
              </div>
              <DropdownMenuItem onClick={() => router.push("/employees" as any)} className="gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                الموظفون
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/departments" as any)} className="gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                الأقسام
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/job-titles" as any)} className="gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                المسميات الوظيفية
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/job-grades" as any)} className="gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                الدرجات الوظيفية
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/users" as any)} className="gap-2">
                <UserCog className="h-4 w-4 text-muted-foreground" />
                المستخدمون
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/roles" as any)} className="gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                الأدوار والصلاحيات
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

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
                notifList.map((notif: any) => {
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
                        {(notif.messageAr || notif.messageEn) && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.messageAr || notif.messageEn}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: ar })}
                        </p>
                      </div>
                      {resolveNotificationLink(notif) && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />}
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
