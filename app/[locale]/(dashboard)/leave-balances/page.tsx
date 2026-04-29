"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, MoreHorizontal, Settings2, Trash2, Sparkles, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeaveBalances, useDeleteLeaveBalance, useInitializeEmployeeBalances } from "@/lib/hooks/use-leave-balances";
import { useEmployees } from "@/lib/hooks/use-employees";
import { BalanceDialog } from "@/components/features/leave-balances/balance-dialog";
import { AdjustDialog } from "@/components/features/leave-balances/adjust-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { LeaveBalance } from "@/lib/api/leave-balances";

export default function LeaveBalancesPage() {
  const t = useTranslations();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [search, setSearch] = useState("");
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<LeaveBalance | null>(null);
  const [initDialogOpen, setInitDialogOpen] = useState(false);
  const [initEmployeeId, setInitEmployeeId] = useState("");
  const [initYear, setInitYear] = useState(currentYear);

  const { data, isLoading } = useLeaveBalances({ year });
  const deleteBalance = useDeleteLeaveBalance();
  const initializeBalances = useInitializeEmployeeBalances();

  const { data: employeesData } = useEmployees({ limit: 500 });
  const allEmployees = (employeesData as any)?.data?.items || (employeesData as any)?.items || [];
  const empMap = new Map(allEmployees.map((e: any) => [e.id, e]));

  const balances: LeaveBalance[] = Array.isArray(data)
    ? data
    : (data as any)?.data?.items || (data as any)?.data || [];

  // Group by employee
  const grouped = balances.reduce<{ empId: string; employee: any; items: LeaveBalance[] }[]>((acc, b) => {
    const existing = acc.find((g) => g.empId === b.employeeId);
    const emp = b.employee || empMap.get(b.employeeId);
    if (existing) {
      existing.items.push(b);
    } else {
      acc.push({ empId: b.employeeId, employee: emp, items: [b] });
    }
    return acc;
  }, []);

  const filteredGroups = grouped.filter((g) => {
    if (!search) return true;
    const name = g.employee ? `${g.employee.firstNameAr || ""} ${g.employee.lastNameAr || ""}` : "";
    return name.includes(search) || g.items.some((b) => b.leaveType?.nameAr?.includes(search));
  });

  const toggleEmployee = (empId: string) => {
    setExpandedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  };

  const handleAdjust = (b: LeaveBalance) => { setSelectedBalance(b); setAdjustDialogOpen(true); };
  const handleDelete = (b: LeaveBalance) => { setSelectedBalance(b); setDeleteDialogOpen(true); };
  const confirmDelete = async () => {
    if (selectedBalance) {
      await deleteBalance.mutateAsync(selectedBalance.id);
      setDeleteDialogOpen(false);
      setSelectedBalance(null);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("leaveBalances.title")}
        description={t("leaveBalances.description")}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setInitEmployeeId(""); setInitYear(currentYear); setInitDialogOpen(true); }}>
              <Sparkles className="h-4 w-4 ml-2" />
              تهيئة أرصدة موظف
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 ml-2" />
              {t("leaveBalances.addBalance")}
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث باسم الموظف أو نوع الإجازة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الموظف / نوع الإجازة</TableHead>
              <TableHead>{t("leaveBalances.fields.totalDays")}</TableHead>
              <TableHead>{t("leaveBalances.fields.usedDays")}</TableHead>
              <TableHead>{t("leaveBalances.fields.pendingDays")}</TableHead>
              <TableHead>{t("leaveBalances.fields.remainingDays")}</TableHead>
              <TableHead>ساعات ساعية</TableHead>
              <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              filteredGroups.map((group) => {
                const isExpanded = expandedEmployees.has(group.empId);
                const empName = group.employee
                  ? `${group.employee.firstNameAr} ${group.employee.lastNameAr}`
                  : group.empId;
                const deptName = group.employee?.department?.nameAr;

                return [
                  // صف الموظف
                  <TableRow
                    key={`emp-${group.empId}`}
                    className="cursor-pointer bg-muted/40 hover:bg-muted/60 font-medium"
                    onClick={() => toggleEmployee(group.empId)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <span>{empName}</span>
                        {deptName && (
                          <span className="text-xs text-muted-foreground font-normal">— {deptName}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell colSpan={5}>
                      <Badge variant="outline" className="text-xs">{group.items.length} نوع إجازة</Badge>
                    </TableCell>
                    <TableCell />
                  </TableRow>,

                  // صفوف الأرصدة عند الفتح
                  ...(isExpanded ? group.items.map((b) => (
                    <TableRow key={b.id} className="hover:bg-muted/20">
                      <TableCell className="pr-10">
                        <Badge variant="outline" style={{ borderColor: b.leaveType?.nameAr ? undefined : undefined }}>
                          {b.leaveType?.nameAr ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>{b.totalDays}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{b.usedDays}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{b.pendingDays}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={b.remainingDays > 0 ? "default" : "destructive"}>
                          {b.remainingDays}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(b.usedHours ?? 0) > 0 || (b.pendingHours ?? 0) > 0 ? (
                          <div className="text-xs space-y-0.5">
                            {(b.usedHours ?? 0) > 0 && <div className="text-muted-foreground">مستخدمة: <span className="font-medium text-foreground">{b.usedHours}س</span></div>}
                            {(b.pendingHours ?? 0) > 0 && <div className="text-amber-600">معلقة: <span className="font-medium">{b.pendingHours}س</span></div>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleAdjust(b)}>
                              <Settings2 className="h-4 w-4 ml-2" />
                              {t("leaveBalances.adjustBalance")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(b)} className="text-destructive">
                              <Trash2 className="h-4 w-4 ml-2" />
                              {t("common.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : []),
                ];
              })
            )}
          </TableBody>
        </Table>
      </div>

      <BalanceDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <AdjustDialog
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        balance={selectedBalance}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("messages.confirmDelete")}
        description={t("messages.actionCantUndo")}
        onConfirm={confirmDelete}
        variant="destructive"
      />

      <Dialog open={initDialogOpen} onOpenChange={setInitDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>تهيئة أرصدة إجازات موظف</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>الموظف</Label>
              <Select value={initEmployeeId} onValueChange={setInitEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر موظفاً" />
                </SelectTrigger>
                <SelectContent>
                  {allEmployees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstNameAr} {emp.lastNameAr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>السنة</Label>
              <Select value={initYear.toString()} onValueChange={(v) => setInitYear(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              سيتم إنشاء أرصدة لجميع أنواع الإجازات النشطة تلقائياً. إذا كان الرصيد موجوداً مسبقاً لن يُعاد إنشاؤه.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInitDialogOpen(false)}>إلغاء</Button>
            <Button
              disabled={!initEmployeeId || initializeBalances.isPending}
              onClick={async () => {
                await initializeBalances.mutateAsync({ employeeId: initEmployeeId, year: initYear });
                setInitDialogOpen(false);
              }}
            >
              {initializeBalances.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              تهيئة الأرصدة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
