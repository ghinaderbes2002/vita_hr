"use client";

import { useState } from "react";
import { format, subDays } from "date-fns";
import { Coffee, Calendar, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { useMyBreaks } from "@/lib/hooks/use-attendance-breaks";
import { AttendanceBreak, BREAK_TYPE_LABELS } from "@/lib/api/attendance-breaks";
import { formatTime } from "@/lib/utils/date";

function formatDuration(minutes: number | null) {
  if (!minutes || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} د`;
  return m === 0 ? `${h} س` : `${h} س ${m} د`;
}

function StatusBadge({ status }: { status: AttendanceBreak["status"] }) {
  if (status === "AUTHORIZED")
    return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">مُعتمد</Badge>;
  if (status === "REJECTED")
    return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">مرفوض</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">بانتظار</Badge>;
}

export default function MyBreaksPage() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data, isLoading } = useMyBreaks({ dateFrom, dateTo });
  const breaks: AttendanceBreak[] = (data as any) || [];

  const totalMinutes = breaks.reduce((s, b) => s + (b.durationMinutes || 0), 0);
  const avgPerDay = breaks.length > 0
    ? Math.round(totalMinutes / Math.max(1, new Set(breaks.map((b) => b.startTime.split("T")[0])).size))
    : 0;

  const authorizedCount = breaks.filter((b) => b.status === "AUTHORIZED").length;
  const pendingCount = breaks.filter((b) => b.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="بريكاتي"
        description="سجل استراحاتك خلال الفترة المحددة"
      />

      {/* Date filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto" />
        </div>
        <span className="text-muted-foreground">—</span>
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto" />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Coffee className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي الاستراحات</p>
                <p className="text-xl font-bold">{isLoading ? "—" : breaks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي الوقت</p>
                <p className="text-xl font-bold">{isLoading ? "—" : formatDuration(totalMinutes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">متوسط يومي</p>
                <p className="text-xl font-bold">{isLoading ? "—" : formatDuration(avgPerDay)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Coffee className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">معتمد / بانتظار</p>
                <p className="text-xl font-bold">
                  {isLoading ? "—" : <><span className="text-green-700">{authorizedCount}</span> / <span className="text-amber-600">{pendingCount}</span></>}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Coffee className="h-4 w-4 text-amber-600" />
            سجل الاستراحات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : breaks.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              لا توجد استراحات في هذه الفترة
            </div>
          ) : (
            <div className="space-y-2">
              {[...breaks]
                .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                .map((brk) => (
                  <div
                    key={brk.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2.5 gap-3 flex-wrap"
                  >
                    <div className="flex items-center gap-3">
                      <Coffee className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">
                          {brk.type ? BREAK_TYPE_LABELS[brk.type] : "غير محدد"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(brk.startTime).toLocaleDateString("ar-SA")} —{" "}
                          {formatTime(brk.startTime)}
                          {brk.endTime ? ` ← ${formatTime(brk.endTime)}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {brk.durationMinutes != null && (
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(brk.durationMinutes)}
                        </span>
                      )}
                      <StatusBadge status={brk.status} />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
