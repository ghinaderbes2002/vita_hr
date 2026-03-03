"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowRight, Mail, Phone, Building2, Calendar, User, Briefcase,
  Paperclip, Heart, GraduationCap, MapPin, Users, FileDown,
  BadgeCheck, Cigarette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useEmployee } from "@/lib/hooks/use-employees";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  INACTIVE: "bg-gray-100 text-gray-700 border-gray-200",
  ON_LEAVE: "bg-blue-100 text-blue-800 border-blue-200",
  SUSPENDED: "bg-amber-100 text-amber-800 border-amber-200",
  TERMINATED: "bg-red-100 text-red-800 border-red-200",
};

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start justify-between py-2">
      <span className="text-sm text-muted-foreground shrink-0 w-40">{label}</span>
      <span className="text-sm font-medium text-end flex-1">{value}</span>
    </div>
  );
}

export default function EmployeeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations();
  const employeeId = params.id as string;

  const { data: employee, isLoading } = useEmployee(employeeId);
  const emp = employee as any;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56" />)}
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

  const statusLabel = {
    ACTIVE: t("employees.statuses.active"),
    INACTIVE: t("employees.statuses.inactive"),
    ON_LEAVE: t("employees.statuses.onLeave"),
    SUSPENDED: t("employees.statuses.suspended"),
    TERMINATED: t("employees.statuses.terminated"),
  }[employee.employmentStatus] || employee.employmentStatus;

  const bloodTypeLabel = emp.bloodType
    ? t(`employees.bloodTypes.${emp.bloodType}`)
    : null;

  const educationLabel = emp.educationLevel
    ? t(`employees.educationLevels.${emp.educationLevel}`)
    : null;

  const attachments: { id: string; fileUrl: string; fileName: string; createdAt: string }[] =
    emp.attachments || [];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowRight className="h-4 w-4" />
        {t("common.back")}
      </Button>

      {/* ─── Hero Card ─────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-linear-to-l from-primary/20 to-primary/5" />
        <CardContent className="relative pt-0 pb-6 px-6">
          {/* Avatar */}
          <div className="absolute -top-12 start-6">
            <div className="w-24 h-24 rounded-full border-4 border-background overflow-hidden bg-muted shadow-md">
              {emp.profilePhoto ? (
                <img src={emp.profilePhoto} alt="profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-3xl font-bold">
                  {employee.firstNameAr?.[0]}
                </div>
              )}
            </div>
          </div>

          {/* Name & meta */}
          <div className="mt-14 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">
                {employee.firstNameAr} {employee.lastNameAr}
              </h1>
              <p className="text-muted-foreground">
                {employee.firstNameEn} {employee.lastNameEn}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {emp.jobTitle && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" />
                    {emp.jobTitle.nameAr}
                  </span>
                )}
                {employee.department && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {(employee.department as any).nameAr}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                {employee.employeeNumber}
              </span>
              <span className={`text-xs font-medium px-3 py-1 rounded-full border ${STATUS_COLORS[employee.employmentStatus] || ""}`}>
                {statusLabel}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

        {/* ─── Personal Info ──────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              {t("employees.tabs.personal")}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/50">
            <InfoRow label={t("employees.fields.firstNameAr")} value={employee.firstNameAr} />
            <InfoRow label={t("employees.fields.lastNameAr")} value={employee.lastNameAr} />
            <InfoRow label={t("employees.fields.firstNameEn")} value={employee.firstNameEn} />
            <InfoRow label={t("employees.fields.lastNameEn")} value={employee.lastNameEn} />
            <InfoRow label={t("employees.fields.nationalId")} value={employee.nationalId} />
            <InfoRow label={t("employees.fields.gender")} value={t(`employees.genders.${employee.gender.toLowerCase()}`)} />
            <InfoRow
              label={t("employees.fields.dateOfBirth")}
              value={employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString("ar-EG") : undefined}
            />
          </CardContent>
        </Card>

        {/* ─── Contact Info ──────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              {t("employees.tabs.contact")}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/50">
            <InfoRow label={t("employees.fields.email")} value={employee.email} />
            <InfoRow label={t("employees.fields.phone")} value={employee.phone} />
            <InfoRow label={t("employees.fields.mobile")} value={employee.mobile} />
            {emp.currentAddress && (
              <div className="flex items-start justify-between py-2">
                <span className="text-sm text-muted-foreground shrink-0 w-40">{t("employees.fields.currentAddress")}</span>
                <span className="text-sm font-medium text-end flex-1 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {emp.currentAddress}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Employment Info ───────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              {t("employees.tabs.employment")}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/50">
            <InfoRow label={t("employees.fields.department")} value={(employee.department as any)?.nameAr} />
            <InfoRow label={t("employees.fields.jobTitle")} value={emp.jobTitle?.nameAr} />
            <InfoRow label={t("employees.fields.jobGrade")} value={emp.jobGrade?.nameAr} />
            <InfoRow
              label={t("employees.fields.hireDate")}
              value={employee.hireDate ? new Date(employee.hireDate).toLocaleDateString("ar-EG") : undefined}
            />
            <InfoRow label={t("employees.fields.contractType")} value={t(`employees.contractTypes.${employee.contractType.toLowerCase()}`)} />
            <InfoRow label={t("employees.fields.basicSalary")} value={emp.basicSalary ? Number(emp.basicSalary).toLocaleString() : undefined} />
            {employee.manager && (
              <InfoRow
                label={t("employees.fields.manager")}
                value={`${(employee.manager as any).firstNameAr} ${(employee.manager as any).lastNameAr}`}
              />
            )}
          </CardContent>
        </Card>

        {/* ─── Additional Info ───────────────────────────────── */}
        {(bloodTypeLabel || educationLabel || emp.religion || emp.familyMembersCount || emp.chronicDiseases || emp.isSmoker !== undefined) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" />
                {t("employees.additionalInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border/50">
              {bloodTypeLabel && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">{t("employees.fields.bloodType")}</span>
                  <Badge variant="outline" className="font-bold text-red-600 border-red-200">{bloodTypeLabel}</Badge>
                </div>
              )}
              <InfoRow label={t("employees.fields.educationLevel")} value={educationLabel} />
              {emp.educationLevel === "UNIVERSITY" && emp.universityYear && (
                <InfoRow label={t("employees.fields.universityYear")} value={emp.universityYear} />
              )}
              <InfoRow label={t("employees.fields.religion")} value={emp.religion} />
              {emp.familyMembersCount !== undefined && emp.familyMembersCount !== null && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">{t("employees.fields.familyMembersCount")}</span>
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {emp.familyMembersCount}
                  </span>
                </div>
              )}
              {emp.isSmoker !== undefined && emp.isSmoker !== null && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">{t("employees.fields.isSmoker")}</span>
                  <span className={`text-sm font-medium flex items-center gap-1 ${emp.isSmoker ? "text-amber-600" : "text-green-600"}`}>
                    {emp.isSmoker && <Cigarette className="h-3.5 w-3.5" />}
                    {emp.isSmoker ? t("common.yes") : t("common.no")}
                  </span>
                </div>
              )}
              {emp.chronicDiseases && (
                <div className="py-2">
                  <span className="text-sm text-muted-foreground block mb-1">{t("employees.fields.chronicDiseases")}</span>
                  <span className="text-sm font-medium">{emp.chronicDiseases}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── Attachments ───────────────────────────────────── */}
        {attachments.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-primary" />
                {t("employees.tabs.documents")}
                <Badge variant="secondary" className="mr-auto">{attachments.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors group"
                  >
                    <FileDown className="h-5 w-5 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{att.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(att.createdAt).toLocaleDateString("ar-EG")}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── System Info ───────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-primary" />
              {t("employees.linkedUser")}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border/50">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">{t("employees.linkedUser")}</span>
              {employee.userId ? (
                <Badge variant="default" className="bg-green-600">{t("common.yes")}</Badge>
              ) : (
                <Badge variant="outline">{t("common.no")}</Badge>
              )}
            </div>
            <InfoRow
              label={t("employees.createdAt")}
              value={employee.createdAt ? new Date(employee.createdAt).toLocaleDateString("ar-EG") : undefined}
            />
            <InfoRow
              label={t("employees.updatedAt")}
              value={employee.updatedAt ? new Date(employee.updatedAt).toLocaleDateString("ar-EG") : undefined}
            />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
