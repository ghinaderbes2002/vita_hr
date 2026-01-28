"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
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
} from "lucide-react";
import { useState } from "react";

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
      { title: "nav.users", href: "/users", icon: UserCog },
      { title: "nav.roles", href: "/roles", icon: Shield },
      { title: "nav.departments", href: "/departments", icon: Building2 },
      { title: "nav.employees", href: "/employees", icon: Users },
      { title: "nav.subordinates", href: "/employees/subordinates", icon: UserCheck },
    ],
  },
  {
    title: "nav.hr",
    icon: Briefcase,
    children: [
      { title: "nav.workSchedules", href: "/work-schedules", icon: Clock3 },
      { title: "nav.myAttendance", href: "/attendance/my-attendance", icon: ClipboardCheck },
      { title: "nav.checkInOut", href: "/attendance/check-in-out", icon: LogIn },
      { title: "nav.attendanceRecords", href: "/attendance/records", icon: ClipboardList },
      { title: "nav.myAlerts", href: "/attendance/my-alerts", icon: Bell },
      { title: "nav.attendanceAlerts", href: "/attendance/alerts", icon: AlertCircle },
      { title: "nav.leaveTypes", href: "/leave-types", icon: CalendarDays },
      { title: "nav.holidays", href: "/holidays", icon: Calendar },
      { title: "nav.leaveBalances", href: "/leave-balances", icon: Wallet },
      { title: "nav.myLeaves", href: "/leaves/my-leaves", icon: FileText },
      { title: "nav.newRequest", href: "/leaves/new-request", icon: PlusCircle },
      { title: "nav.pendingApproval", href: "/leaves/pending-approval", icon: Clock },
    ],
  },
  {
    title: "nav.evaluations",
    icon: Star,
    children: [
      { title: "nav.evaluationPeriods", href: "/evaluations/periods", icon: CalendarDays },
      { title: "nav.evaluationCriteria", href: "/evaluations/criteria", icon: ListChecks },
      { title: "nav.myEvaluations", href: "/evaluations/my-evaluations", icon: ClipboardPen },
      { title: "nav.pendingReview", href: "/evaluations/pending-review", icon: UserRoundCheck },
      { title: "nav.allEvaluations", href: "/evaluations/all-forms", icon: FileBarChart },
    ],
  },
];

export function Sidebar() {
  const t = useTranslations();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string[]>([]);

  const toggle = (title: string) => {
    setExpanded((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    const segments = pathname.split("/");
    const pathWithoutLocale = "/" + segments.slice(2).join("/");
    return pathWithoutLocale.startsWith(href);
  };

  return (
    <aside className="fixed right-0 top-0 z-40 h-screen w-64 border-l bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold">V</span>
          </div>
          <span className="font-bold text-xl">Vita HR</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navigation.map((item) => {
          const active = item.href ? isActive(item.href) : false;
          const isExpanded = expanded.includes(item.title);

          if (item.children) {
            return (
              <div key={item.title}>
                <button
                  onClick={() => toggle(item.title)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm",
                    "hover:bg-muted transition-colors"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    <span>{t(item.title)}</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>
                {isExpanded && (
                  <div className="mt-1 mr-4 space-y-1">
                    {item.children.map((child) => (
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
                    ))}
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
                active && "bg-primary text-primary-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{t(item.title)}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
