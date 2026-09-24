"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Calendar, Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useMyTeamAttendance } from "@/lib/hooks/use-attendance-records";
import { AttendanceStatusBadge } from "@/components/features/attendance/attendance-status-badge";
import { AttendanceRecord, AttendanceStatus } from "@/lib/api/attendance-records";
import { format } from "date-fns";
import { formatDate, formatDuration, formatTime } from "@/lib/utils/date";

const PUNCH_STATUS_CFG: Record<string, { label: string; className: string }> = {
  NEEDS_REVIEW: { label: "بحاجة مراجعة", className: "bg-amber-50 text-amber-700 border-amber-300" },
  PARTIAL:      { label: "جزئي",         className: "bg-orange-50 text-orange-700 border-orange-300" },
  INVALID:      { label: "غير صالح",     className: "bg-red-50 text-red-700 border-red-300" },
};

const ALL_STATUS_VALUES: AttendanceStatus[] = [
  "PRESENT", "ABSENT", "LATE", "EARLY_LEAVE", "HALF_DAY",
  "ON_LEAVE", "ON_MISSION", "PARTIAL_LEAVE", "HOLIDAY", "WEEKEND",
];

const LIMIT = 25;

const employeeName = (r: AttendanceRecord) =>
  `${r.employee?.firstNameAr ?? ""} ${r.employee?.lastNameAr ?? ""}`.trim();

export default function MyTeamAttendancePage() {
  return (
    <PageGuard permission={PERMISSIONS.ATTENDANCE_RECORDS.READ_TEAM}>
      <MyTeamAttendance />
    </PageGuard>
  );
}

function MyTeamAttendance() {
  const t = useTranslations();
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState(format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(new Date().getFullYear(), 11, 31), "yyyy-MM-dd"));
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useMyTeamAttendance({
    dateFrom,
    dateTo,
    page,
    limit: LIMIT,
    ...(statusFilter !== "ALL" ? { status: statusFilter as AttendanceStatus } : {}),
  });

  const payload = data as { items?: AttendanceRecord[]; total?: number; totalPages?: number;
    data?: { items?: AttendanceRecord[]; total?: number; totalPages?: number } } | undefined;
  const allRecords: AttendanceRecord[] = payload?.items ?? payload?.data?.items ?? [];
  const total = payload?.total ?? payload?.data?.total ?? 0;
  const totalPages = payload?.totalPages ?? payload?.data?.totalPages ?? Math.ceil(total / LIMIT);

  // البحث بالاسم يضيّق الصفحة المعروضة فقط — الترقيم يبقى من السيرفر.
  const term = search.trim().toLowerCase();
  const records = term
    ? allRecords.filter((r) =>
        `${employeeName(r)} ${r.employee?.employeeNumber ?? ""}`.toLowerCase().includes(term))
    : allRecords;

  const lateMinutes = (minutes?: number) => (minutes ? `${minutes} دقيقة` : "—");

  return (
    <div className="space-y-6">
      <PageHeader
        title="حضور المرؤوسين"
        description="بصمات الموظفين الذين تشرف عليهم مباشرةً"
        count={!isLoading ? total : undefined}
      />

      <div className="filter-bar flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-auto" />
        </div>
        <span className="text-muted-foreground">{t("attendance.dateTo")}</span>
        <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-auto" />

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44 bg-background">
            <SelectValue placeholder={t("attendance.fields.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("common.all")}</SelectItem>
            {ALL_STATUS_VALUES.map((s) => (
              <SelectItem key={s} value={s}>{t(`attendance.statuses.${s.toLowerCase()}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative min-w-56 flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم الموظف أو رقمه..."
            className="ps-9 bg-background"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("attendance.fields.employee")}</TableHead>
              <TableHead>{t("attendance.fields.date")}</TableHead>
              <TableHead>{t("attendance.fields.checkInTime")}</TableHead>
              <TableHead>{t("attendance.fields.checkOutTime")}</TableHead>
              <TableHead>{t("attendance.fields.workHours")}</TableHead>
              <TableHead>{t("attendance.fields.lateMinutes")}</TableHead>
              <TableHead>{t("attendance.fields.status")}</TableHead>
              <TableHead>البصمة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  {total === 0 ? "لا توجد بصمات لمرؤوسيك ضمن هذه الفترة" : t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => {
                const punch = (record as AttendanceRecord & { punchSequenceStatus?: string }).punchSequenceStatus;
                return (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {employeeName(record) || "—"}
                      {record.employee?.employeeNumber && (
                        <span className="block text-xs font-mono text-muted-foreground">
                          {record.employee.employeeNumber}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(record.date)}</TableCell>
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
                    <TableCell className="text-destructive font-medium">{lateMinutes(record.lateMinutes)}</TableCell>
                    <TableCell><AttendanceStatusBadge status={record.status} /></TableCell>
                    <TableCell>
                      {punch && PUNCH_STATUS_CFG[punch] ? (
                        <Badge variant="outline" className={`text-xs ${PUNCH_STATUS_CFG[punch].className}`}>
                          <AlertTriangle className="h-3 w-3 ml-1" />
                          {PUNCH_STATUS_CFG[punch].label}
                        </Badge>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={setPage} />
      )}
    </div>
  );
}
