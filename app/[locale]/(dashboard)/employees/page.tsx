"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Link, Filter, List, Network, UserCheck, BellOff, PowerOff, Power, FileSpreadsheet, Loader2 } from "lucide-react";
import { useLocale } from "next-intl";
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
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { useEmployees, useDeleteEmployee, useEmployeesByDepartment, useUpdateEmployee, useExportEmployees } from "@/lib/hooks/use-employees";
import { useDepartments } from "@/lib/hooks/use-departments";
import { EmployeeDialog } from "@/components/features/employees/employee-dialog";
import { LinkUserDialog } from "@/components/features/employees/link-user-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Pagination } from "@/components/shared/pagination";
import { OrgTree } from "@/components/features/employees/org-tree";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";

export default function EmployeesPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [exemptFilter, setExemptFilter] = useState<"all" | "exempt" | "linked">("all");
  const [companyFilter, setCompanyFilter] = useState<"" | "VITAXIR" | "VITASYR">("");
  const [view, setView] = useState<"list" | "tree">("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [linkUserDialogOpen, setLinkUserDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const LIMIT = 10;
  const { data: allEmployeesData, isLoading: allEmployeesLoading } = useEmployees({ search, page: companyFilter ? 1 : page, limit: companyFilter ? 500 : LIMIT });
  const { data: departmentEmployees, isLoading: departmentEmployeesLoading } = useEmployeesByDepartment(selectedDepartment);
  const { data: departmentsData } = useDepartments({ limit: 500 });
  const deleteEmployee = useDeleteEmployee();
  const updateEmployee = useUpdateEmployee();
  const exportEmployees = useExportEmployees();

  const departments = (departmentsData as any)?.data?.items || [];

  const responseData = (allEmployeesData as any)?.data;
  const rawMeta = (allEmployeesData as any)?.meta || responseData?.meta;
  const total = rawMeta?.total ?? responseData?.total ?? 0;
  const totalPages = rawMeta?.totalPages ?? responseData?.totalPages ?? Math.ceil(total / LIMIT);
  const meta = total > 0 ? { total, totalPages } : null;

  // Use department-filtered employees if a department is selected, otherwise use all employees
  const isLoading = selectedDepartment ? departmentEmployeesLoading : allEmployeesLoading;
  const rawEmployees: any[] = selectedDepartment
    ? (departmentEmployees || [])
    : ((allEmployeesData as any)?.data?.items || []);

  const employees = rawEmployees.filter((e: any) => {
    const linked = e.attendanceConfig?.salaryLinked ?? true;
    if (exemptFilter === "exempt") return linked === false;
    if (exemptFilter === "linked") return linked === true;
    if (companyFilter && e.company !== companyFilter) return false;
    return true;
  });

  const handleEdit = (employee: any) => {
    setSelectedEmployee(employee);
    setDialogOpen(true);
  };

  const handleLinkUser = (employee: any) => {
    setSelectedEmployee(employee);
    setLinkUserDialogOpen(true);
  };

  const handleDelete = (employee: any) => {
    setSelectedEmployee(employee);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedEmployee) {
      await deleteEmployee.mutateAsync(selectedEmployee.id);
      setDeleteDialogOpen(false);
      setSelectedEmployee(null);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "INACTIVE":
        return "secondary";
      case "ON_LEAVE":
        return "outline";
      case "SUSPENDED":
        return "destructive";
      case "TERMINATED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("employees.title")}
        description={t("employees.description")}
        count={!isLoading && !selectedDepartment ? total : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/${locale}/employees/subordinates`)}
              className="flex items-center gap-1.5"
            >
              <UserCheck className="h-4 w-4" />
              المرؤوسين
            </Button>
            <ActionGuard permission={PERMISSIONS.EMPLOYEES.EXPORT}>
              <Button
                variant="outline"
                onClick={() => exportEmployees.mutate()}
                disabled={exportEmployees.isPending}
                className="flex items-center gap-1.5"
              >
                {exportEmployees.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                تصدير Excel
              </Button>
            </ActionGuard>
            {/* View toggle — شجرة معلقة مؤقتاً */}
            <ActionGuard permission={PERMISSIONS.EMPLOYEES.CREATE}>
              <Button onClick={() => { setSelectedEmployee(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 ml-2" />
                {t("employees.addEmployee")}
              </Button>
            </ActionGuard>
          </div>
        }
      />

      {/* List View */}
      {<>
      <div className="filter-bar">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("employees.searchPlaceholder")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pr-10 bg-background"
          />
        </div>
        <Select value={exemptFilter} onValueChange={(v) => { setExemptFilter(v as any); setPage(1); }}>
          <SelectTrigger className="w-48 bg-background">
            <BellOff className="h-4 w-4 ml-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الموظفين</SelectItem>
            <SelectItem value="exempt">المعفيون من البصمة</SelectItem>
            <SelectItem value="linked">مرتبطون بالراتب</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedDepartment || "all"} onValueChange={(v) => { setSelectedDepartment(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-56 bg-background">
            <Filter className="h-4 w-4 ml-2" />
            <SelectValue placeholder={t("employees.filterByDepartment")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("employees.allDepartments")}</SelectItem>
            {departments.map((dept: any) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.nameAr}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={companyFilter || "all"} onValueChange={(v) => { setCompanyFilter(v === "all" ? "" : v as any); setPage(1); }}>
          <SelectTrigger className="w-40 bg-background">
            <SelectValue placeholder="كل الشركات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الشركات</SelectItem>
            <SelectItem value="VITAXIR">VitaXir</SelectItem>
            <SelectItem value="VITASYR">VitaSyr</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("employees.fields.firstNameAr")}</TableHead>
              <TableHead>{t("employees.fields.lastNameAr")}</TableHead>
              <TableHead>{t("employees.fields.email")}</TableHead>
              <TableHead>{t("employees.fields.phone")}</TableHead>
              <TableHead>{t("employees.fields.department")}</TableHead>
              <TableHead>{t("employees.fields.contractType")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4" style={{ width: `${60 + (i * 13) % 40}px` }} /></TableCell>
                  <TableCell><Skeleton className="h-4" style={{ width: `${50 + (i * 17) % 40}px` }} /></TableCell>
                  <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-7 w-7 rounded-md" /></TableCell>
                </TableRow>
              ))
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <EmptyState
                    icon={<Users className="h-8 w-8 text-muted-foreground" />}
                    title={t("common.noData")}
                    description={search ? "جرب تغيير كلمة البحث" : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee: any) => (
                <TableRow
                  key={employee.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/employees/${employee.id}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {employee.firstNameAr}
                      {(employee as any).attendanceConfig?.salaryLinked === false && (
                        <span className="flex items-center gap-0.5 text-[10px] font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-1.5 py-0.5">
                          <BellOff className="h-2.5 w-2.5" />
                          معفى
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{employee.lastNameAr}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.phone || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {employee.department?.nameAr || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {t(`employees.contractTypes.${employee.contractType.toLowerCase()}`)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(employee.employmentStatus)}>
                      {t(`employees.statuses.${
                          employee.employmentStatus === "ACTIVE" ? "active" :
                          employee.employmentStatus === "INACTIVE" ? "inactive" :
                          employee.employmentStatus === "ON_LEAVE" ? "onLeave" :
                          employee.employmentStatus === "SUSPENDED" ? "suspended" : "terminated"}`)}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <ActionGuard permission={PERMISSIONS.EMPLOYEES.UPDATE}>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(employee); }}>
                            <Pencil className="h-4 w-4 ml-2" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                        </ActionGuard>
                        <ActionGuard permission={PERMISSIONS.USERS.ASSIGN_ROLES}>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleLinkUser(employee); }}>
                            <Link className="h-4 w-4 ml-2" />
                            {t("employees.linkUser")}
                          </DropdownMenuItem>
                        </ActionGuard>
                        {(employee.employmentStatus === "ACTIVE" || employee.employmentStatus === "INACTIVE") && (
                          <ActionGuard permission={PERMISSIONS.EMPLOYEES.UPDATE}>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                const next = employee.employmentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                                updateEmployee.mutate({ id: employee.id, data: { employmentStatus: next } });
                              }}
                              className={employee.employmentStatus === "ACTIVE" ? "text-amber-600" : "text-green-600"}
                            >
                              {employee.employmentStatus === "ACTIVE"
                                ? <><PowerOff className="h-4 w-4 ml-2" />إلغاء تفعيل</>
                                : <><Power className="h-4 w-4 ml-2" />تفعيل</>
                              }
                            </DropdownMenuItem>
                          </ActionGuard>
                        )}
                        <ActionGuard permission={PERMISSIONS.EMPLOYEES.DELETE}>
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); handleDelete(employee); }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 ml-2" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </ActionGuard>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!selectedDepartment && !companyFilter && meta && (
        <Pagination
          page={page}
          totalPages={meta.totalPages}
          total={meta.total}
          limit={LIMIT}
          onPageChange={setPage}
        />
      )}
      </>}

      <EmployeeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employee={selectedEmployee}
      />

      <LinkUserDialog
        open={linkUserDialogOpen}
        onOpenChange={setLinkUserDialogOpen}
        employee={selectedEmployee}
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
