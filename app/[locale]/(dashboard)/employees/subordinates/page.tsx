"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmployeesByDepartment } from "@/lib/hooks/use-employees";
import { useDepartments } from "@/lib/hooks/use-departments";
import { Label } from "@/components/ui/label";

export default function DepartmentEmployeesPage() {
  const t = useTranslations();
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");

  const { data: departmentsData } = useDepartments();
  const { data: employees, isLoading } = useEmployeesByDepartment(selectedDepartment);

  const departments = Array.isArray(departmentsData)
    ? departmentsData
    : (departmentsData as any)?.data?.items || (departmentsData as any)?.data || [];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "INACTIVE":
        return "secondary";
      case "ON_LEAVE":
        return "outline";
      case "TERMINATED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="موظفو القسم"
        description="عرض الموظفين حسب القسم"
      />

      <div className="space-y-2">
        <Label>اختر القسم</Label>
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="w-full max-w-md">
            <SelectValue placeholder="اختر القسم" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((department: any) => (
              <SelectItem key={department.id} value={department.id}>
                {department.nameAr} {department.employeeCount ? `(${department.employeeCount})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedDepartment && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("employees.fields.firstNameAr")}</TableHead>
                <TableHead>{t("employees.fields.lastNameAr")}</TableHead>
                <TableHead>{t("employees.fields.email")}</TableHead>
                <TableHead>{t("employees.fields.phone")}</TableHead>
                <TableHead>{t("employees.fields.jobTitle")}</TableHead>
                <TableHead>{t("employees.fields.contractType")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
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
                  </TableRow>
                ))
              ) : !employees || employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    لا يوجد موظفين في هذا القسم
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee: any) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.firstNameAr}</TableCell>
                    <TableCell>{employee.lastNameAr}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>{employee.phone || "-"}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {employee.jobTitle || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {t(`employees.contractTypes.${employee.contractType.toLowerCase()}`)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(employee.employmentStatus)}>
                        {t(`employees.statuses.${employee.employmentStatus === "ACTIVE" ? "active" :
                            employee.employmentStatus === "INACTIVE" ? "inactive" :
                            employee.employmentStatus === "ON_LEAVE" ? "onLeave" : "terminated"}`)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
