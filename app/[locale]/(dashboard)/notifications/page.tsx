"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Bell, CheckCheck, AlertTriangle, CheckCircle2, XCircle, Info, ExternalLink,
  Clock, FileWarning, CalendarX, CalendarClock, User, ClipboardList, FileCheck, Briefcase,
  Cake, UserPlus, FileX, ListTodo, UserX, Filter, ChevronDown, Mail, Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ComposeMailModal } from "@/components/features/mail/compose-mail-modal";
import { useNotificationsPage, useMarkAsRead, useMarkAllAsRead } from "@/lib/hooks/use-notifications";
import type { Notification, NotificationType } from "@/lib/api/notifications";
import { resolveNotificationLink, hasNotificationLink } from "@/lib/notifications/notification-links";

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  LEAVE_REQUEST_SUBMITTED:        { icon: Bell,          color: "text-blue-600",   bg: "bg-blue-100",   label: "طلب إجازة جديد" },
  LEAVE_REQUEST_APPROVED:         { icon: CheckCircle2,  color: "text-green-600",  bg: "bg-green-100",  label: "إجازة مقبولة" },
  LEAVE_REQUEST_REJECTED:         { icon: XCircle,       color: "text-red-600",    bg: "bg-red-100",    label: "إجازة مرفوضة" },
  LEAVE_REQUEST_PENDING_APPROVAL: { icon: AlertTriangle, color: "text-amber-600",  bg: "bg-amber-100",  label: "تأخر الموافقة" },
  ATTENDANCE_ALERT:               { icon: AlertTriangle, color: "text-red-600",    bg: "bg-red-100",    label: "تنبيه حضور" },
  ATTENDANCE_JUSTIFICATION:       { icon: FileCheck,     color: "text-orange-600", bg: "bg-orange-100", label: "تبرير حضور" },
  EVALUATION_ASSIGNED:            { icon: ClipboardList, color: "text-purple-600", bg: "bg-purple-100", label: "تقييم التجربة" },
  PROBATION_REMINDER:             { icon: CalendarClock, color: "text-teal-600",   bg: "bg-teal-100",   label: "تذكير تقييم التجربة" },
  PROBATION_END_REMINDER:         { icon: Clock,         color: "text-orange-600", bg: "bg-orange-100", label: "انتهاء التجربة" },
  DOCUMENT_EXPIRY:                { icon: FileWarning,   color: "text-red-600",    bg: "bg-red-100",    label: "انتهاء وثيقة" },
  BIRTHDAY:                       { icon: Cake,          color: "text-pink-600",   bg: "bg-pink-100",   label: "عيد ميلاد 🎂" },
  WELCOME:                        { icon: UserPlus,      color: "text-green-600",  bg: "bg-green-100",  label: "ترحيب" },
  CONTRACT_EXPIRY:                { icon: FileX,         color: "text-red-600",    bg: "bg-red-100",    label: "انتهاء العقد" },
  ADDITIONAL_ASSIGNMENT_REQUEST:  { icon: Briefcase,     color: "text-indigo-600", bg: "bg-indigo-100", label: "تكليف إضافي" },
  ADDITIONAL_ASSIGNMENT_DECISION: { icon: CheckCircle2,  color: "text-green-600",  bg: "bg-green-100",  label: "قرار التكليف" },
  ONBOARDING_TASK:                { icon: ListTodo,      color: "text-orange-600", bg: "bg-orange-100", label: "مهمة تأهيل" },
  EMPLOYEES_WITHOUT_SCHEDULE:     { icon: UserX,         color: "text-gray-600",   bg: "bg-gray-100",   label: "بدون جدول" },
  INFO:                           { icon: Mail,          color: "text-blue-600",   bg: "bg-blue-100",   label: "رسالة داخلية" },
  PENALTY_DECISION:               { icon: AlertTriangle, color: "text-red-600",    bg: "bg-red-100",    label: "قرار عقوبة" },
  REWARD_DECISION:                { icon: Trophy,        color: "text-amber-600",  bg: "bg-amber-100",  label: "قرار مكافأة" },
  BREAK_EXCEEDED:                 { icon: Clock,         color: "text-orange-600", bg: "bg-orange-100", label: "تجاوز الاستراحة" },
  TARDINESS_BALANCE_USED:         { icon: Clock,         color: "text-amber-600",  bg: "bg-amber-100",  label: "رصيد تأخير" },
  TARDINESS_BALANCE_DEPLETED:     { icon: AlertTriangle, color: "text-red-600",    bg: "bg-red-100",    label: "نفاد رصيد التأخير" },
  TARDINESS_DEDUCTION_PENDING:    { icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-100", label: "خصم تأخير معلق" },
  GENERAL:                        { icon: Info,          color: "text-gray-600",   bg: "bg-gray-100",   label: "عام" },
};

