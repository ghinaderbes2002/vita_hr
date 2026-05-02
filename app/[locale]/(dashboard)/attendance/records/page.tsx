"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, MoreHorizontal, Trash2, Calendar, Clock, Plus, Filter, AlertTriangle } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Pagination } from "@/components/shared/pagination";
import { useAttendanceRecords, useDeleteAttendanceRecord, useCreateAttendanceRecord } from "@/lib/hooks/use-attendance-records";
import { AttendanceStatusBadge } from "@/components/features/attendance/attendance-status-badge";
import { AttendanceRecord, AttendanceStatus } from "@/lib/api/attendance-records";
import { useEmployees } from "@/lib/hooks/use-employees";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { format } from "date-fns";
import { formatTime, formatDate } from "@/lib/utils/date";
import { Badge } from "@/components/ui/badge";

const ALL_STATUSES: { value: AttendanceStatus; label: string }[] = [
  { value: "PRESENT", label: "حاضر" },
  { value: "ABSENT", label: "غائب" },
  { value: "LATE", label: "متأخر" },
  { value: "EARLY_LEAVE", label: "خروج مبكر" },
  { value: "HALF_DAY", label: "نصف يوم" },
  { value: "ON_LEAVE", label: "في إجازة" },
  { value: "PARTIAL_LEAVE", label: "إجازة ساعية" },
  { value: "HOLIDAY", label: "عطلة رسمية" },
  { value: "WEEKEND", label: "إجازة أسبوعية" },
];

