"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Link, Filter } from "lucide-react";
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
import { useEmployees, useDeleteEmployee, useEmployeesByDepartment } from "@/lib/hooks/use-employees";
import { useDepartments } from "@/lib/hooks/use-departments";
import { EmployeeDialog } from "@/components/features/employees/employee-dialog";
import { LinkUserDialog } from "@/components/features/employees/link-user-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export default function EmployeesPage() {
  const t = useTranslations();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [linkUserDialogOpen, setLinkUserDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const { data: allEmployeesData, isLoading: allEmployeesLoading } = useEmployees({ search });
  const { data: departmentEmployees, isLoading: departmentEmployeesLoading } = useEmployeesByDepartment(selectedDepartment);
  const { data: departmentsData } = useDepartments({});
  const deleteEmployee = useDeleteEmployee();

  const departments = (departmentsData as any)?.data?.items || [];

  // Use department-filtered employees if a department is selected, otherwise use all employees
  const isLoading = selectedDepartment ? departmentEmployeesLoading : allEmployeesLoading;
  const employees = selectedDepartment
    ? (departmentEmployees || [])
    : ((allEmployeesData as any)?.data?.items || []);

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
        actions={
          <Button onClick={() => { setSelectedEmployee(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 ml-2" />
            {t("employees.addEmployee")}
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("employees.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <div className="w-64">
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger>
              <Filter className="h-4 w-4 ml-2" />
              <SelectValue placeholder={t("employees.filterByDepartment")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">{t("employees.allDepartments")}</SelectItem>
              {departments.map((dept: any) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.nameAr}
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
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                </TableRow>
              ))
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee: any) => (
                <TableRow
                  key={employee.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/employees/${employee.id}`)}
                >
                  <TableCell className="font-medium">{employee.firstNameAr}</TableCell>
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
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(employee); }}>
                          <Pencil className="h-4 w-4 ml-2" />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleLinkUser(employee); }}>
                          <Link className="h-4 w-4 ml-2" />
                          {t("employees.linkUser")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); handleDelete(employee); }}
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
