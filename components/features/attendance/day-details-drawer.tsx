"use client";

import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { AlertTriangle, Briefcase, CalendarClock, Clock, FileText, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { useAttendanceDayDetails } from "@/lib/hooks/use-attendance-records";
import type { DeductionOutcome } from "@/lib/api/attendance-records";
import { formatHoursAr } from "@/lib/utils/date";

const OUTCOME_CFG: Record<DeductionOutcome, { label: string; className: string }> = {
  NO_DEDUCTION:   { label: "مبرر بلا خصم", className: "bg-green-50 text-green-700 border-green-300" },
  WITH_DEDUCTION: { label: "معتمد مع خصم", className: "bg-amber-50 text-amber-700 border-amber-300" },
  PENDING:        { label: "قيد المراجعة", className: "bg-gray-50 text-gray-600 border-gray-300" },
};

const ALERT_LABELS: Record<string, string> = {
  LATE: "تأخير",
  EARLY_LEAVE: "انصراف مبكر",
  ABSENT: "غياب",
};

const AUTO_TYPE_LABELS: Record<string, string> = {
  LATE_COMPENSATION: "تعويض تأخير",
  EARLY_LEAVE_COMPENSATION: "تعويض انصراف مبكر",
};

// The late/early figures in this same response are already measured against the
// worked half, so the note only explains why they look small — it never adjusts them.
const HALF_DAY_NOTE: Record<"MORNING" | "AFTERNOON", string> = {
  MORNING: "إجازة نصف يوم (صبح) معتمدة — الدوام المطلوب بدأ من منتصف الدوام",
  AFTERNOON: "إجازة نصف يوم (بعد الظهر) معتمدة — الدوام المطلوب كان لغاية منتصف الدوام فقط",
};

const MISSION_TYPE_LABELS: Record<string, string> = {
  INTERNAL: "مهمة داخلية",
  EXTERNAL: "مهمة خارجية",
};

const fmtTime = (iso?: string | null) =>
  iso ? format(new Date(iso), "hh:mm a", { locale: ar }) : "—";

const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : format(d, "PPP", { locale: ar });
};

const fmtMins = (m?: number | null) => (m && m > 0 ? `${m} دقيقة` : "—");

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

interface Props {
  recordId: string;
  open: boolean;
  onClose: () => void;
}