const EVAL_TYPES = ["PROBATION_END_REMINDER", "EVALUATION_ASSIGNED", "PROBATION_REMINDER"];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(TYPE_CONFIG).map(([k, v]) => [k, v.label])
);

function getConfig(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.GENERAL;
}

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const locale = useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState<Notification[]>([]);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeToIds, setComposeToIds] = useState<string[]>([]);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");

  const isReadParam = tab === "unread" ? false : tab === "read" ? true : undefined;

  const { data: pageData, isLoading, isFetching } = useNotificationsPage({
    page,
    limit: PAGE_SIZE,
    isRead: isReadParam,
  });

  // دمج الصفحات الجديدة في المصفوفة المتراكمة
  const mergedPageRef = useRef(0);
  useEffect(() => {
    if (!pageData) return;
    if (pageData.page === mergedPageRef.current) return;
    mergedPageRef.current = pageData.page;
    if (pageData.page === 1) {
      setAccumulated(pageData.items);
    } else {
      setAccumulated((prev) => {
        const ids = new Set(prev.map((n) => n.id));
        return [...prev, ...pageData.items.filter((n) => !ids.has(n.id))];
      });
    }
  }, [pageData]);

  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const handleTabChange = (v: string) => {
    setTab(v as any);
    setPage(1);
    setAccumulated([]);
    mergedPageRef.current = 0;
  };

  const notifList: Notification[] = accumulated;

  const filtered = notifList.filter((n) => {
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    return true;
  });

  const hasMore = pageData ? page < pageData.totalPages : false;
  const unreadCount = notifList.filter((n) => !n.isRead).length;

  const usedTypes = [...new Set(notifList.map((n) => n.type))];

  const handleClick = (notif: Notification) => {
    if (!notif.isRead) markAsRead.mutate(notif.id);
    if (notif.type === "BIRTHDAY") { setSelectedNotif(notif); return; }
    const link = resolveNotificationLink(notif);
    if (link) router.push(`/${locale}${link}`);
    else setSelectedNotif(notif);
  };

  const handleBirthdayGreeting = (notif: any) => {
    if (!notif.isRead) markAsRead.mutate(notif.id);
    const name = notif.data?.employeeName || "";
    const userId = notif.data?.userId;
    setComposeSubject(`تهنئة بعيد الميلاد — ${name}`);
    setComposeBody(`عزيزي ${name}،\n\nبمناسبة عيد ميلادك، نتمنى لك عاماً مليئاً بالصحة والسعادة والنجاح.\n\nكل عام وأنت بخير! 🎂`);
    setComposeToIds(userId ? [userId] : []);
    setComposeOpen(true);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الإشعارات</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">{unreadCount} غير مقروء</p>
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

      {/* Tabs + Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="all">
              الكل
              {notifList.length > 0 && (
                <Badge variant="secondary" className="mr-1.5 h-4 px-1.5 text-[10px]">{notifList.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread">
              غير مقروء
              {unreadCount > 0 && (
                <Badge className="mr-1.5 h-4 px-1.5 text-[10px] bg-blue-500">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="read">مقروء</TabsTrigger>
          </TabsList>
        </Tabs>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-9">
              <Filter className="h-3.5 w-3.5" />
              {typeFilter === "all" ? "كل الأنواع" : TYPE_LABELS[typeFilter] || typeFilter}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
            <DropdownMenuItem onClick={() => setTypeFilter("all")}>
              كل الأنواع
            </DropdownMenuItem>
            {usedTypes.map((type) => (
              <DropdownMenuItem key={type} onClick={() => setTypeFilter(type)}>
                {TYPE_LABELS[type] || type}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* List */}
      <div className="rounded-lg border divide-y overflow-hidden">
        {isLoading && accumulated.length === 0 ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-4">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">لا توجد إشعارات</p>
          </div>
        ) : (
          <>
            {filtered.map((notif) => {
              const cfg = getConfig(notif.type);
              const Icon = cfg.icon;
              const isBirthday = notif.type === "BIRTHDAY";
              const evalLink = EVAL_TYPES.includes(notif.type) && notif.data?.evaluationId
                ? `/${locale}/probation-evaluations/${notif.data.evaluationId}`
                : null;

              return (
                <div
                  key={notif.id}
                  className={`flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-muted/40 transition-colors ${
                    isBirthday
                      ? "bg-pink-50/60 hover:bg-pink-50"
                      : !notif.isRead
                      ? "bg-blue-50/30"
                      : ""
                  }`}
                  onClick={() => handleClick(notif)}
                >
                  {/* Icon */}
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${!notif.isRead ? "font-semibold" : "text-muted-foreground"}`}>
                        {notif.titleAr || notif.titleEn}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        {!notif.isRead && (
                          <span className={`h-2 w-2 rounded-full ${cfg.color.replace("text-", "bg-")}`} />
                        )}
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.color} border-current/20`}>
                          {cfg.label}
                        </Badge>
                      </div>
                    </div>

                    {(notif.messageAr || notif.messageEn) && (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {notif.messageAr || notif.messageEn}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground mt-1.5">
                      {format(new Date(notif.createdAt), "yyyy/MM/dd HH:mm")} ·{" "}
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: ar })}
                    </p>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {evalLink && (
                        <button
                          type="button"
                          className="text-xs text-primary font-medium hover:underline"
                          onClick={(e) => { e.stopPropagation(); router.push(evalLink); }}
                        >
                          اذهب للتقييم ←
                        </button>
                      )}
                      {isBirthday && (
                        <button
                          type="button"
                          className="text-xs text-pink-600 font-medium hover:underline flex items-center gap-1"
                          onClick={(e) => { e.stopPropagation(); handleBirthdayGreeting(notif); }}
                        >
                          <Cake className="h-3 w-3" />
                          إرسال تهنئة
                        </button>
                      )}
                      {notif.data?.requestId && (
                        <button
                          type="button"
                          className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                          onClick={(e) => { e.stopPropagation(); if (!notif.isRead) markAsRead.mutate(notif.id); router.push(`/${locale}/requests/${notif.data.requestId}`); }}
                        >
                          <ClipboardList className="h-3 w-3" />
                          عرض الطلب ←
                        </button>
                      )}
                      {notif.data?.employeeId && !isBirthday && (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/employees/${notif.data.employeeId}`); }}
                        >
                          <User className="h-3 w-3" />
                          عرض الموظف
                        </button>
                      )}
                    </div>
                  </div>

                  {hasNotificationLink(notif) && (
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
                  )}
                </div>
              );
            })}

            {hasMore && (
              <div className="px-5 py-3 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  disabled={isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {isFetching ? "جاري التحميل..." : `تحميل المزيد (${(pageData?.total ?? 0) - notifList.length} متبقٍ)`}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Notification detail dialog */}
      <Dialog open={!!selectedNotif} onOpenChange={(o) => { if (!o) setSelectedNotif(null); }}>
        <DialogContent className="sm:max-w-md">
          {selectedNotif && (() => {
            const cfg = getConfig(selectedNotif.type);
            const Icon = cfg.icon;
            const link = resolveNotificationLink(selectedNotif);
            const target = link ? `/${locale}${link}` : null;
            const isMailNotif = selectedNotif.type === "GENERAL";
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${cfg.bg}`}>
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                    </div>
                    <span>{selectedNotif.titleAr || selectedNotif.titleEn}</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2 text-sm">
                  {(selectedNotif.messageAr || selectedNotif.messageEn) && (
                    <p className="text-muted-foreground leading-relaxed">
                      {selectedNotif.messageAr || selectedNotif.messageEn}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {format(new Date(selectedNotif.createdAt), "yyyy/MM/dd HH:mm")}
                    {" · "}
                    {formatDistanceToNow(new Date(selectedNotif.createdAt), { addSuffix: true, locale: ar })}
                  </div>
                  <Badge variant="outline" className={`text-xs ${cfg.color} w-fit`}>{cfg.label}</Badge>
                  {target && (
                    <Button
                      size="sm"
                      className="w-full gap-2 mt-2"
                      onClick={() => { setSelectedNotif(null); router.push(target); }}
                    >
                      {isMailNotif ? <Mail className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                      {isMailNotif ? "فتح الرسالة" : "الذهاب للصفحة المرتبطة"}
                    </Button>
                  )}
                  {selectedNotif.type === "BIRTHDAY" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-2 text-pink-600 border-pink-200 hover:bg-pink-50"
                      onClick={() => { setSelectedNotif(null); handleBirthdayGreeting(selectedNotif); }}
                    >
                      <Cake className="h-4 w-4" />
                      إرسال تهنئة
                    </Button>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <ComposeMailModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        defaultToIds={composeToIds}
        defaultSubject={composeSubject}
        defaultBody={composeBody}
      />
    </div>
  );
}
