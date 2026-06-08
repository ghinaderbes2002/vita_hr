"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Calendar, Plus, Filter, AlertTriangle, Fingerprint } from "lucide-react";
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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/shared/pagination";
import { useAttendanceRecords, useCreateAttendanceRecord } from "@/lib/hooks/use-attendance-records";
import { AttendanceStatusBadge } from "@/components/features/attendance/attendance-status-badge";
import { AttendanceRecord, AttendanceStatus } from "@/lib/api/attendance-records";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { format } from "date-fns";
import { formatTime, formatDate } from "@/lib/utils/date";
import { Badge } from "@/components/ui/badge";
import { BreaksDrawer } from "@/components/features/attendance/breaks-drawer";
import { RawStampsDrawer } from "@/components/features/attendance/raw-stamps-drawer";

const PUNCH_STATUS_CLASSES: Record<string, string> = {
  NEEDS_REVIEW: "bg-amber-50 text-amber-700 border-amber-300",
  PARTIAL:      "bg-orange-50 text-orange-700 border-orange-300",
  INVALID:      "bg-red-50 text-red-700 border-red-300",
  VALID:        "bg-green-50 text-green-700 border-green-300",
};

const ALL_STATUS_VALUES: AttendanceStatus[] = [
  "PRESENT", "ABSENT", "LATE", "EARLY_LEAVE", "HALF_DAY",
  "ON_LEAVE", "PARTIAL_LEAVE", "HOLIDAY", "WEEKEND",
];

