"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowRight, Mail, Building2, User, Briefcase,
  Paperclip, Heart, GraduationCap, MapPin, Users, FileDown,
  BadgeCheck, Cigarette, Award, ExternalLink,
  Fingerprint, Plus, Trash2, Settings, Save, ClipboardList, Pencil, X,
  Clock, CalendarDays, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { PROBATION_RECOMMENDATION_OPTIONS } from "@/lib/api/probation-evaluations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TrainingCertificate, EmployeeAllowance } from "@/types";
import { useEmployee, useUpdateEmployee, useManagerNotes, useUpdateManagerNotes } from "@/lib/hooks/use-employees";
import { assetUrl } from "@/lib/utils";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useEmployeeFingerprints, useRegisterFingerprint, useDeleteFingerprint } from "@/lib/hooks/use-employee-fingerprints";
import { useBiometricDevices } from "@/lib/hooks/use-biometric-devices";
import { useEmployeeAttendanceConfig, useUpsertAttendanceConfig } from "@/lib/hooks/use-employee-attendance-config";
import { EmployeeFingerprint } from "@/lib/api/employee-fingerprints";
import { BiometricDevice } from "@/lib/api/biometric-devices";
import { useEmployeeWorkflows, useOnboardingTemplates, useCreateOnboardingWorkflow } from "@/lib/hooks/use-onboarding";
import { useEmployeeSchedules, useWorkSchedules, useAssignSchedule, useUpdateEmployeeSchedule, useDeleteEmployeeSchedule } from "@/lib/hooks/use-work-schedules";
import { EmployeeSchedule } from "@/lib/api/work-schedules";
import { Progress } from "@/components/ui/progress";

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
  const updateEmployee = useUpdateEmployee();
  const { hasPermission } = usePermissions();
  const canReadNotes = hasPermission("employees:manager-notes:read");
  const canWriteNotes = hasPermission("employees:manager-notes:write");

  // Evaluation edit state
  const [evalEditField, setEvalEditField] = useState<"interviewEvaluation" | "exitInterviewEvaluation" | null>(null);
  const [evalEditValue, setEvalEditValue] = useState("");

  function openEvalEdit(field: "interviewEvaluation" | "exitInterviewEvaluation") {
    setEvalEditField(field);
    setEvalEditValue(emp?.[field] || "");
  }

  function saveEvalEdit() {
    if (!evalEditField) return;
    updateEmployee.mutate(
      { id: employeeId, data: { [evalEditField]: evalEditValue || null } },
      { onSuccess: () => setEvalEditField(null) }
    );
  }

  // Manager notes
  const { data: managerNotesData } = useManagerNotes(employeeId, canReadNotes);
  const updateManagerNotes = useUpdateManagerNotes();
  const [notesEditing, setNotesEditing] = useState(false);
  const [notesValue, setNotesValue] = useState("");

  function openNotesEdit() {
    setNotesValue((managerNotesData as any)?.managerNotes || "");
    setNotesEditing(true);
  }

  function saveNotes() {
    updateManagerNotes.mutate(
      { employeeId, notes: notesValue },
      { onSuccess: () => setNotesEditing(false) }
    );
  }

  // Attendance config
  const { data: attendanceConfig } = useEmployeeAttendanceConfig(employeeId);
  const upsertConfig = useUpsertAttendanceConfig();
  const [configForm, setConfigForm] = useState<{ salaryLinked: boolean; allowedBreakMinutes: number } | null>(null);
  const config = attendanceConfig as any;

  function getConfigForm() {
    return configForm ?? {
      salaryLinked: config?.salaryLinked ?? true,
      allowedBreakMinutes: config?.allowedBreakMinutes ?? 60,
    };
  }

  function handleSaveConfig() {
    const f = getConfigForm();
    upsertConfig.mutate({ employeeId, salaryLinked: f.salaryLinked, allowedBreakMinutes: f.allowedBreakMinutes });
    setConfigForm(null);
  }

  // Fingerprint state
  const [fpDialogOpen, setFpDialogOpen] = useState(false);
  const [fpDeleteOpen, setFpDeleteOpen] = useState(false);
  const [selectedFp, setSelectedFp] = useState<EmployeeFingerprint | null>(null);
  const [fpForm, setFpForm] = useState({ deviceId: "", pin: "" });

  const { data: fingerprints } = useEmployeeFingerprints(employeeId);
  const { data: devicesData } = useBiometricDevices();
  const registerFingerprint = useRegisterFingerprint();
  const deleteFingerprint = useDeleteFingerprint();

  const fpList: EmployeeFingerprint[] = (fingerprints as any) || [];
  const deviceList: BiometricDevice[] = (devicesData as any) || [];

  // Contract end date inline edit
  const [contractEditOpen, setContractEditOpen] = useState(false);
  const [contractEditValue, setContractEditValue] = useState("");

  function openContractEdit() {
    setContractEditValue(emp?.contractEndDate ? new Date(emp.contractEndDate).toISOString().split("T")[0] : "");
    setContractEditOpen(true);
  }

  function saveContractEdit() {
    updateEmployee.mutate(
      { id: employeeId, data: { contractEndDate: contractEditValue || null } },
      { onSuccess: () => setContractEditOpen(false) }
    );
  }

  // Employee schedules
  const { data: empSchedules } = useEmployeeSchedules(employeeId);
  const { data: workSchedulesData } = useWorkSchedules();
  const assignSchedule = useAssignSchedule();
  const updateEmpSchedule = useUpdateEmployeeSchedule();
  const deleteEmpSchedule = useDeleteEmployeeSchedule();

  const scheduleList: EmployeeSchedule[] = Array.isArray(empSchedules) ? empSchedules : [];
  const allSchedules: any[] = (workSchedulesData as any)?.data || (workSchedulesData as any) || [];

  const [schedDialogOpen, setSchedDialogOpen] = useState(false);
  const [schedEditTarget, setSchedEditTarget] = useState<EmployeeSchedule | null>(null);
  const [schedDeleteTarget, setSchedDeleteTarget] = useState<EmployeeSchedule | null>(null);
  const [schedDeleteOpen, setSchedDeleteOpen] = useState(false);
  const [schedForm, setSchedForm] = useState({ scheduleId: "", effectiveFrom: "", effectiveTo: "" });

  function openAssignDialog() {
    setSchedEditTarget(null);
    setSchedForm({ scheduleId: "", effectiveFrom: "", effectiveTo: "" });
    setSchedDialogOpen(true);
  }

  function openEditScheduleDialog(es: EmployeeSchedule) {
    setSchedEditTarget(es);
    setSchedForm({ scheduleId: es.scheduleId, effectiveFrom: "", effectiveTo: "" });
    setSchedDialogOpen(true);
  }

  const schedEffectiveFromIsToday = (() => {
    const today = new Date().toISOString().split("T")[0];
    return today === today; // always today since we set it automatically
  })();

  function handleSaveSchedule() {
    if (!schedForm.scheduleId) return;
    const today = new Date().toISOString().split("T")[0];
    const dto = { scheduleId: schedForm.scheduleId, effectiveFrom: today, effectiveTo: null };
    if (schedEditTarget) {
      updateEmpSchedule.mutate(
        { id: schedEditTarget.id, dto },
        { onSuccess: () => setSchedDialogOpen(false) }
      );
    } else {
      assignSchedule.mutate(
        { employeeId, ...dto },
        { onSuccess: () => setSchedDialogOpen(false) }
      );
    }
  }

  function handleDeleteSchedule() {
    if (!schedDeleteTarget) return;
    deleteEmpSchedule.mutate(schedDeleteTarget.id, { onSuccess: () => setSchedDeleteOpen(false) });
  }

  // Onboarding
  const { data: employeeWorkflows } = useEmployeeWorkflows(employeeId);
  const { data: onboardingTemplates } = useOnboardingTemplates();
  const createWorkflow = useCreateOnboardingWorkflow();
  const [wfDialogOpen, setWfDialogOpen] = useState(false);
  const [wfForm, setWfForm] = useState({ templateId: "", type: "ONBOARDING" as "ONBOARDING" | "OFFBOARDING", startDate: "", targetDate: "" });
  const wfList: any[] = (employeeWorkflows as any) || [];
  const templateList: any[] = (onboardingTemplates as any) || [];

  function handleCreateWorkflow() {
    if (!wfForm.templateId || !wfForm.startDate) return;
    createWorkflow.mutate(
      { employeeId, templateId: wfForm.templateId, type: wfForm.type, startDate: wfForm.startDate, targetDate: wfForm.targetDate || undefined },
      { onSuccess: () => { setWfDialogOpen(false); setWfForm({ templateId: "", type: "ONBOARDING", startDate: "", targetDate: "" }); } }
    );
  }

  function handleRegisterFingerprint() {
    if (!fpForm.deviceId || !fpForm.pin.trim()) return;
    registerFingerprint.mutate(
      { employeeId, deviceId: fpForm.deviceId, pin: fpForm.pin },
      { onSuccess: () => { setFpDialogOpen(false); setFpForm({ deviceId: "", pin: "" }); } }
    );
  }

  function handleDeleteFingerprint() {
    if (!selectedFp) return;
    deleteFingerprint.mutate(
      { id: selectedFp.id, employeeId },
      { onSuccess: () => setFpDeleteOpen(false) }
    );
  }

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
    Array.isArray(emp.attachments) ? emp.attachments : emp.attachments?.items || emp.attachments?.data || [];

  const trainingCertificates: TrainingCertificate[] = Array.isArray(emp.trainingCertificates)
    ? emp.trainingCertificates
    : emp.trainingCertificates?.items || emp.trainingCertificates?.data || [];

  const allowances: EmployeeAllowance[] = Array.isArray(emp.allowances)
    ? emp.allowances
    : emp.allowances?.items || emp.allowances?.data || [];

  const CONTRACT_TYPE_LABELS: Record<string, string> = {
    FIXED_TERM: "عقد محدد المدة",
    INDEFINITE: "عقد غير محدد المدة",
    TEMPORARY: "مؤقت",
    TRAINEE: "متدرب",
    PERMANENT: "دائم",
    CONTRACT: "عقد",
    INTERN: "متدرب",
  };

  const ALLOWANCE_TYPE_LABELS: Record<string, string> = {
    FOOD: "بدل غذاء",
    PREVIOUS_EXPERIENCE: "بدل خبرة سابقة",
    ACADEMIC_DEGREE: "بدل شهادة علمية",
    WORK_NATURE: "بدل طبيعة عمل",
    RESPONSIBILITY: "بدل مسؤولية",
    RESIDENCE: "بدل سكن",
  };

  const MARITAL_STATUS_LABELS: Record<string, string> = {
    SINGLE: "أعزب",
    MARRIED: "متزوج",
    DIVORCED: "مطلق",
    WIDOWED: "أرمل",
  };

  return (
    <div className="space-y-6">
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
                <img src={assetUrl(emp.profilePhoto)} alt="profile" className="w-full h-full object-cover" />
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
              value={employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString("en-GB") : undefined}
            />
            {emp.maritalStatus && (
              <InfoRow label="الحالة الاجتماعية" value={MARITAL_STATUS_LABELS[emp.maritalStatus] || emp.maritalStatus} />
            )}
            {emp.hasDrivingLicense !== undefined && (
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">رخصة قيادة</span>
                <Badge variant={emp.hasDrivingLicense ? "default" : "secondary"}>
                  {emp.hasDrivingLicense ? "يمتلك" : "لا يمتلك"}
                </Badge>
              </div>
            )}
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
              value={employee.hireDate ? new Date(employee.hireDate).toLocaleDateString("en-GB") : undefined}
            />
            <InfoRow label={t("employees.fields.contractType")} value={CONTRACT_TYPE_LABELS[employee.contractType] || employee.contractType} />
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground shrink-0 w-40">تاريخ انتهاء العقد</span>
              <div className="flex items-center gap-1.5">
                {emp.contractEndDate ? (
                  <span className={`text-sm font-medium ${new Date(emp.contractEndDate) < new Date() ? "text-destructive" : ""}`}>
                    {new Date(emp.contractEndDate).toLocaleDateString("en-GB")}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground italic">دائم</span>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={openContractEdit}>
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <InfoRow label={t("employees.fields.basicSalary")} value={emp.basicSalary ? `$${Number(emp.basicSalary).toLocaleString("en-US")}` : undefined} />
            {employee.manager && (
              <InfoRow
                label={t("employees.fields.manager")}
                value={`${(employee.manager as any).firstNameAr} ${(employee.manager as any).lastNameAr}`}
              />
            )}
            {allowances.length > 0 && (
              <div className="pt-2">
                <span className="text-sm text-muted-foreground block mb-2">البدلات</span>
                <div className="space-y-1">
                  {allowances.map((al, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{ALLOWANCE_TYPE_LABELS[al.type] || al.type}</span>
                      <span className="font-medium">${Number(al.amount).toLocaleString("en-US")}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm border-t pt-1 mt-1">
                    <span className="text-muted-foreground">مجموع البدلات</span>
                    <span className="font-medium">
                      ${allowances.reduce((s, a) => s + Number(a.amount), 0).toLocaleString("en-US")}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {emp.basicSalary && (
              <div className="flex items-center justify-between text-sm border-t pt-2 mt-1">
                <span className="font-semibold">الراتب الإجمالي</span>
                <span className="font-bold text-primary">
                  ${(Number(emp.basicSalary) + allowances.reduce((s, a) => s + Number(a.amount), 0)).toLocaleString("en-US")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Probation Result ──────────────────────────────── */}
        {emp.probationResult && (
          <Card className="border-green-200 bg-green-50/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                نتيجة تقييم التجربة
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border/50">
              <div className="flex items-start justify-between py-2">
                <span className="text-sm text-muted-foreground shrink-0 w-40">نتيجة التقييم</span>
                <span className="text-sm font-semibold text-end flex-1">
                  {PROBATION_RECOMMENDATION_OPTIONS.find(o => o.value === emp.probationResult)?.labelAr || emp.probationResult}
                </span>
              </div>
              {emp.probationCompletedAt && (
                <div className="flex items-start justify-between py-2">
                  <span className="text-sm text-muted-foreground shrink-0 w-40">تاريخ الإغلاق</span>
                  <span className="text-sm font-medium text-end flex-1">
                    {new Date(emp.probationCompletedAt).toLocaleDateString("en-GB")}
                  </span>
                </div>
              )}
              <div className="flex items-start justify-between py-2">
                <span className="text-sm text-muted-foreground shrink-0 w-40">حالة التوظيف</span>
                <span className={`text-sm font-semibold text-end flex-1 ${
                  employee.employmentStatus === "ACTIVE" ? "text-green-700" :
                  employee.employmentStatus === "TERMINATED" ? "text-destructive" : ""
                }`}>
                  {statusLabel}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* ─── Qualifications ────────────────────────────────── */}
        {(emp.yearsOfExperience !== undefined || emp.certificate1 || emp.certificate2) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                المؤهلات والخبرة
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border/50">
              {emp.yearsOfExperience !== undefined && emp.yearsOfExperience !== null && (
                <InfoRow label="سنوات الخبرة" value={`${emp.yearsOfExperience} سنة`} />
              )}
              {emp.certificate1 && (
                <div className="py-2 space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">الشهادة الأولى</span>
                  <InfoRow label="الشهادة" value={emp.certificate1} />
                  {emp.specialization1 && <InfoRow label="التخصص" value={emp.specialization1} />}
                  {emp.university1 && <InfoRow label="الجامعة" value={emp.university1} />}
                  {emp.certificateAttachment1 && (
                    <a
                      href={assetUrl(emp.certificateAttachment1)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      عرض المرفق
                    </a>
                  )}
                </div>
              )}
              {emp.certificate2 && (
                <div className="py-2 space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">الشهادة الثانية</span>
                  <InfoRow label="الشهادة" value={emp.certificate2} />
                  {emp.specialization2 && <InfoRow label="التخصص" value={emp.specialization2} />}
                  {emp.university2 && <InfoRow label="الجامعة" value={emp.university2} />}
                  {emp.certificateAttachment2 && (
                    <a
                      href={assetUrl(emp.certificateAttachment2)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      عرض المرفق
                    </a>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── Training Certificates ─────────────────────────── */}
        {trainingCertificates.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                الشهادات التدريبية
                <Badge variant="secondary" className="mr-auto">{trainingCertificates.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trainingCertificates.map((cert, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-2.5">
                    <span className="text-sm font-medium">{cert.name}</span>
                    {cert.attachmentUrl && (
                      <a
                        href={assetUrl(cert.attachmentUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        مرفق
                      </a>
                    )}
                  </div>
                ))}
              </div>
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
                    href={assetUrl(att.fileUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors group"
                  >
                    <FileDown className="h-5 w-5 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{att.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(att.createdAt).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── HR Evaluations ────────────────────────────────── */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              تقييمات HR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(["interviewEvaluation", "exitInterviewEvaluation"] as const).map((field) => {
              const label = field === "interviewEvaluation" ? "تقييم مقابلة التوظيف" : "تقييم مقابلة الخروج";
              const isEditing = evalEditField === field;
              return (
                <div key={field} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">{label}</p>
                    {!isEditing ? (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEvalEdit(field)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setEvalEditField(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={evalEditValue}
                        rows={3}
                        onChange={(e) => setEvalEditValue(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                        placeholder="اكتب التقييم هنا..."
                      />
                      <Button size="sm" className="gap-1.5 w-full" onClick={saveEvalEdit} disabled={updateEmployee.isPending}>
                        <Save className="h-3.5 w-3.5" />
                        حفظ
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm">
                      {emp?.[field] ? emp[field] : <span className="text-muted-foreground italic">لم يُملأ بعد</span>}
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* ─── Manager Notes ─────────────────────────────────── */}
        {canReadNotes && (
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                ملاحظات المدير
                {canWriteNotes && !notesEditing && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 ms-auto" onClick={openNotesEdit}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {notesEditing && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 ms-auto text-destructive" onClick={() => setNotesEditing(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notesEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={notesValue}
                    rows={4}
                    onChange={(e) => setNotesValue(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                    placeholder="اكتب الملاحظات هنا..."
                  />
                  <Button size="sm" className="gap-1.5 w-full" onClick={saveNotes} disabled={updateManagerNotes.isPending}>
                    <Save className="h-3.5 w-3.5" />
                    حفظ الملاحظات
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm whitespace-pre-wrap">
                    {(managerNotesData as any)?.managerNotes
                      ? (managerNotesData as any).managerNotes
                      : <span className="text-muted-foreground italic">لا توجد ملاحظات</span>}
                  </p>
                  {(managerNotesData as any)?.managerNotesUpdatedAt && (
                    <p className="text-xs text-muted-foreground">
                      آخر تعديل: {new Date((managerNotesData as any).managerNotesUpdatedAt).toLocaleDateString("en-GB")}
                    </p>
                  )}
                </div>
              )}
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
              value={employee.createdAt ? new Date(employee.createdAt).toLocaleDateString("en-GB") : undefined}
            />
            <InfoRow
              label={t("employees.updatedAt")}
              value={employee.updatedAt ? new Date(employee.updatedAt).toLocaleDateString("en-GB") : undefined}
            />
          </CardContent>
        </Card>

        {/* ─── Attendance Config ─────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              إعدادات الحضور
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">مرتبط بالراتب</p>
                <p className="text-xs text-muted-foreground">يُحسم على التأخر والغياب</p>
              </div>
              <Switch
                checked={getConfigForm().salaryLinked}
                onCheckedChange={(v) => setConfigForm({ ...getConfigForm(), salaryLinked: v })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>دقائق الاستراحة المسموحة يومياً</Label>
              <Input
                type="number"
                value={getConfigForm().allowedBreakMinutes}
                onChange={(e) => setConfigForm({ ...getConfigForm(), allowedBreakMinutes: Number(e.target.value) })}
                min={0}
                className="w-full"
              />
            </div>
            <Button
              size="sm"
              className="gap-1.5 w-full"
              onClick={handleSaveConfig}
              disabled={upsertConfig.isPending}
            >
              <Save className="h-3.5 w-3.5" />
              حفظ الإعدادات
            </Button>
          </CardContent>
        </Card>

        {/* ─── Fingerprints ──────────────────────────────────── */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-primary" />
              بصمات الموظف
              <Badge variant="secondary" className="mr-auto">{fpList.length}</Badge>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 mr-0 ms-auto h-7 text-xs"
                onClick={() => { setFpForm({ deviceId: "", pin: "" }); setFpDialogOpen(true); }}
              >
                <Plus className="h-3.5 w-3.5" />
                تسجيل بصمة
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fpList.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                لا توجد بصمات مسجلة لهذا الموظف
              </div>
            ) : (
              <div className="space-y-2">
                {fpList.map((fp) => (
                  <div
                    key={fp.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Fingerprint className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {fp.device?.nameAr || "جهاز غير محدد"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PIN: {fp.pin} • {new Date(fp.createdAt).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={fp.isActive ? "default" : "secondary"} className={fp.isActive ? "bg-green-600" : ""}>
                        {fp.isActive ? "نشط" : "غير نشط"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => { setSelectedFp(fp); setFpDeleteOpen(true); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      {/* ─── Schedule Assignments ──────────────────────────── */}
      <Card className="md:col-span-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            الورديات المعينة
            <Badge variant="secondary" className="mr-auto">{scheduleList.length}</Badge>
            <Button size="sm" variant="outline" className="gap-1.5 ms-auto h-7 text-xs" onClick={openAssignDialog}>
              <Plus className="h-3.5 w-3.5" />
              تعيين وردية
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scheduleList.length === 0 ? (
            <div className="flex items-center gap-2 justify-center py-6 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              لا توجد وردية معينة لهذا الموظف
            </div>
          ) : (
            <div className="space-y-2">
              {scheduleList.map((es) => (
                <div key={es.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{es.schedule?.nameAr || es.scheduleId}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(es.effectiveFrom).toLocaleDateString("en-GB")}
                        {es.effectiveTo ? ` ← ${new Date(es.effectiveTo).toLocaleDateString("en-GB")}` : " (دائم)"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={es.isActive ? "default" : "secondary"} className={es.isActive ? "bg-green-600" : ""}>
                      {es.isActive ? "نشط" : "منتهي"}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditScheduleDialog(es)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => { setSchedDeleteTarget(es); setSchedDeleteOpen(true); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Onboarding Workflows ──────────────────────────── */}
      <Card className="md:col-span-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            الإلحاق والإنهاء
            <Button size="sm" variant="outline" className="gap-1.5 ms-auto h-7 text-xs"
              onClick={() => setWfDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" />بدء Workflow
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {wfList.length === 0 ? (
            <p className="text-center py-4 text-sm text-muted-foreground">لا توجد workflows لهذا الموظف</p>
          ) : (
            <div className="space-y-3">
              {wfList.map((wf: any) => {
                const completed = (wf.tasks || []).filter((t: any) => t.status === "COMPLETED" || t.status === "SKIPPED").length;
                const total = wf.tasks?.length || 0;
                const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                return (
                  <div key={wf.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${wf.type === "ONBOARDING" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                          {wf.type === "ONBOARDING" ? "استقبال" : "إنهاء خدمة"}
                        </Badge>
                        <Badge className={`text-xs ${wf.status === "COMPLETED" ? "bg-green-100 text-green-700" : wf.status === "CANCELLED" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                          {wf.status === "COMPLETED" ? "مكتمل" : wf.status === "CANCELLED" ? "ملغى" : "قيد التنفيذ"}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 text-xs text-primary"
                        onClick={() => router.push(`/onboarding/workflows/${wf.id}`)}>
                        تفاصيل
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={progress} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground shrink-0">{completed}/{total}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      </div>

      {/* ─── Start Workflow Dialog ─────────────────────────── */}
      <Dialog open={wfDialogOpen} onOpenChange={setWfDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>بدء Workflow جديد</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>النوع</Label>
              <Select value={wfForm.type} onValueChange={(v) => setWfForm({ ...wfForm, type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONBOARDING">استقبال موظف</SelectItem>
                  <SelectItem value="OFFBOARDING">إنهاء خدمة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>القالب *</Label>
              <Select value={wfForm.templateId} onValueChange={(v) => setWfForm({ ...wfForm, templateId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر قالباً" /></SelectTrigger>
                <SelectContent>
                  {templateList.filter((t: any) => t.type === wfForm.type).map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.nameAr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>تاريخ البداية *</Label>
                <Input type="date" value={wfForm.startDate} onChange={(e) => setWfForm({ ...wfForm, startDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>تاريخ الهدف</Label>
                <Input type="date" value={wfForm.targetDate} onChange={(e) => setWfForm({ ...wfForm, targetDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWfDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreateWorkflow} disabled={!wfForm.templateId || !wfForm.startDate || createWorkflow.isPending}>بدء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Register Fingerprint Dialog ───────────────────── */}
      <Dialog open={fpDialogOpen} onOpenChange={setFpDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>تسجيل بصمة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>الجهاز *</Label>
              <Select
                value={fpForm.deviceId}
                onValueChange={(v) => setFpForm({ ...fpForm, deviceId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر جهاز البصمة" />
                </SelectTrigger>
                <SelectContent>
                  {deviceList.filter((d) => d.isActive).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nameAr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>رقم PIN *</Label>
              <Input
                value={fpForm.pin}
                onChange={(e) => setFpForm({ ...fpForm, pin: e.target.value })}
                placeholder="أدخل رقم PIN"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFpDialogOpen(false)}>إلغاء</Button>
            <Button
              onClick={handleRegisterFingerprint}
              disabled={!fpForm.deviceId || !fpForm.pin.trim() || registerFingerprint.isPending}
            >
              تسجيل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Fingerprint Confirm ─────────────────────── */}
      <ConfirmDialog
        open={fpDeleteOpen}
        onOpenChange={setFpDeleteOpen}
        title="حذف البصمة"
        description="هل أنت متأكد من حذف هذه البصمة؟"
        onConfirm={handleDeleteFingerprint}
        variant="destructive"
      />

      {/* ─── Contract End Date Dialog ──────────────────────── */}
      <Dialog open={contractEditOpen} onOpenChange={setContractEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>تعديل تاريخ انتهاء العقد</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>تاريخ الانتهاء (اتركه فارغاً للعقد الدائم)</Label>
              <Input
                type="date"
                value={contractEditValue}
                onChange={(e) => setContractEditValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContractEditOpen(false)}>إلغاء</Button>
            <Button onClick={saveContractEdit} disabled={updateEmployee.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Assign / Edit Schedule Dialog ─────────────────── */}
      <Dialog open={schedDialogOpen} onOpenChange={setSchedDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{schedEditTarget ? "تعديل الوردية" : "تعيين وردية للموظف"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>الوردية</Label>
              <Select value={schedForm.scheduleId} onValueChange={(v) => setSchedForm({ ...schedForm, scheduleId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الوردية" /></SelectTrigger>
                <SelectContent>
                  {allSchedules.filter((s: any) => s.isActive).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.nameAr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSchedDialogOpen(false)}>إلغاء</Button>
            <Button
              onClick={handleSaveSchedule}
              disabled={!schedForm.scheduleId || assignSchedule.isPending || updateEmpSchedule.isPending}
            >
              {schedEditTarget ? "حفظ التعديل" : "تعيين"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Schedule Confirm ────────────────────────── */}
      <ConfirmDialog
        open={schedDeleteOpen}
        onOpenChange={setSchedDeleteOpen}
        title="حذف الوردية"
        description={`هل أنت متأكد من حذف وردية "${schedDeleteTarget?.schedule?.nameAr || ""}"؟`}
        onConfirm={handleDeleteSchedule}
        variant="destructive"
      />

    </div>
  );
}