export function DayDetailsDrawer({ recordId, open, onClose }: Props) {
  // Only fetched while the drawer is open — one row's details, on demand.
  const { data, isLoading } = useAttendanceDayDetails(recordId, open);

  // Every array can come back empty, which means that case simply didn't happen
  // on this day, so each section is dropped rather than shown as "none".
  const hasJustifications = !!data?.justifications.length;
  const hasAutoLeave = !!data?.autoHourlyLeaveUsage.length;
  const hasManualLeave = !!data?.manualHourlyLeave.length;
  const hasMission = !!data?.businessMission.length;
  const hasUnapprovedLeave = !!data?.absenceWithUnapprovedLeave.length;
  const halfDayPeriod = data?.halfDayLeavePeriod ?? null;
  const hasAnySection =
    hasJustifications || hasAutoLeave || hasManualLeave || hasMission || hasUnapprovedLeave || !!halfDayPeriod;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto" dir="rtl">
        <SheetHeader>
          <SheetTitle>تفاصيل اليوم</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !data ? (
          <p className="p-4 text-sm text-muted-foreground">لا توجد بيانات</p>
        ) : (
          <div className="space-y-5 p-4">
            {/* Summary — the same figures the attendance table shows */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">التاريخ</p>
                <p className="font-medium">{fmtDate(data.date)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الحالة</p>
                <p className="font-medium">{data.status}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الدخول</p>
                <p className="font-medium">{fmtTime(data.clockInTime)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الخروج</p>
                <p className="font-medium">{fmtTime(data.clockOutTime)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">التأخير</p>
                <p className={data.lateMinutes > 0 ? "font-medium text-red-600" : "font-medium"}>
                  {fmtMins(data.lateMinutes)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الانصراف المبكر</p>
                <p className={data.earlyLeaveMinutes > 0 ? "font-medium text-orange-600" : "font-medium"}>
                  {fmtMins(data.earlyLeaveMinutes)}
                </p>
              </div>
            </div>

            {hasUnapprovedLeave && (
              <>
                <Separator />
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span>غياب — يوجد طلب إجازة بانتظار الموافقة</span>
                  </div>
                  {data.absenceWithUnapprovedLeave.map((l) => (
                    <div key={l.id} className="text-xs text-amber-900">
                      {l.typeName ?? "إجازة"} — من {fmtDate(l.startDate)} إلى {fmtDate(l.endDate)}
                      <Badge variant="outline" className="mr-2 text-[10px]">{l.status}</Badge>
                    </div>
                  ))}
                </div>
              </>
            )}

            {hasJustifications && (
              <>
                <Separator />
                <Section icon={<FileText className="h-4 w-4" />} title="التبريرات">
                  {data.justifications.map((j, i) => {
                    const cfg = OUTCOME_CFG[j.deductionOutcome] ?? OUTCOME_CFG.PENDING;
                    return (
                      <div key={i} className="rounded-md border p-3 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{ALERT_LABELS[j.alertType] ?? j.alertType}</span>
                          <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>{cfg.label}</Badge>
                        </div>
                        {j.reason && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{j.reason}</p>}
                        <div className="text-[11px] text-muted-foreground space-y-0.5">
                          {j.managerReviewedAt && <p>مراجعة المدير: {fmtDate(j.managerReviewedAt)}</p>}
                          {j.hrReviewedAt && <p>مراجعة الموارد البشرية: {fmtDate(j.hrReviewedAt)}</p>}
                        </div>
                      </div>
                    );
                  })}
                </Section>
              </>
            )}

            {hasAutoLeave && (
              <>
                <Separator />
                <Section icon={<Timer className="h-4 w-4" />} title="من الرصيد الشهري">
                  {data.autoHourlyLeaveUsage.map((u, i) => (
                    <div key={i} className="rounded-md border p-3 text-sm space-y-1">
                      <p className="font-medium">{AUTO_TYPE_LABELS[u.type] ?? u.type}</p>
                      <p className="text-xs text-muted-foreground">
                        استُهلك {u.minutes} دقيقة من رصيدك الشهري
                      </p>
                      <Badge variant="outline" className="text-[10px]">{u.status}</Badge>
                    </div>
                  ))}
                </Section>
              </>
            )}

            {halfDayPeriod && (
              <>
                <Separator />
                <Section icon={<CalendarClock className="h-4 w-4" />} title="إجازة نصف يوم">
                  <div className="rounded-md border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
                    {HALF_DAY_NOTE[halfDayPeriod]}
                  </div>
                </Section>
              </>
            )}

            {hasManualLeave && (
              <>
                <Separator />
                <Section icon={<Clock className="h-4 w-4" />} title="إجازة ساعية">
                  {data.manualHourlyLeave.map((l) => (
                    <div key={l.id} className="rounded-md border p-3 text-sm space-y-1">
                      <p className="font-medium">
                        {l.startTime && l.endTime
                          ? `إجازة ساعية من ${l.startTime} لـ${l.endTime}`
                          : l.typeName ?? "إجازة ساعية"}
                      </p>
                      {l.durationHours != null && (
                        <p className="text-xs text-muted-foreground">المدة: {formatHoursAr(l.durationHours)}</p>
                      )}
                      {l.reason && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{l.reason}</p>}
                      <Badge variant="outline" className="text-[10px]">{l.status}</Badge>
                    </div>
                  ))}
                </Section>
              </>
            )}

            {hasMission && (
              <>
                <Separator />
                <Section icon={<Briefcase className="h-4 w-4" />} title="مهمة عمل">
                  {data.businessMission.map((m) => (
                    <div key={m.id} className="rounded-md border p-3 text-sm space-y-1">
                      <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-300">
                        {MISSION_TYPE_LABELS[m.missionType ?? ""] ?? "مهمة عمل"}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        من {fmtDate(m.startDate)} إلى {fmtDate(m.endDate)}
                      </p>
                      <Badge variant="outline" className="text-[10px]">{m.status}</Badge>
                    </div>
                  ))}
                </Section>
              </>
            )}

            {!hasAnySection && (
              <>
                <Separator />
                <p className="text-sm text-muted-foreground">لا توجد تبريرات أو إجازات أو مهام على هذا اليوم.</p>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
