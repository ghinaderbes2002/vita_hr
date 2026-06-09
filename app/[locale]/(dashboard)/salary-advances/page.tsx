"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Eye, Trash2 } from "lucide-react";
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
import { useSalaryAdvances, useDeleteSalaryAdvance } from "@/lib/hooks/use-salary-advances";
import { CreateSalaryAdvanceDialog } from "@/components/features/payroll/create-salary-advance-dialog";
import { SalaryAdvance } from "@/lib/api/salary-advances";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { formatUSD } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export default function SalaryAdvancesPage() {
  const t = useTranslations("salaryAdvances");
  const tPayroll = useTranslations("payroll");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<SalaryAdvance | null>(null);

  const { data, isLoading } = useSalaryAdvances({
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 100,
  });
  const deleteAdvance = useDeleteSalaryAdvance();

  const items: SalaryAdvance[] = data?.items || [];

  const handleDelete = async () => {
    if (!selected) return;
    await deleteAdvance.mutateAsync(selected.id);
    setDeleteOpen(false);
    setSelected(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <ActionGuard permission={PERMISSIONS.ATTENDANCE_PAYROLL.GENERATE}>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("add")}
            </Button>
          </ActionGuard>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t("statusLabel")}</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-35"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tCommon("all")}</SelectItem>
                  <SelectItem value="ACTIVE">{t("statuses.ACTIVE")}</SelectItem>
                  <SelectItem value="COMPLETED">{t("statuses.COMPLETED")}</SelectItem>
                  <SelectItem value="CANCELLED">{t("statuses.CANCELLED")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {items.length > 0 && (
              <span className="text-sm text-muted-foreground">{t("count", { count: items.length })}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("cols.employee")}</TableHead>
              <TableHead>{t("cols.totalAmount")}</TableHead>
              <TableHead>{t("cols.installmentAmount")}</TableHead>
              <TableHead>{t("cols.installments")}</TableHead>
              <TableHead>{t("cols.remaining")}</TableHead>
              <TableHead>{t("cols.startDate")}</TableHead>
              <TableHead>{t("cols.status")}</TableHead>
              <TableHead className="w-12.5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="cursor-pointer hover:bg-muted/30">
                  <TableCell>
                    <p className="font-medium text-sm">
                      {item.employee
                        ? `${item.employee.firstNameAr} ${item.employee.lastNameAr}`
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.employee?.employeeNumber}</p>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{formatUSD(item.totalAmount)}</TableCell>
                  <TableCell className="font-mono text-sm">{formatUSD(item.installmentAmount)}</TableCell>
                  <TableCell className="text-sm">
                    {item.paidInstallments} / {item.totalInstallments}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatUSD(item.remainingBalance)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {tPayroll(`months.${item.startMonth}` as any)} {item.startYear}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[item.status] || "outline"}>
                      {t(`statuses.${item.status}` as any) || item.status}
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
                        <DropdownMenuItem onClick={() => router.push(`/${locale}/salary-advances/${item.id}`)}>
                          <Eye className="h-4 w-4 ml-2" />
                          {t("viewDetails")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => { setSelected(item); setDeleteOpen(true); }}
                        >
                          <Trash2 className="h-4 w-4 ml-2" />
                          {tCommon("delete")}
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

      <CreateSalaryAdvanceDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
