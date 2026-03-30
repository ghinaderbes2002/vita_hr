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
  GraduationCap,
  UserCircle,
  Package,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface NavItem {
  title: string;
  href?: string;
  icon: any;
  permission?: string;
  /** إخفاء القسم لأصحاب هذه الأدوار */
  hiddenForRoles?: string[];
  /** إظهار القسم دائماً لأصحاب هذه الأدوار بغض النظر عن الصلاحية */
  showForRoles?: string[];
  children?: NavItem[];
}

const navigation: NavItem[] = [
  { title: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    title: "nav.employeePortal",
    icon: UserCircle,
    children: [
      { title: "nav.myAttendance", href: "/attendance/my-attendance", icon: ClipboardCheck, permission: "attendance.records.read-own" },
      { title: "nav.checkInOut", href: "/attendance/check-in-out", icon: LogIn, permission: "attendance.records.check-in" },
      { title: "nav.myAlerts", href: "/attendance/my-alerts", icon: Bell, permission: "attendance.alerts.read-own" },
      { title: "nav.myJustifications", href: "/attendance/my-justifications", icon: FileText, permission: "attendance.justifications.read-own" },
      { title: "nav.myRequests", href: "/requests/my-requests", icon: FileText, permission: "leave_requests:read" },
      { title: "nav.newRequest", href: "/requests/new", icon: PlusCircle, permission: "leave_requests:create" },
      { title: "nav.myEvaluations", href: "/evaluations/my-evaluations", icon: ClipboardPen, permission: "evaluation:forms:view-own" },
      { title: "nav.myCustodies", href: "/custodies/my-custodies", icon: Package, permission: "custodies:read" },
    ],
  },
  {
    
    title: "nav.management",
    icon: Settings,
    hiddenForRoles: ["employee", "موظف", "hr_manager", "مدير الموارد البشرية", "dep_manager", "مدير قسم"],
    children: [
      { title: "nav.users", href: "/users", icon: UserCog, permission: "users:read" },
      { title: "nav.roles", href: "/roles", icon: Shield, permission: "roles:read" },
      { title: "nav.departments", href: "/departments", icon: Building2, permission: "departments:read" },
      { title: "nav.jobTitles", href: "/job-titles", icon: FileText, permission: "job-titles:read" },
      { title: "nav.jobGrades", href: "/job-grades", icon: GraduationCap, permission: "job-grades:read" },
      { title: "nav.employees", href: "/employees", icon: Users, permission: "employees:read" },
      { title: "nav.subordinates", href: "/employees/subordinates", icon: UserCheck, permission: "employees:read" },
    ],
  },
  {
    title: "nav.hr",
    icon: Briefcase,
    hiddenForRoles: ["employee", "موظف"],
    children: [
      {
        title: "nav.attendance",
        icon: ClipboardCheck,
        hiddenForRoles: ["hr_manager", "مدير الموارد البشرية"],
        children: [
          { title: "nav.workSchedules", href: "/work-schedules", icon: Clock3, permission: "attendance.work-schedules.read" },
          { title: "nav.attendanceRecords", href: "/attendance/records", icon: ClipboardList, permission: "attendance.records.read" },
          { title: "nav.attendanceAlerts", href: "/attendance/alerts", icon: AlertCircle, permission: "attendance.alerts.read" },
          { title: "nav.attendanceJustifications", href: "/attendance/justifications", icon: FileText, permission: "attendance.justifications.read" },
          { title: "nav.attendanceReports", href: "/attendance/reports", icon: FileBarChart, permission: "attendance.reports.read" },
        ],
      },
      {
        title: "nav.leaves",
        icon: CalendarDays,
        children: [
          { title: "nav.leaveTypes", href: "/leave-types", icon: CalendarDays, permission: "leave_types:read", hiddenForRoles: ["hr_manager", "مدير الموارد البشرية"] },
          { title: "nav.holidays", href: "/holidays", icon: Calendar, permission: "holidays:read", hiddenForRoles: ["hr_manager", "مدير الموارد البشرية"] },
          { title: "nav.leaveBalances", href: "/leave-balances", icon: Wallet, permission: "leave_balances:read", hiddenForRoles: ["hr_manager", "مدير الموارد البشرية"] },
          { title: "nav.pendingApproval", href: "/leaves/pending-approval", icon: Clock, permission: "leave_requests:approve_manager", showForRoles: ["hr_manager", "مدير الموارد البشرية"] },
        ],
      },
      {
        title: "nav.requests",
        icon: ClipboardList,
        children: [
          { title: "nav.pendingManagerApproval", href: "/requests/pending-manager", icon: Clock, permission: "requests:manager-approve", hiddenForRoles: ["hr_manager", "مدير الموارد البشرية"] },
          { title: "nav.allRequests", href: "/requests/all", icon: ClipboardList, permission: "requests:read", showForRoles: ["hr_manager", "مدير الموارد البشرية"] },
        ],
      },
      {
        title: "nav.jobApplications",
        icon: Briefcase,
        children: [
          { title: "nav.allJobApplications", href: "/job-applications", icon: ClipboardList, permission: "job-applications:read" },
        ],
      },
      {
        title: "nav.custodies",
        icon: Package,
        children: [
          { title: "nav.allCustodies", href: "/custodies", icon: Package, permission: "custodies:read" },
        ],
      },
      {
        title: "nav.evaluations",
        icon: Star,
        children: [
          { title: "nav.evaluationPeriods", href: "/evaluations/periods", icon: CalendarDays, permission: "evaluation:periods:read", hiddenForRoles: ["hr_manager", "مدير الموارد البشرية"] },
          { title: "nav.evaluationCriteria", href: "/evaluations/criteria", icon: ListChecks, permission: "evaluation:criteria:read", hiddenForRoles: ["hr_manager", "مدير الموارد البشرية"] },
          { title: "nav.pendingReview", href: "/evaluations/pending-review", icon: UserRoundCheck, permission: "evaluation:forms:manager-evaluate", showForRoles: ["hr_manager", "مدير الموارد البشرية"] },
          { title: "nav.allEvaluations", href: "/evaluations/all-forms", icon: FileBarChart, permission: "evaluation:forms:view-all", hiddenForRoles: ["hr_manager", "مدير الموارد البشرية"] },
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
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved === 'true';
    }
    return false;
  });
  const { hasPermission, isAdmin, hasRole } = usePermissions();

  useEffect(() => {
    setMounted(true);
  }, []);

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
        "/requests/new",
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
        "/requests/my-requests",
        "/requests/pending-manager",
        "/requests/all",
        "/attendance/reports",
        "/attendance/alerts",
        "/custodies/my-custodies",
      ];

      // If current path is a known sub-route, don't match parent
      if (knownSubRoutes.some(route => cleanPath.startsWith(route))) {
        return false;
      }

      return true;
    }

    return false;
  };

  // التحقق من صلاحية عنصر نهائي (بدون أطفال)
  const hasItemPermission = (item: NavItem): boolean => {
    if (!item.permission) return true;
    if (isAdmin()) return true;
    return hasPermission(item.permission);
  };

  // التحقق recursive — يشتغل على أي عمق من التداخل
  const hasSectionPermission = (item: NavItem): boolean => {
    // إذا العنصر مخفي لدور معين، نخفيه (ما عدا الأدمن)
    if (item.hiddenForRoles && !isAdmin()) {
      if (item.hiddenForRoles.some((role) => hasRole(role))) return false;
    }
    // إذا العنصر مجبر على الظهور لدور معين، نظهره
    if (item.showForRoles && item.showForRoles.some((role) => hasRole(role))) return true;
    // إذا ما في أطفال، نتحقق من صلاحية العنصر مباشرة
    if (!item.children || item.children.length === 0) {
      return hasItemPermission(item);
    }
    // إذا في أطفال، القسم يظهر فقط إذا أي طفل (أو أحفاد) له صلاحية
    return item.children.some((child) => hasSectionPermission(child));
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
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {!mounted ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-9 rounded-lg bg-muted/50 animate-pulse",
                isCollapsed ? "w-9 mx-auto" : "w-full"
              )}
            />
          ))
        ) : navigation.map((item, index) => {
          // إخفاء العنصر إذا ما عنده صلاحية
          if (!hasSectionPermission(item)) {
            return null;
          }

          const showSeparator = index > 0 && item.children && !isCollapsed;

          const active = item.href ? isActive(item.href) : false;
          const isExpanded = expanded.includes(item.title);

          if (item.children) {
            // فلترة العناصر الفرعية حسب الصلاحيات (recursive)
            const visibleChildren = item.children.filter((child) =>
              hasSectionPermission(child)
            );

            if (visibleChildren.length === 0) return null;

            return (
              <div key={item.title}>
                {showSeparator && <div className="my-2 border-t" />}
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
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium",
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
                          hasSectionPermission(grandChild)
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
                                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                                      "hover:bg-muted",
                                      isActive(grandChild.href!)
                                        ? "bg-primary text-primary-foreground font-medium"
                                        : ""
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
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                            "hover:bg-muted",
                            isActive(child.href!)
                              ? "bg-primary text-primary-foreground font-medium"
                              : ""
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
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors font-medium",
                "hover:bg-muted",
                active ? "bg-primary text-primary-foreground" : "",
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
