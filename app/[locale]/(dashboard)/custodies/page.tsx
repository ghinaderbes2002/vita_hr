"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCustodies, useDeleteCustody } from "@/lib/hooks/use-custodies";
import { EmptyState } from "@/components/shared/empty-state";
import { CustodyDialog } from "@/components/features/custodies/custody-dialog";
import { ReturnCustodyDialog } from "@/components/features/custodies/return-custody-dialog";
import { Custody, CustodyStatus } from "@/types";

const STATUS_VARIANTS: Record<CustodyStatus, "default" | "secondary" | "destructive" | "outline"> = {
  WITH_EMPLOYEE: "default",
  RETURNED: "secondary",
  DAMAGED: "destructive",
  LOST: "destructive",
};

export default function CustodiesPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Custody | null>(null);

  const { data, isLoading } = useCustodies({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    limit: 50,
  });

  const deleteCustody = useDeleteCustody();

  const custodies: Custody[] =
    (data as any)?.data?.data ||
    (data as any)?.data ||
    (Array.isArray(data) ? data : []);

  // Group custodies by employee
  const grouped = custodies.reduce<{ empKey: string; employee: any; items: Custody[] }[]>((acc, c) => {
    const empKey = (c as any).employeeId || "unknown";
    const existing = acc.find((g) => g.empKey === empKey);
    if (existing) {
      existing.items.push(c);
    } else {
      acc.push({ empKey, employee: (c as any).employee, items: [c] });
    }
    return acc;
  }, []);

  const toggleEmployee = (empKey: string) => {
    setExpandedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(empKey)) next.delete(empKey);
      else next.add(empKey);
      return next;
    });
  };

  const handleEdit = (c: Custody) => { setSelected(c); setDialogOpen(true); };
  const handleReturn = (c: Custody) => { setSelected(c); setReturnDialogOpen(true); };
  const handleDelete = (c: Custody) => { setSelected(c); setDeleteDialogOpen(true); };

  const confirmDelete = async () => {
    if (selected) {
      await deleteCustody.mutateAsync(selected.id);
      setDeleteDialogOpen(false);
      setSelected(null);
    }
  };

  const CATEGORIES = ["ELECTRONICS", "FURNITURE", "VEHICLE", "TOOLS", "KEYS", "UNIFORM", "OTHER"];
  const STATUSES: CustodyStatus[] = ["WITH_EMPLOYEE", "RETURNED", "DAMAGED", "LOST"];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("custodies.title")}
        description={t("custodies.description")}
        count={!isLoading ? custodies.length : undefined}
        actions={
          <Button onClick={() => { setSelected(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 ml-2" />
            {t("custodies.addCustody")}
          </Button>
        }
      />

      <div className="filter-bar">
        <div className="relative flex-1 min-w-50 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("custodies.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 bg-background"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{t(`custodies.statuses.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{t(`custodies.categories.${c}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("custodies.fields.name")}</TableHead>
              <TableHead>{t("custodies.fields.category")}</TableHead>
              <TableHead>{t("custodies.fields.serialNumber")}</TableHead>
              <TableHead>{t("custodies.fields.custodyCount")}</TableHead>
              <TableHead>{t("custodies.fields.assignedDate")}</TableHead>
              <TableHead>{t("custodies.fields.status")}</TableHead>
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
            ) : custodies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    title={t("common.noData")}
                    description={search || statusFilter !== "all" || categoryFilter !== "all" ? "جرب تغيير الفلاتر" : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              grouped.map((group) => {
                const isExpanded = expandedEmployees.has(group.empKey);
                const empName = group.employee
                  ? `${group.employee.firstNameAr} ${group.employee.lastNameAr}`
                  : "—";
                const deptName = group.employee?.department?.nameAr;
                return [
                  // Employee header row
                  <TableRow
                    key={`group-${group.empKey}`}
                    className="cursor-pointer bg-muted/40 hover:bg-muted/60"
                    onClick={() => toggleEmployee(group.empKey)}
                  >
                    <TableCell colSpan={3}>
                      <div className="flex items-center gap-2 font-medium">
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                        {empName}
                        {deptName && <span className="text-xs text-muted-foreground font-normal">— {deptName}</span>}
                      </div>
                    </TableCell>
                    <TableCell colSpan={4}>
                      <Badge variant="outline" className="text-xs">{group.items.length} عهدة</Badge>
                    </TableCell>
                  </TableRow>,
                  // Custody rows (shown when expanded)
                  ...(isExpanded ? group.items.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/30" onClick={() => router.push(`/${locale}/custodies/${c.id}`)}>
                      <TableCell className="pr-8">
                        <div>
                          <p className="font-medium">{c.name}</p>
                          {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{t(`custodies.categories.${c.category}`)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.serialNumber || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{group.items.length} عهدة</Badge>
                      </TableCell>
                      <TableCell>{c.assignedDate ? format(new Date(c.assignedDate), "yyyy/MM/dd") : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[c.status]}>{t(`custodies.statuses.${c.status}`)}</Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(c)}>
                              <Pencil className="h-4 w-4 ml-2" />{t("common.edit")}
                            </DropdownMenuItem>
                            {c.status === "WITH_EMPLOYEE" && (
                              <DropdownMenuItem onClick={() => handleReturn(c)}>
                                <RotateCcw className="h-4 w-4 ml-2" />{t("custodies.returnCustody")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDelete(c)} className="text-destructive">
                              <Trash2 className="h-4 w-4 ml-2" />{t("common.delete")}
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

      <CustodyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        custody={selected || undefined}
      />

      <ReturnCustodyDialog
        open={returnDialogOpen}
        onOpenChange={setReturnDialogOpen}
        custody={selected}
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