export default function AttendanceRecordsPage() {
  const t = useTranslations();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("attendance.records.create-manual");
  const [search, setSearch] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Manual entry form state
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

  const LIMIT = 10;
  const { data, isLoading } = useAttendanceRecords({
    dateFrom,
    dateTo,
    page,
    limit: LIMIT,
    ...(statusFilter !== "ALL" && { status: statusFilter as AttendanceStatus }),
  });
  const deleteRecord = useDeleteAttendanceRecord();
  const createRecord = useCreateAttendanceRecord();
  const { data: employeesData } = useEmployees({ limit: 200 });

  const employees: any[] = (employeesData as any)?.data?.items || [];

  const records = (data as any)?.items || (data as any)?.data?.items || [];
  const total = (data as any)?.total ?? (data as any)?.data?.total ?? 0;
  const totalPages = (data as any)?.totalPages ?? (data as any)?.data?.totalPages ?? Math.ceil(total / LIMIT);
  const meta = total > 0 ? { total, totalPages } : null;

  const filteredRecords = records.filter((record: AttendanceRecord) => {
    if (!search) return true;

    const searchLower = search.toLowerCase();
    const employeeNameAr = `${record.employee?.firstNameAr || ""} ${record.employee?.lastNameAr || ""}`.trim();
    const employeeNameEn = `${record.employee?.firstNameEn || ""} ${record.employee?.lastNameEn || ""}`.trim();

    return (
      employeeNameAr.toLowerCase().includes(searchLower) ||
      employeeNameEn.toLowerCase().includes(searchLower) ||
      record.employee?.employeeNumber?.toLowerCase().includes(searchLower)
    );
  });

  const handleDelete = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedRecord) {
      await deleteRecord.mutateAsync(selectedRecord.id);
      setDeleteDialogOpen(false);
      setSelectedRecord(null);
    }
  };

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
    return h > 0 ? `${h}س ${m}د` : `${m}د`;
  };

  const formatMins = (minutes?: number | null) => {
    if (!minutes || minutes <= 0) return "—";
    return `${minutes} د`;
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
              إدخال يدوي
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
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
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
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="كل الحالات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">كل الحالات</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
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
              <TableHead>دخول</TableHead>
              <TableHead>خروج</TableHead>
              <TableHead>ساعات العمل</TableHead>
              <TableHead>{t("attendance.fields.status")}</TableHead>
              <TableHead>تأخر</TableHead>
              <TableHead>مغادرة مبكرة</TableHead>
              <TableHead>المصدر</TableHead>
              <TableHead>البصمة</TableHead>
              <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                </TableRow>
              ))
            ) : filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              filteredRecords.map((record: AttendanceRecord) => (
                <TableRow key={record.id}>
                  {/* الموظف */}
                  <TableCell>
                    <div className="font-medium leading-tight">
                      {record.employee
                        ? `${record.employee.firstNameAr} ${record.employee.lastNameAr}`
                        : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {record.employee?.employeeNumber || "—"}
                    </div>
                  </TableCell>

                  {/* التاريخ */}
                  <TableCell className="font-medium text-sm">
                    {formatDate(record.date)}
                  </TableCell>

                  {/* دخول */}
                  <TableCell className="text-sm">
                    {record.clockInTime
                      ? formatTime(record.clockInTime)
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>

                  {/* خروج */}
                  <TableCell className="text-sm">
                    {record.clockOutTime
                      ? formatTime(record.clockOutTime)
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>

                  {/* ساعات العمل الفعلية */}
                  <TableCell className="text-sm font-medium">
                    {formatMinutes(record.netWorkedMinutes ?? record.workedMinutes)}
                  </TableCell>

                  {/* الحالة */}
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

                  {/* تأخر */}
                  <TableCell>
                    {(record.lateMinutes ?? 0) > 0 ? (
                      <span className="text-destructive text-sm font-medium">
                        {formatMins(record.lateMinutes)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* مغادرة مبكرة */}
                  <TableCell>
                    {(record.earlyLeaveMinutes ?? 0) > 0 ? (
                      <span className="text-orange-600 text-sm font-medium">
                        {formatMins(record.earlyLeaveMinutes)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* المصدر */}
                  <TableCell>
                    {record.isManualEntry ? (
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                        يدوي
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        بصمة
                      </Badge>
                    )}
                  </TableCell>

                  {/* حالة البصمة */}
                  <TableCell className="text-center">
                    {(() => {
                      const ps = record.punchSequenceStatus;
                      if (!ps) return <span className="text-muted-foreground text-xs">—</span>;
                      const cfg: Record<string, { label: string; cls: string }> = {
                        VALID:      { label: "✓ صحيحة",    cls: "text-green-600" },
                        PARTIAL:    { label: "⚠ جزئية",    cls: "text-amber-500" },
                        INVALID:    { label: "⚠ غير صحيحة", cls: "text-red-500" },
                        RECOMPUTED: { label: "↺ محسوبة",    cls: "text-blue-500" },
                      };
                      const c = cfg[ps];
                      return c
                        ? <span className={`text-xs font-medium ${c.cls}`}>{c.label}</span>
                        : <span className="text-xs text-muted-foreground">{ps}</span>;
                    })()}
                  </TableCell>

                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleDelete(record)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 ml-2" />
                          {t("common.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
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

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("messages.confirmDelete")}
        description={t("messages.actionCantUndo")}
        onConfirm={confirmDelete}
        variant="destructive"
      />

      {/* Manual Entry Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>إدخال سجل حضور يدوي</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>الموظف *</Label>
              <Select value={manualForm.employeeId} onValueChange={(v) => setManualForm({ ...manualForm, employeeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الموظف" />
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
                <Label>التاريخ *</Label>
                <Input type="date" value={manualForm.date} onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>الحالة *</Label>
                <Select value={manualForm.status} onValueChange={(v) => setManualForm({ ...manualForm, status: v as AttendanceStatus })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>وقت الدخول</Label>
                <Input type="time" value={manualForm.checkInTime} onChange={(e) => setManualForm({ ...manualForm, checkInTime: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>وقت الخروج</Label>
                <Input type="time" value={manualForm.checkOutTime} onChange={(e) => setManualForm({ ...manualForm, checkOutTime: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>سبب الإدخال اليدوي *</Label>
              <Textarea
                value={manualForm.manualEntryReason}
                onChange={(e) => setManualForm({ ...manualForm, manualEntryReason: e.target.value })}
                placeholder="مثال: نسيان تسجيل البصمة"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>إلغاء</Button>
            <Button
              onClick={handleCreateManual}
              disabled={!manualForm.employeeId || !manualForm.date || !manualForm.manualEntryReason || createRecord.isPending}
            >
              {createRecord.isPending ? "جاري الحفظ..." : "حفظ السجل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
