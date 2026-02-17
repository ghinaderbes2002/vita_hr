"use client";

import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/lib/hooks/use-permissions";
import {
  LayoutDashboard,
  ChevronDown,
  Settings,
  UserCog,
  Building2,
  Users,
  Shield,
  UserCheck,
  Briefcase,
  CalendarDays,
  Calendar,
  Wallet,
  FileText,
  PlusCircle,
  Clock,
  Clock3,
  ClipboardCheck,
  LogIn,
  ClipboardList,
  AlertCircle,
  Bell,
  Star,
  ListChecks,
  ClipboardPen,
  UserRoundCheck,
  FileBarChart,
  ChevronsRight,
  ChevronsLeft,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface NavItem {
  title: string;
  href?: string;
  icon: any;
  permission?: string;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  { title: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    title: "nav.management",
    icon: Settings,
    children: [
      { title: "nav.users", href: "/users", icon: UserCog, permission: "users:read" },
      { title: "nav.roles", href: "/roles", icon: Shield, permission: "roles:read" },
      { title: "nav.departments", href: "/departments", icon: Building2, permission: "departments:read" },
      { title: "nav.employees", href: "/employees", icon: Users, permission: "employees:read" },
      { title: "nav.subordinates", href: "/employees/subordinates", icon: UserCheck, permission: "employees:read" },
    ],
  },
  {
    title: "nav.hr",
    icon: Briefcase,
    children: [
      {
        title: "nav.attendance",
        icon: ClipboardCheck,
        children: [
          { title: "nav.workSchedules", href: "/work-schedules", icon: Clock3, permission: "attendance.work-schedules.read" },
          { title: "nav.myAttendance", href: "/attendance/my-attendance", icon: ClipboardCheck, permission: "attendance.records.read-own" },
          { title: "nav.checkInOut", href: "/attendance/check-in-out", icon: LogIn, permission: "attendance.records.check-in" },
          { title: "nav.attendanceRecords", href: "/attendance/records", icon: ClipboardList, permission: "attendance.records.read" },
          { title: "nav.myAlerts", href: "/attendance/my-alerts", icon: Bell, permission: "attendance.alerts.read-own" },
          { title: "nav.attendanceAlerts", href: "/attendance/alerts", icon: AlertCircle, permission: "attendance.alerts.read" },
        ],
      },
      {
        title: "nav.leaves",
        icon: CalendarDays,
        children: [
          { title: "nav.leaveTypes", href: "/leave-types", icon: CalendarDays, permission: "leave_types:read" },
          { title: "nav.holidays", href: "/holidays", icon: Calendar, permission: "holidays:read" },
          { title: "nav.leaveBalances", href: "/leave-balances", icon: Wallet, permission: "leave_balances:read" },
          { title: "nav.myLeaves", href: "/leaves/my-leaves", icon: FileText, permission: "leave_requests:read" },
          { title: "nav.newRequest", href: "/leaves/new-request", icon: PlusCircle, permission: "leave_requests:create" },
          { title: "nav.pendingApproval", href: "/leaves/pending-approval", icon: Clock, permission: "leave_requests:approve_manager" },
        ],
      },
      {
        title: "nav.evaluations",
        icon: Star,
        children: [
          { title: "nav.evaluationPeriods", href: "/evaluations/periods", icon: CalendarDays, permission: "evaluation:periods:read" },
          { title: "nav.evaluationCriteria", href: "/evaluations/criteria", icon: ListChecks, permission: "evaluation:criteria:read" },
          { title: "nav.myEvaluations", href: "/evaluations/my-evaluations", icon: ClipboardPen, permission: "evaluation:forms:view-own" },
          { title: "nav.pendingReview", href: "/evaluations/pending-review", icon: UserRoundCheck, permission: "evaluation:forms:manager-evaluate" },
          { title: "nav.allEvaluations", href: "/evaluations/all-forms", icon: FileBarChart, permission: "evaluation:forms:view-all" },
        ],
      },
    ],
  },
];

export function Sidebar() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved === 'true';
    }
    return false;
  });
  const { hasPermission, isAdmin } = usePermissions();

  // Determine if the locale is RTL (Arabic)
  const isRTL = locale === "ar";

  // Update CSS variable when collapsed state changes
  useEffect(() => {
    const width = isCollapsed ? '4rem' : '16rem';
    document.documentElement.style.setProperty('--sidebar-width', width);
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const toggle = (title: string) => {
    setExpanded((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    const segments = pathname.split("/");
    const pathWithoutLocale = "/" + segments.slice(2).join("/");

    // Remove query params and hash
    const cleanPath = pathWithoutLocale.split("?")[0].split("#")[0];

    // Exact match
    if (cleanPath === href) {
      return true;
    }

    // For routes with dynamic segments (e.g., /employees/123)
    // Check if path starts with href + "/"
    if (cleanPath.startsWith(href + "/")) {
      // But exclude specific known sub-routes
      const knownSubRoutes = [
        "/employees/subordinates",
        "/leaves/my-leaves",
        "/leaves/new-request",
        "/leaves/pending-approval",
        "/attendance/my-attendance",
        "/attendance/check-in-out",
        "/attendance/records",
        "/attendance/my-alerts",
        "/attendance/alerts",
        "/evaluations/periods",
        "/evaluations/criteria",
        "/evaluations/my-evaluations",
        "/evaluations/pending-review",
        "/evaluations/all-forms",
      ];

      // If current path is a known sub-route, don't match parent
      if (knownSubRoutes.some(route => cleanPath.startsWith(route))) {
        return false;
      }

      return true;
    }

    return false;
  };

  // التحقق من صلاحية العنصر
  const hasItemPermission = (item: NavItem): boolean => {
    // إذا ما في صلاحية محددة، الكل يشوفه
    if (!item.permission) return true;

    // Admin يشوف كل شي
    if (isAdmin()) return true;

    // التحقق من الصلاحية
    return hasPermission(item.permission);
  };

  // التحقق من صلاحية القسم (إذا في أي عنصر فرعي له صلاحية)
  const hasSectionPermission = (item: NavItem): boolean => {
    // إذا القسم نفسه عنده صلاحية، نتحقق منها أولاً
    if (item.permission && !hasItemPermission(item)) {
      return false;
    }

    // إذا ما في عناصر فرعية، نتحقق من صلاحية القسم نفسه
    if (!item.children || item.children.length === 0) {
      return hasItemPermission(item);
    }

    // نتحقق من وجود أي عنصر فرعي له صلاحية
    return item.children.some((child) => hasItemPermission(child));
  };

  return (
    <aside className={cn(
      "fixed top-0 z-40 h-screen bg-background flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64",
      isRTL ? "right-0 border-l" : "left-0 border-r"
    )}>
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-3 shrink-0 justify-between">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">V</span>
            </div>
            <span className="font-bold text-xl">Vita HR</span>
          </Link>
        )}
        {isCollapsed && (
          <Link href="/dashboard" className="mx-auto">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">V</span>
            </div>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn("h-8 w-8", isCollapsed && "mx-auto mt-2")}
        >
          {isCollapsed ? (
            isRTL ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />
          ) : (
            isRTL ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navigation.map((item) => {
          // إخفاء العنصر إذا ما عنده صلاحية
          if (!hasSectionPermission(item)) {
            return null;
          }

          const active = item.href ? isActive(item.href) : false;
          const isExpanded = expanded.includes(item.title);

          if (item.children) {
            // فلترة العناصر الفرعية حسب الصلاحيات
            const visibleChildren = item.children.filter((child) =>
              hasItemPermission(child)
            );

            // إذا ما في عناصر فرعية مرئية، ما نعرض القسم
            if (visibleChildren.length === 0) {
              return null;
            }

            return (
              <div key={item.title}>
                <button
                  onClick={() => {
                    if (isCollapsed) {
                      setIsCollapsed(false);
                      setTimeout(() => toggle(item.title), 100);
                    } else {
                      toggle(item.title);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm",
                    "hover:bg-muted transition-colors",
                    isCollapsed && "justify-center"
                  )}
                  title={isCollapsed ? t(item.title) : undefined}
                >
                  <div className={cn("flex items-center gap-3", isCollapsed && "gap-0")}>
                    <item.icon className="h-5 w-5" />
                    {!isCollapsed && <span>{t(item.title)}</span>}
                  </div>
                  {!isCollapsed && (
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        isExpanded && "rotate-180"
                      )}
                    />
                  )}
                </button>
                {isExpanded && !isCollapsed && (
                  <div className={cn(
                    "mt-1 space-y-1",
                    isRTL ? "mr-4" : "ml-4"
                  )}>
                    {visibleChildren.map((child) => {
                      // إذا العنصر الفرعي عنده أطفال (مستوى ثاني)
                      if (child.children) {
                        const visibleGrandChildren = child.children.filter((grandChild) =>
                          hasItemPermission(grandChild)
                        );

                        if (visibleGrandChildren.length === 0) {
                          return null;
                        }

                        const isChildExpanded = expanded.includes(child.title);

                        return (
                          <div key={child.title}>
                            <button
                              onClick={() => toggle(child.title)}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm",
                                "hover:bg-muted transition-colors"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <child.icon className="h-4 w-4" />
                                <span>{t(child.title)}</span>
                              </div>
                              <ChevronDown
                                className={cn(
                                  "h-3 w-3 transition-transform",
                                  isChildExpanded && "rotate-180"
                                )}
                              />
                            </button>
                            {isChildExpanded && (
                              <div className={cn(
                                "mt-1 space-y-1",
                                isRTL ? "mr-4" : "ml-4"
                              )}>
                                {visibleGrandChildren.map((grandChild) => (
                                  <Link
                                    key={grandChild.href}
                                    href={grandChild.href!}
                                    className={cn(
                                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
                                      "hover:bg-muted transition-colors",
                                      isActive(grandChild.href!) &&
                                        "bg-primary text-primary-foreground"
                                    )}
                                  >
                                    <grandChild.icon className="h-4 w-4" />
                                    <span>{t(grandChild.title)}</span>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }

                      // عنصر فرعي عادي بدون أطفال
                      return (
                        <Link
                          key={child.href}
                          href={child.href!}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
                            "hover:bg-muted transition-colors",
                            isActive(child.href!) &&
                              "bg-primary text-primary-foreground"
                          )}
                        >
                          <child.icon className="h-4 w-4" />
                          <span>{t(child.title)}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
                "hover:bg-muted transition-colors",
                active && "bg-primary text-primary-foreground",
                isCollapsed && "justify-center gap-0"
              )}
              title={isCollapsed ? t(item.title) : undefined}
            >
              <item.icon className="h-5 w-5" />
              {!isCollapsed && <span>{t(item.title)}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