export default function AttendanceRecordsPage() {
  const t = useTranslations();
  const { hasPermission, isAdmin } = usePermissions();
  const canCreate = hasPermission("attendance.records.create-manual");
  const canManageBreaks = isAdmin() || hasPermission("attendance.breaks.manage");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [breaksDrawerOpen, setBreaksDrawerOpen] = useState(false);
  const [stampsRecordId, setStampsRecordId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [manualForm, setManualForm] = useState({
    employeeId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    checkInTime: "",
    checkOutTime: "",
    status: "PRESENT" as AttendanceStatus,
    manualEntryReason: "",
  });

  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState(
    format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd")
  );
  const [dateTo, setDateTo] = useState(
    format(new Date(new Date().getFullYear(), 11, 31), "yyyy-MM-dd")
  );

  const LIMIT = 25;
  const { data, isLoading } = useAttendanceRecords({
    dateFrom,
    dateTo,
    page,
    limit: LIMIT,
    ...(statusFilter !== "ALL" && { status: statusFilter as AttendanceStatus }),
    ...(selectedEmployeeId && { employeeId: selectedEmployeeId }),
  });
  const createRecord = useCreateAttendanceRecord();
  const { data: employeesData } = useEmployeesBasicList();

  const employees: any[] = Array.isArray(employeesData) ? employeesData : [];

  const records = (data as any)?.items || (data as any)?.data?.items || [];
  const total = (data as any)?.total ?? (data as any)?.data?.total ?? 0;
  const totalPages = (data as any)?.totalPages ?? (data as any)?.data?.totalPages ?? Math.ceil(total / LIMIT);
  const meta = total > 0 ? { total, totalPages } : null;

  const filteredRecords = records;

  const searchedEmployees = search.trim()
    ? employees.filter((e: any) => {
        const nameAr = `${e.firstNameAr || ""} ${e.lastNameAr || ""}`.toLowerCase();
        const nameEn = `${e.firstNameEn || ""} ${e.lastNameEn || ""}`.toLowerCase();
        const num = (e.employeeNumber || "").toLowerCase();
        const q = search.toLowerCase();
        return nameAr.includes(q) || nameEn.includes(q) || num.includes(q);
      }).slice(0, 8)
    : [];

  const handleCreateManual = async () => {
    if (!manualForm.employeeId || !manualForm.date || !manualForm.manualEntryReason) return;
    await createRecord.mutateAsync({
      employeeId: manualForm.employeeId,
      date: manualForm.date,
      status: manualForm.status,
      ...(manualForm.checkInTime && { clockInTime: `${manualForm.date}T${manualForm.checkInTime}:00` }),
      ...(manualForm.checkOutTime && { clockOutTime: `${manualForm.date}T${manualForm.checkOutTime}:00` }),
      manualEntryReason: manualForm.manualEntryReason,
    });
    setCreateDialogOpen(false);
    setManualForm({
      employeeId: "",
      date: format(new Date(), "yyyy-MM-dd"),
      checkInTime: "",
      checkOutTime: "",
      status: "PRESENT",
      manualEntryReason: "",
    });
  };

  const formatMinutes = (minutes?: number | null) => {
    if (!minutes || minutes <= 0) return "—";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const formatMins = (minutes?: number | null) => {
    if (!minutes || minutes <= 0) return "—";
    return `${minutes}${t("attendance.minuteShort")}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("attendance.recordsTitle")}
        description={t("attendance.recordsDescription")}
        actions={
          canCreate && (
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("attendance.manualEntry")}
            </Button>
          )
        }
      />

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("attendance.searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!e.target.value) { setSelectedEmployeeId(""); setPage(1); }
            }}
            className="pr-10"
          />
          {searchedEmployees.length > 0 && (
            <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-md shadow-md overflow-hidden">
              {searchedEmployees.map((e: any) => (
                <button
                  key={e.id}
                  type="button"
                  className="w-full text-right px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between"
                  onClick={() => {
                    setSelectedEmployeeId(e.id);
                    setSearch(`${e.firstNameAr} ${e.lastNameAr}`);
                    setPage(1);
                  }}
                >
                  <span className="text-muted-foreground text-xs">{e.employeeNumber}</span>
                  <span>{e.firstNameAr} {e.lastNameAr}</span>
                </button>
              ))}
            </div>
          )}
        </div>
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
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("attendance.allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("attendance.allStatuses")}</SelectItem>
              {ALL_STATUS_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`attendance.statuses.${value.toLowerCase()}` as any)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("attendance.fields.employee")}</TableHead>
              <TableHead>{t("attendance.fields.date")}</TableHead>
              <TableHead>{t("attendance.fields.checkIn")}</TableHead>
              <TableHead>{t("attendance.fields.checkOut")}</TableHead>
              <TableHead>{t("attendance.fields.workHours")}</TableHead>
              <TableHead>{t("attendance.fields.status")}</TableHead>
              <TableHead>{t("attendance.fields.late")}</TableHead>
              <TableHead>{t("attendance.fields.earlyLeave")}</TableHead>
              <TableHead>{t("attendance.fields.source")}</TableHead>
              <TableHead>{t("attendance.fields.punchStatus")}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 11 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              filteredRecords.map((record: AttendanceRecord) => {
                const isExempt = (record as any).employee?.attendanceConfig?.salaryLinked === false;
                return (
                  <TableRow
                    key={record.id}
                    className={`cursor-pointer hover:bg-muted/40 ${isExempt ? "opacity-60 bg-muted/30" : ""}`}
                    onClick={() => { setSelectedRecord(record); setBreaksDrawerOpen(true); }}
                  >
                    <TableCell>
                      <div className="font-medium leading-tight flex items-center gap-1.5 flex-wrap">
                        {record.employee
                          ? `${record.employee.firstNameAr} ${record.employee.lastNameAr}`
                          : "—"}
                        {isExempt && (
                          <span className="text-[10px] text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-1.5 py-0.5">
                            {t("attendance.exempt")}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {record.employee?.employeeNumber || "—"}
                      </div>
                    </TableCell>

                    <TableCell className="font-medium text-sm">
                      {formatDate(record.date)}
                    </TableCell>

                    <TableCell className="text-sm">
                      {record.clockInTime
                        ? formatTime(record.clockInTime)
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>

                    <TableCell className="text-sm">
                      {record.clockOutTime
                        ? formatTime(record.clockOutTime)
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>

                    <TableCell className="text-sm font-medium">
                      {formatMinutes(record.netWorkedMinutes ?? record.workedMinutes)}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        <AttendanceStatusBadge status={record.status} />
                        {record.syncError && (
                          <span title={record.syncError}>
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {(record.lateMinutes ?? 0) > 0 ? (
                        <span className="text-destructive text-sm font-medium">
                          {formatMins(record.lateMinutes)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {(record.earlyLeaveMinutes ?? 0) > 0 ? (
                        <span className="text-orange-600 text-sm font-medium">
                          {formatMins(record.earlyLeaveMinutes)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {record.isManualEntry ? (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                          {t("attendance.sourceManual")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {t("attendance.sourceBiometric")}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {record.punchSequenceStatus && PUNCH_STATUS_CLASSES[record.punchSequenceStatus] ? (
                        <Badge variant="outline" className={`text-xs ${PUNCH_STATUS_CLASSES[record.punchSequenceStatus]}`}>
                          {record.punchSequenceStatus !== "VALID" && <AlertTriangle className="h-3 w-3 ml-1" />}
                          {t(`attendance.punchStatuses.${record.punchSequenceStatus}` as any)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        title={t("attendance.reviewStamps")}
                        onClick={() => setStampsRecordId(record.id)}
                      >
                        <Fingerprint className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {meta && (
        <Pagination
          page={page}
          totalPages={meta.totalPages}
          total={meta.total}
          limit={LIMIT}
          onPageChange={setPage}
        />
      )}

      <BreaksDrawer
        record={selectedRecord}
        open={breaksDrawerOpen}
        onOpenChange={setBreaksDrawerOpen}
        canManage={canManageBreaks}
      />

      {stampsRecordId && (
        <RawStampsDrawer
          recordId={stampsRecordId}
          open={!!stampsRecordId}
          onClose={() => setStampsRecordId(null)}
        />
      )}

      {/* Manual Entry Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("attendance.manualEntryTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("attendance.fields.employee")} *</Label>
              <Select value={manualForm.employeeId} onValueChange={(v) => setManualForm({ ...manualForm, employeeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("requests.dialog.chooseEmployee")} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.firstNameAr} {e.lastNameAr} — {e.employeeNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("attendance.fields.date")} *</Label>
                <Input type="date" value={manualForm.date} onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("attendance.fields.status")} *</Label>
                <Select value={manualForm.status} onValueChange={(v) => setManualForm({ ...manualForm, status: v as AttendanceStatus })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUS_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(`attendance.statuses.${value.toLowerCase()}` as any)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("attendance.fields.checkInTime")}</Label>
                <Input type="time" value={manualForm.checkInTime} onChange={(e) => setManualForm({ ...manualForm, checkInTime: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("attendance.fields.checkOutTime")}</Label>
                <Input type="time" value={manualForm.checkOutTime} onChange={(e) => setManualForm({ ...manualForm, checkOutTime: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("attendance.manualReasonLabel")}</Label>
              <Textarea
                value={manualForm.manualEntryReason}
                onChange={(e) => setManualForm({ ...manualForm, manualEntryReason: e.target.value })}
                placeholder={t("attendance.manualReasonPlaceholder")}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button
              onClick={handleCreateManual}
              disabled={!manualForm.employeeId || !manualForm.date || !manualForm.manualEntryReason || createRecord.isPending}
            >
              {createRecord.isPending ? t("attendance.saving") : t("attendance.saveRecord")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
