"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyAttendance } from "@/lib/hooks/use-attendance-records";
import { AttendanceStatusBadge } from "@/components/features/attendance/attendance-status-badge";
import { AttendanceRecord } from "@/lib/api/attendance-records";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function MyAttendancePage() {
  const t = useTranslations();
  const [dateFrom, setDateFrom] = useState(
    format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd")
  );
  const [dateTo, setDateTo] = useState(
    format(new Date(new Date().getFullYear(), 11, 31), "yyyy-MM-dd")
  );

  const { data, isLoading } = useMyAttendance({ dateFrom, dateTo });

  const records = Array.isArray(data)
    ? data
    : (data as any)?.data?.items || (data as any)?.data || [];

  const formatTime = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "hh:mm a", { locale: ar });
    } catch {
      return "-";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ar });
    } catch {
      return dateString;
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}${t("attendance.hourShort")} ${mins}${t("attendance.minuteShort")}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("attendance.myAttendance")}
        description={t("attendance.myAttendanceDescription")}
      />

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-auto"
          />
        </div>
        <span className="text-muted-foreground">{t("attendance.dateTo")}</span>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-auto"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("attendance.fields.date")}</TableHead>
              <TableHead>{t("attendance.fields.checkInTime")}</TableHead>
              <TableHead>{t("attendance.fields.checkOutTime")}</TableHead>
              <TableHead>{t("attendance.fields.workHours")}</TableHead>
              <TableHead>{t("attendance.fields.lateMinutes")}</TableHead>
              <TableHead>{t("attendance.fields.status")}</TableHead>
              <TableHead>{t("attendance.fields.location")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              records.map((record: AttendanceRecord) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {formatDate(record.date)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {formatTime(record.clockInTime)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {formatTime(record.clockOutTime)}
                    </div>
                  </TableCell>
                  <TableCell>{formatDuration(record.workedMinutes)}</TableCell>
                  <TableCell>
                    {record.lateMinutes ? (
                      <span className="text-destructive">
                        {formatDuration(record.lateMinutes)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <AttendanceStatusBadge status={record.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {record.clockInLocation || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
