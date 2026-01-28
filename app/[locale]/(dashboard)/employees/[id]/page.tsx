"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, Mail, Phone, Building2, Calendar, User, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmployee } from "@/lib/hooks/use-employees";
import { PageHeader } from "@/components/shared/page-header";

export default function EmployeeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations();
  const employeeId = params.id as string;

  const { data: employee, isLoading } = useEmployee(employeeId);

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("common.noData")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          {t("common.back")}
        </Button>
      </div>

      <PageHeader
        title={`${employee.firstNameAr} ${employee.lastNameAr}`}
        description={employee.email}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("employees.tabs.personal")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("employees.fields.firstNameAr")}</p>
              <p className="font-medium">{employee.firstNameAr}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("employees.fields.lastNameAr")}</p>
              <p className="font-medium">{employee.lastNameAr}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("employees.fields.firstNameEn")}</p>
              <p className="font-medium">{employee.firstNameEn}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("employees.fields.lastNameEn")}</p>
              <p className="font-medium">{employee.lastNameEn}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("employees.fields.nationalId")}</p>
              <p className="font-medium">{employee.nationalId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("employees.fields.gender")}</p>
              <p className="font-medium">
                {t(`employees.genders.${employee.gender.toLowerCase()}`)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("employees.fields.dateOfBirth")}</p>
              <p className="font-medium">
                {new Date(employee.dateOfBirth).toLocaleDateString('ar-EG')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t("employees.tabs.contact")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("employees.fields.email")}</p>
              <p className="font-medium">{employee.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("employees.fields.phone")}</p>
              <p className="font-medium">{employee.phone || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("employees.fields.mobile")}</p>
              <p className="font-medium">{employee.mobile || "-"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              {t("employees.tabs.employment")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("employees.fields.department")}</p>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <p className="font-medium">{employee.department?.nameAr || "-"}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("employees.fields.hireDate")}</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <p className="font-medium">
                  {new Date(employee.hireDate).toLocaleDateString('ar-EG')}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("employees.fields.contractType")}</p>
              <p className="font-medium">
                {t(`employees.contractTypes.${employee.contractType.toLowerCase()}`)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("common.status")}</p>
              <Badge variant={getStatusBadgeVariant(employee.employmentStatus)}>
                {t(`employees.statuses.${
                  employee.employmentStatus === "ACTIVE" ? "active" :
                  employee.employmentStatus === "INACTIVE" ? "inactive" :
                  employee.employmentStatus === "ON_LEAVE" ? "onLeave" : "terminated"
                }`)}
              </Badge>
            </div>
            {employee.manager && (
              <div>
                <p className="text-sm text-muted-foreground">{t("employees.fields.manager")}</p>
                <p className="font-medium">
                  {employee.manager.firstNameAr} {employee.manager.lastNameAr}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t("employees.additionalInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {employee.userId && (
              <div>
                <p className="text-sm text-muted-foreground">{t("employees.linkedUser")}</p>
                <Badge variant="outline">{t("common.yes")}</Badge>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">{t("employees.createdAt")}</p>
              <p className="font-medium">
                {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString('ar-EG') : "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("employees.updatedAt")}</p>
              <p className="font-medium">
                {employee.updatedAt ? new Date(employee.updatedAt).toLocaleDateString('ar-EG') : "-"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
