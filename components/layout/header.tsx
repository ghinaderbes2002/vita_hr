"use client";

import { useTranslations, useLocale } from "next-intl";
import { useTheme } from "next-themes";
import { Bell, Moon, Sun, Globe, LogOut, CheckCheck, ExternalLink, AlertTriangle } from "lucide-react";
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

  const handleNotifClick = (notif: any) => {
    if (!notif.isRead) markAsRead.mutate(notif.id);
    if (notif.actionUrl) router.push(notif.actionUrl);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 backdrop-blur-md px-6 shadow-sm">
      <div className="flex-1" />

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
                notifList.slice(0, 10).map((notif: any) => (
                  <div
                    key={notif.id}
                    className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b last:border-0 ${
                        !notif.isRead
                          ? notif.type === "LEAVE_REQUEST_PENDING_APPROVAL"
                            ? "bg-amber-50/60 dark:bg-amber-950/20"
                            : "bg-blue-50/50 dark:bg-blue-950/20"
                          : ""
                      }`}
                    onClick={() => handleNotifClick(notif)}
                  >
                    {notif.type === "LEAVE_REQUEST_PENDING_APPROVAL" && (
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${!notif.isRead ? "font-medium" : "text-muted-foreground"}`}>
                          {notif.title}
                        </p>
                        {!notif.isRead && (
                          <span className={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${notif.type === "LEAVE_REQUEST_PENDING_APPROVAL" ? "bg-amber-500" : "bg-blue-500"}`} />
                        )}
                      </div>
                      {notif.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: ar })}
                      </p>
                    </div>
                    {notif.actionUrl && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />}
                  </div>
                ))
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
            <Button variant="ghost" className="h-10 w-10 rounded-full">
              <Avatar>
                <AvatarImage src={user?.profileImage} />
                <AvatarFallback>{user?.fullName?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="p-2">
              <p className="text-sm font-medium">{user?.fullName || "User"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
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
