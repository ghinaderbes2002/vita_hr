"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
import { useEmployees, useSubordinates } from "@/lib/hooks/use-employees";
import { Label } from "@/components/ui/label";

export default function SubordinatesPage() {
  const t = useTranslations();
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: allEmployeesData } = useEmployees({ limit: 100 });
  const { data: subordinatesData, isLoading } = useSubordinates(selectedManagerId);

  const allEmployees = (allEmployeesData as any)?.items || (allEmployeesData as any)?.data?.items || [];

  const subordinates = Array.isArray(subordinatesData)
    ? subordinatesData
    : (subordinatesData as any)?.data?.items || (subordinatesData as any)?.data || [];

  const filtered = subordinates.filter((emp: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      `${emp.firstNameAr} ${emp.lastNameAr}`.toLowerCase().includes(q) ||
      emp.email?.toLowerCase().includes(q)
    );
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ACTIVE": return "default";
      case "INACTIVE": return "secondary";
      case "ON_LEAVE": return "outline";
      case "SUSPENDED": return "destructive";
      case "TERMINATED": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("employees.subordinates.title")}
        description={t("employees.subordinates.description")}
      />

      <div className="space-y-2">
        <Label>{t("employees.subordinates.selectManager")}</Label>
        <Select value={selectedManagerId} onValueChange={(v) => { setSelectedManagerId(v); setSearch(""); }}>
          <SelectTrigger className="w-full max-w-md">
            <SelectValue placeholder={t("employees.subordinates.selectManager")} />
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

      {selectedManagerId && (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("employees.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
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
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {t("common.noData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((employee: any) => (
                    <TableRow key={employee.id}>
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
                          {t(`employees.contractTypes.${employee.contractType?.toLowerCase()}`)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(employee.employmentStatus)}>
                          {t(`employees.statuses.${
                            employee.employmentStatus === "ACTIVE" ? "active" :
                            employee.employmentStatus === "INACTIVE" ? "inactive" :
                            employee.employmentStatus === "ON_LEAVE" ? "onLeave" :
                            employee.employmentStatus === "SUSPENDED" ? "suspended" : "terminated"
                          }`)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
