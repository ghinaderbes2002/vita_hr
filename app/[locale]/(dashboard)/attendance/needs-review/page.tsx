"use client";

import { useState } from "react";
import { Eye, ChevronRight, ChevronLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { useNeedsReview } from "@/lib/hooks/use-attendance-records";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { RawStampsDrawer } from "@/components/features/attendance/raw-stamps-drawer";
import { formatDate, formatTime } from "@/lib/utils/date";

const PUNCH_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  NEEDS_REVIEW: { label: "بحاجة مراجعة", className: "bg-amber-50 text-amber-700 border-amber-300" },
  PARTIAL:      { label: "جزئي",         className: "bg-orange-50 text-orange-700 border-orange-300" },
  INVALID:      { label: "غير صالح",     className: "bg-red-50 text-red-700 border-red-300" },
  VALID:        { label: "صالح",         className: "bg-green-50 text-green-700 border-green-300" },
};

const LIMIT = 15;

export default function NeedsReviewPage() {
  const [page, setPage]             = useState(1);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");
  const [drawerRecordId, setDrawerRecordId] = useState<string | null>(null);

  const { data, isLoading } = useNeedsReview({
    employeeId: employeeId || undefined,
    dateFrom:   dateFrom   || undefined,
    dateTo:     dateTo     || undefined,
    page,
    limit: LIMIT,
  });

  const { data: empListData } = useEmployeesBasicList();
  const employees: any[] = Array.isArray(empListData) ? empListData : [];

  const items      = data?.items      ?? [];
  const total      = data?.total      ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const resetPage = () => setPage(1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="سجلات الحضور بحاجة لمراجعة"
        description="سجلات الحضور التي تحتاج تدخلاً يدوياً لتصحيح البصمات"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={employeeId || "all"}
          onValueChange={(v) => { setEmployeeId(v === "all" ? "" : v); resetPage(); }}
        >
          <SelectTrigger className="w-48 h-9 text-sm">
            <SelectValue placeholder="كل الموظفين" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الموظفين</SelectItem>
            {employees.map((e: any) => (
              <SelectItem key={e.id} value={e.id}>
                {e.firstNameAr} {e.lastNameAr}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="h-9 text-sm w-36"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); resetPage(); }}
          />
          <span className="text-muted-foreground text-sm">—</span>
          <Input
            type="date"
            className="h-9 text-sm w-36"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); resetPage(); }}
          />
        </div>

        {(employeeId || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => { setEmployeeId(""); setDateFrom(""); setDateTo(""); resetPage(); }}
          >
            مسح الفلتر
          </Button>
        )}

        {total > 0 && (
          <Badge variant="outline" className="mr-auto gap-1 border-amber-300 text-amber-700 bg-amber-50">
            <AlertTriangle className="h-3 w-3" />
            {total} سجل
          </Badge>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>الموظف</TableHead>
              <TableHead>الدخول</TableHead>
              <TableHead>الخروج</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>إجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-sm">
                  لا توجد سجلات بحاجة لمراجعة
                </TableCell>
              </TableRow>
            ) : (
              items.map((record: any) => {
                const statusKey = record.punchSequenceStatus ?? "NEEDS_REVIEW";
                const statusCfg = PUNCH_STATUS_LABELS[statusKey] ?? PUNCH_STATUS_LABELS.NEEDS_REVIEW;
                const empName = record.employee
                  ? `${record.employee.firstNameAr} ${record.employee.lastNameAr}`
                  : record.employeeId;
                return (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium text-sm">
                      {format(new Date(record.date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{empName}</div>
                      {record.employee?.employeeNumber && (
                        <div className="text-xs text-muted-foreground">{record.employee.employeeNumber}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {record.clockInTime
                        ? format(new Date(record.clockInTime), "HH:mm")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {record.clockOutTime
                        ? format(new Date(record.clockOutTime), "HH:mm")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${statusCfg.className}`}>
                        <AlertTriangle className="h-3 w-3 ml-1" />
                        {statusCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-8 text-xs"
                        onClick={() => setDrawerRecordId(record.id)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        مراجعة
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={LIMIT}
          onPageChange={setPage}
        />
      )}

      {/* Raw stamps drawer */}
      {drawerRecordId && (
        <RawStampsDrawer
          recordId={drawerRecordId}
          open={!!drawerRecordId}
          onClose={() => setDrawerRecordId(null)}
        />
      )}
    </div>
  );
}
