"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useSalaryAdvance } from "@/lib/hooks/use-salary-advances";
import { CancelSalaryAdvanceDialog } from "@/components/features/payroll/cancel-salary-advance-dialog";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { formatUSD } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "نشطة",
  COMPLETED: "مكتملة",
  CANCELLED: "ملغاة",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

const MONTHS = [
  "", "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export default function SalaryAdvanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data, isLoading } = useSalaryAdvance(id);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">لا توجد بيانات</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowRight className="h-4 w-4 ml-2" />
          العودة
        </Button>
      </div>
    );
  }

  const installments = data.installments || [];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowRight className="h-4 w-4 ml-2" />
          العودة
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">
            سلفة — {data.employee
              ? `${data.employee.firstNameAr} ${data.employee.lastNameAr}`
              : "—"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {data.employee?.employeeNumber} · بداية {MONTHS[data.startMonth]} {data.startYear}
          </p>
        </div>
        <Badge variant={STATUS_VARIANTS[data.status] || "outline"}>
          {STATUS_LABELS[data.status] || data.status}
        </Badge>
        {data.status === "ACTIVE" && (
          <ActionGuard permission={PERMISSIONS.ATTENDANCE_PAYROLL.GENERATE}>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={() => setCancelOpen(true)}
            >
              <XCircle className="h-4 w-4" />
              إلغاء السلفة
            </Button>
          </ActionGuard>
        )}
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ملخص السلفة</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">المبلغ الإجمالي</p>
            <p className="font-semibold text-base font-mono">{formatUSD(data.totalAmount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">الرصيد المتبقي</p>
            <p className="font-semibold text-base font-mono">{formatUSD(data.remainingBalance)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">قيمة القسط الشهري</p>
            <p className="font-medium font-mono">{formatUSD(data.installmentAmount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">الأقساط</p>
            <p className="font-medium">{data.paidInstallments} مدفوع / {data.totalInstallments} إجمالي</p>
          </div>
          {data.reason && (
            <div className="col-span-2">
              <p className="text-muted-foreground">السبب</p>
              <p className="font-medium">{data.reason}</p>
            </div>
          )}
          {data.cancelReason && (
            <div className="col-span-2">
              <p className="text-muted-foreground text-destructive">سبب الإلغاء</p>
              <p className="font-medium text-destructive">{data.cancelReason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Installments */}
      {installments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">سجل الأقساط المخصومة</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>الشهر / السنة</TableHead>
                  <TableHead>المبلغ المخصوم</TableHead>
                  <TableHead>تاريخ الخصم</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.map((inst, i) => (
                  <TableRow key={inst.id}>
                    <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                    <TableCell className="text-sm">
                      {MONTHS[inst.month]} {inst.year}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{formatUSD(inst.amount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {inst.deductedAt
                        ? new Date(inst.deductedAt).toLocaleDateString("ar-SY")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <CancelSalaryAdvanceDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        advanceId={id}
      />
    </div>
  );
}
