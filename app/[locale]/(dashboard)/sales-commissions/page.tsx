"use client";

import { useState } from "react";
import { Plus, Trash2, CheckCircle2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useSalesCommissions,
  useDeleteSalesCommission,
  useConfirmSalesCommission,
} from "@/lib/hooks/use-sales-commissions";
import { CreateCommissionDialog } from "@/components/features/payroll/create-commission-dialog";
import { SalesCommission } from "@/lib/api/sales-commissions";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { formatUSD } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "مسودة",
  CONFIRMED: "معتمدة",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  DRAFT: "outline",
  CONFIRMED: "default",
};

const MONTHS = [
  "", "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - i);

export default function SalesCommissionsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<SalesCommission | null>(null);

  const { data, isLoading } = useSalesCommissions({
    year,
    month,
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 100,
  });
  const deleteCommission = useDeleteSalesCommission();
  const confirmCommission = useConfirmSalesCommission();

  const items: SalesCommission[] = data?.items || [];

  const handleDelete = async () => {
    if (!selected) return;
    await deleteCommission.mutateAsync(selected.id);
    setDeleteOpen(false);
    setSelected(null);
  };

  const handleConfirm = async () => {
    if (!selected) return;
    await confirmCommission.mutateAsync(selected.id);
    setConfirmOpen(false);
    setSelected(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="عمولات المبيعات"
        description="إدارة عمولات المبيعات الشهرية للموظفين"
        actions={
          <ActionGuard permission={PERMISSIONS.ATTENDANCE_PAYROLL.GENERATE}>
            <Button
              onClick={() => setCreateOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              إضافة عمولة
            </Button>
          </ActionGuard>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">السنة:</span>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-27.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">الشهر:</span>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-32.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.slice(1).map((label, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">الحالة:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="DRAFT">مسودة</SelectItem>
                  <SelectItem value="CONFIRMED">معتمدة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {items.length > 0 && (
              <span className="text-sm text-muted-foreground">{items.length} عمولة</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الموظف</TableHead>
              <TableHead>الشهر / السنة</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>الوصف</TableHead>
              <TableHead>المرجع</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="w-12.5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  لا توجد عمولات لهذا الشهر
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell>
                    <p className="font-medium text-sm">
                      {item.employee
                        ? `${item.employee.firstNameAr} ${item.employee.lastNameAr}`
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.employee?.employeeNumber}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {MONTHS[item.month]} {item.year}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-medium">
                    {formatUSD(item.amount)}
                  </TableCell>
                  <TableCell className="text-sm max-w-50 truncate">
                    {item.description}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.salesReference || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[item.status] || "outline"}>
                      {STATUS_LABELS[item.status] || item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {item.status === "DRAFT" && (
                          <DropdownMenuItem
                            onClick={() => { setSelected(item); setConfirmOpen(true); }}
                          >
                            <CheckCircle2 className="h-4 w-4 ml-2 text-green-600" />
                            اعتماد العمولة
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => { setSelected(item); setDeleteOpen(true); }}
                        >
                          <Trash2 className="h-4 w-4 ml-2" />
                          حذف
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

      <CreateCommissionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultYear={year}
        defaultMonth={month}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="اعتماد العمولة"
        description={`هل تريد اعتماد عمولة ${selected?.employee?.firstNameAr || ""} بمبلغ ${formatUSD(selected?.amount)}؟`}
        onConfirm={handleConfirm}
        confirmText="اعتماد"
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="حذف العمولة"
        description="هل أنت متأكد من حذف هذه العمولة؟"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
