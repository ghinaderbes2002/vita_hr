"use client";

import { useState } from "react";
import { AlertTriangle, Clock, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { useHourlyBalance } from "@/lib/hooks/use-leave-balances";
import { useMyEmployee } from "@/lib/hooks/use-employees";
import { useAuthStore } from "@/lib/stores/auth-store";

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} د`;
  if (m === 0) return `${h}:00 س`;
  return `${h}:${String(m).padStart(2, "0")} س`;
}

const MONTH_NAMES_AR = [
  "", "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export default function MyHourlyBalancePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { user } = useAuthStore();
  const { data: myEmployee } = useMyEmployee();
  const employeeId = (myEmployee as any)?.id ?? user?.employeeId ?? "";

  const { data, isLoading, error } = useHourlyBalance(employeeId, year, month);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const maxMin = data?.remainingMinutes != null
    ? (data.usedByRequestsMinutes + data.usedByTardinessMinutes + data.remainingMinutes)
    : 0;
  const usedMin = data ? (data.usedByRequestsMinutes + data.usedByTardinessMinutes) : 0;
  const remainingMin = data?.remainingMinutes ?? 0;
  const usedPct = maxMin > 0 ? Math.round((usedMin / maxMin) * 100) : 0;
  const isDepleted = remainingMin === 0 && maxMin > 0;
  const isLow = !isDepleted && remainingMin > 0 && remainingMin < 30;

  return (
    <div className="space-y-6">
      <PageHeader
        title="رصيد الإجازة الساعية"
        description="متابعة رصيدك الشهري من الإجازة الساعية"
      />

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={prevMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium w-32 text-center">
          {MONTH_NAMES_AR[month]} {year}
        </span>
        <Button variant="outline" size="icon" onClick={nextMonth} disabled={isCurrentMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : error || !data ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            لا توجد بيانات لهذا الشهر
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Balance card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                ملخص الرصيد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Circular-style display */}
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center justify-center w-28 h-28 rounded-full border-4 border-primary/20 bg-primary/5 shrink-0">
                  <span className="text-2xl font-bold text-primary">{formatMinutes(remainingMin)}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">متبقي</span>
                </div>
                <div className="flex-1 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الحد الأقصى الشهري</span>
                    <span className="font-medium">{formatMinutes(maxMin)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المستخدم</span>
                    <span className="font-medium">{formatMinutes(usedMin)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المتبقي</span>
                    <span className={`font-medium ${isDepleted ? "text-destructive" : isLow ? "text-amber-600" : "text-green-600"}`}>
                      {formatMinutes(remainingMin)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-1">
                <Progress value={usedPct} className="h-2" />
                <p className="text-xs text-muted-foreground text-left">{usedPct}% مستخدم</p>
              </div>

              {/* Status alerts */}
              {isDepleted && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  استنفدت رصيدك الشهري — أي تأخير قادم سيُحسم من راتبك
                </div>
              )}
              {isLow && (
                <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  رصيدك قارب على النفاد
                  <Badge variant="outline" className="mr-auto border-amber-400 text-amber-700 text-xs">
                    {formatMinutes(remainingMin)} متبقي
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usage breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">تفاصيل الاستخدام</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Requests */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-lg">📋</span>
                  طلبات إجازة ساعية
                  <Badge variant="secondary" className="mr-auto">{formatMinutes(data.usedByRequestsMinutes)}</Badge>
                </div>
                {data.usedByRequestsMinutes === 0 && (
                  <p className="text-xs text-muted-foreground pr-7">لا توجد طلبات هذا الشهر</p>
                )}
              </div>

              <div className="h-px bg-border" />

              {/* Tardiness offsets */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-lg">⏰</span>
                  تعويض تأخيرات
                  <Badge variant="secondary" className="mr-auto">{formatMinutes(data.usedByTardinessMinutes)}</Badge>
                </div>
                {data.usedByTardinessMinutes === 0 && (
                  <p className="text-xs text-muted-foreground pr-7">لا تأخيرات مخصومة هذا الشهر</p>
                )}
                {data.usedByTardinessMinutes > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pr-7">
                    <RotateCcw className="h-3 w-3" />
                    خُصم تلقائياً من رصيدك لتغطية التأخيرات
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
