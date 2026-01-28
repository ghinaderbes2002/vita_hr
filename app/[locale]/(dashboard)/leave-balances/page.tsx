"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, MoreHorizontal, Settings2, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyLeaveBalances, useDeleteLeaveBalance } from "@/lib/hooks/use-leave-balances";
import { BalanceDialog } from "@/components/features/leave-balances/balance-dialog";
import { AdjustDialog } from "@/components/features/leave-balances/adjust-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { LeaveBalance } from "@/lib/api/leave-balances";

export default function LeaveBalancesPage() {
  const t = useTranslations();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<LeaveBalance | null>(null);

  const { data, isLoading } = useMyLeaveBalances(year);
  const deleteBalance = useDeleteLeaveBalance();

  // Handle different API response formats
  const balances = Array.isArray(data)
    ? data
    : (data as any)?.data?.items || (data as any)?.data || [];

  const filteredBalances = balances.filter((balance: LeaveBalance) => {
    const employeeName = `${balance.employee?.firstNameAr || ""} ${balance.employee?.lastNameAr || ""}`;
    const leaveTypeName = balance.leaveType?.nameAr || "";
    return (
      employeeName.toLowerCase().includes(search.toLowerCase()) ||
      leaveTypeName.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleAdjust = (balance: LeaveBalance) => {
    setSelectedBalance(balance);
    setAdjustDialogOpen(true);
  };

  const handleDelete = (balance: LeaveBalance) => {
    setSelectedBalance(balance);
    setDeleteDialogOpen(true);
  };

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
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            {t("leaveBalances.addBalance")}
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("leaveBalances.searchPlaceholder")}
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
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("leaveBalances.fields.employee")}</TableHead>
              <TableHead>{t("leaveBalances.fields.leaveType")}</TableHead>
              <TableHead>{t("leaveBalances.fields.year")}</TableHead>
              <TableHead>{t("leaveBalances.fields.totalDays")}</TableHead>
              <TableHead>{t("leaveBalances.fields.usedDays")}</TableHead>
              <TableHead>{t("leaveBalances.fields.pendingDays")}</TableHead>
              <TableHead>{t("leaveBalances.fields.remainingDays")}</TableHead>
              <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                </TableRow>
              ))
            ) : filteredBalances.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              filteredBalances.map((balance: LeaveBalance) => (
                <TableRow key={balance.id}>
                  <TableCell className="font-medium">
                    {balance.employee?.firstNameAr} {balance.employee?.lastNameAr}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {balance.leaveType?.nameAr}
                    </Badge>
                  </TableCell>
                  <TableCell>{balance.year}</TableCell>
                  <TableCell>{balance.totalDays}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{balance.usedDays}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{balance.pendingDays}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={balance.remainingDays > 0 ? "default" : "destructive"}>
                      {balance.remainingDays}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleAdjust(balance)}>
                          <Settings2 className="h-4 w-4 ml-2" />
                          {t("leaveBalances.adjustBalance")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(balance)}
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
    </div>
  );
}
