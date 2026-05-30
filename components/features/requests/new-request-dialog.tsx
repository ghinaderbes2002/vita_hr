"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateRequest, useSubmitRequest } from "@/lib/hooks/use-requests";
import { useDepartments } from "@/lib/hooks/use-departments";
import { useEmployeesBasicList, useMyEmployee, useSubordinates } from "@/lib/hooks/use-employees";
import { useJobTitles } from "@/lib/hooks/use-job-titles";
import { useCheckUnreturnedCustodies } from "@/lib/hooks/use-custodies";
import { useAuthStore } from "@/lib/stores/auth-store";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { RequestType } from "@/types";
import { Loader2, Plus, Trash2, AlertTriangle, X } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const ALL_REQUEST_TYPES: (RequestType | "OVERTIME")[] = [
  "TRANSFER", "RESIGNATION", "REWARD",
  "PENALTY_PROPOSAL", "OVERTIME",
  "BUSINESS_MISSION", "DELEGATION", "HIRING_REQUEST", "COMPLAINT",
  "REMOTE_WORK", "OTHER",
];

const MANAGER_ONLY_TYPES = [
  "HIRING_REQUEST",
  "REWARD",
  "PENALTY_PROPOSAL",
  "OVERTIME_MANAGER",
  "BUSINESS_MISSION",
];

const MANAGER_PERMISSIONS = [
  "requests:manager-approve",
  "requests:hr-approve",
  "requests:approve",
  "requests:read-all-steps",
];

const INCIDENT_TYPES = [
  { value: "EMPLOYEE_INJURY", label: "إصابة موظف" },
  { value: "PATIENT_ACCIDENT", label: "حادث مريض" },
  { value: "VISITOR_ACCIDENT", label: "حادث زائر" },
  { value: "PROPERTY_DAMAGE", label: "تلف ممتلكات" },
  { value: "BIOLOGICAL_CHEMICAL", label: "تعرض بيولوجي/كيميائي" },
  { value: "MEDICATION_ERROR", label: "خطأ دوائي" },
  { value: "OTHER", label: "أخرى" },
];

const CONTRIBUTING_FACTORS = [
  { value: "SAFETY_PROCEDURES", label: "إجراءات السلامة" },
  { value: "MEDICAL_DEVICE", label: "جهاز طبي" },
  { value: "CHEMICAL_SPILL", label: "انسكاب كيميائي" },
  { value: "CROWDING", label: "الازدحام" },
  { value: "HUMAN_ERROR", label: "خطأ بشري" },
  { value: "OTHER", label: "أخرى" },
];

const REMOTE_WORK_TYPES = [
  { value: "TEMPORARY", label: "مؤقت" },
  { value: "REGULAR", label: "منتظم" },
  { value: "EMERGENCY", label: "طارئ" },
];

const JUSTIFICATION_OPTIONS = [
  { value: "HEALTH", label: "أسباب صحية" },
  { value: "FAMILY_CARE", label: "رعاية الأسرة" },
  { value: "PRODUCTIVITY", label: "تحسين الإنتاجية" },
  { value: "TRAVEL", label: "سفر" },
  { value: "OTHER", label: "أخرى" },
];

const REQUIRED_TOOLS = [
  { value: "LAPTOP", label: "لابتوب" },
  { value: "PHONE", label: "هاتف" },
  { value: "VPN", label: "VPN" },
  { value: "SPECIFIC_SOFTWARE", label: "برنامج محدد" },
  { value: "PERSONAL_DEVICE", label: "جهاز شخصي" },
];

const OVERTIME_TYPE_LABELS: Record<string, string> = {
  OVERTIME_EMPLOYEE: "تكليف موظف",
  OVERTIME_MANAGER: "تكليف مدير",
};

// Types that don't need a details section — reason field is enough
const NO_DETAILS_TYPES: RequestType[] = [
  "OTHER",
];

const formSchema = z.object({
  type: z.enum([...ALL_REQUEST_TYPES] as [string, ...string[]]),
  reason: z.string().optional(),
  notes: z.string().optional(),
  // RESIGNATION
  effectiveDate: z.string().optional(),
  resignationReasons: z.string().optional(),
  // TRANSFER
  currentDepartmentId: z.string().optional(),
  currentJobTitleId: z.string().optional(),
  newDepartmentId: z.string().optional(),
  newJobTitleId: z.string().optional(),
  // PENALTY_PROPOSAL
  targetEmployeeId: z.string().optional(),
  targetJobTitle: z.string().optional(),
  violationDescription: z.string().optional(),
  // OVERTIME_EMPLOYEE
  overtimeDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  totalHours: z.string().optional(),
  tasks: z.string().optional(),
  // OVERTIME_MANAGER
  overtimeStartDate: z.string().optional(),
  overtimeEndDate: z.string().optional(),
  purpose: z.string().optional(),
  // BUSINESS_MISSION
  missionType: z.string().optional(),
  missionStartDate: z.string().optional(),
  missionEndDate: z.string().optional(),
  totalDays: z.string().optional(),
  destination: z.string().optional(),
  missionReason: z.string().optional(),
  // DELEGATION
  delegationType: z.string().optional(),
  delegationStartDate: z.string().optional(),
  delegationEndDate: z.string().optional(),
  delegateEmployeeId: z.string().optional(),
  delegateJobTitle: z.string().optional(),
  // COMPLAINT
  complaintDescription: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

type HiringPosition = { departmentId: string; jobTitle: string; count: string; reason: string };
type RewardEmployee = { employeeId: string; category: "MATERIAL" | "MORAL"; rewardType: string; amount: string; reason: string };

const PENALTY_TYPES_MORAL = [
  { value: "NOTICE",    label: "لفت نظر" },
  { value: "WARNING_1", label: "إنذار أول" },
  { value: "WARNING_2", label: "إنذار ثانٍ" },
];
const PENALTY_TYPES_MATERIAL = [
  { value: "DAYS_DEDUCTION", label: "خصم أيام" },
];
const PENALTY_DAYS_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3];

const defaultWorkAccident = {
  incidentLocation: "", incidentType: "", incidentTypeOther: "",
  affectedPersonName: "", affectedPersonJobTitle: "", affectedPersonId: "",
  incidentTime: "", incidentTimeOfDay: "AM",
  incidentDetails: "", contributingFactors: [] as string[],
  immediateActions: {
    firstAid: false, firstAidBy: "", hospitalTransfer: false, hospitalName: "",
    supervisorNotified: false, supervisorName: "", supervisorNotifiedTime: "",
  },
  preventionRecommendations: "",
};

const defaultRemoteWork = {
  remoteWorkType: "", temporaryDays: "", emergencyReason: "",
  startDate: "", endDate: "", weeklyDaysCount: "", proposedDays: "",
  justification: [] as string[], justificationOther: "",
  tasks: [""] as string[], requiredTools: [] as string[], specificSoftware: "",
};

interface NewRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: string;
  title?: string;
}

export function NewRequestDialog({ open, onOpenChange, defaultType, title }: NewRequestDialogProps) {
  const t = useTranslations();
  const { user } = useAuthStore();
  const { hasAnyPermission, isAdmin } = usePermissions();

  const isManager = isAdmin() || hasAnyPermission(MANAGER_PERMISSIONS);

  const availableTypes = ALL_REQUEST_TYPES.filter((type) => {
    if (MANAGER_ONLY_TYPES.includes(type)) return isManager;
    return true;
  });

  const [submitMode, setSubmitMode] = useState<"draft" | "submit">("draft");
  const [hiringPositions, setHiringPositions] = useState<HiringPosition[]>([
    { departmentId: "", jobTitle: "", count: "1", reason: "" },
  ]);
  const [rewardEmployees, setRewardEmployees] = useState<RewardEmployee[]>([
    { employeeId: "", category: "MORAL", rewardType: "", amount: "", reason: "" },
  ]);
  const [penaltyCategory, setPenaltyCategory] = useState<"MATERIAL" | "MORAL">("MORAL");
  const [penaltyType, setPenaltyType] = useState<string>("");
  const [penaltyDays, setPenaltyDays] = useState<string>("");
  const [overtimeSubType, setOvertimeSubType] = useState<"OVERTIME_EMPLOYEE" | "OVERTIME_MANAGER">("OVERTIME_EMPLOYEE");
  const [overtimeManagerEmployeeIds, setOvertimeManagerEmployeeIds] = useState<string[]>([]);
  const [workAccident, setWorkAccident] = useState(defaultWorkAccident);
  const [remoteWork, setRemoteWork] = useState(defaultRemoteWork);

  const { data: myEmployee } = useMyEmployee();
  const managerEmployeeId = (myEmployee as any)?.id || user?.employeeId || "";
  const showAllEmployees = isAdmin() || !managerEmployeeId;

  const createRequest = useCreateRequest();
  const submitRequest = useSubmitRequest();
  const { data: deptData } = useDepartments({ limit: 100 });
  const { data: empData } = useEmployeesBasicList();
  const { data: subordinatesData } = useSubordinates(managerEmployeeId);
  const { data: titlesData } = useJobTitles({ limit: 100 });

  const departments: any[] = (deptData as any)?.data?.items || (deptData as any)?.data || [];
  const employees: any[] = showAllEmployees
    ? (Array.isArray(empData) ? empData : [])
    : (Array.isArray(subordinatesData) ? subordinatesData : []);
  const jobTitles: any[] = Array.isArray(titlesData)
    ? titlesData
    : (titlesData as any)?.data?.items || (titlesData as any)?.data || [];

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { type: defaultType || "OTHER", reason: "", notes: "" },
  });

  // When the dialog opens with a specific defaultType, reset the form to that type
  useEffect(() => {
    if (open && defaultType) {
      form.reset({ type: defaultType, reason: "", notes: "" });
    }
  }, [open, defaultType]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedType = form.watch("type");
  const watchedStartTime      = form.watch("startTime");
  const watchedEndTime        = form.watch("endTime");
  const watchedMissionStart   = form.watch("missionStartDate");
  const watchedMissionEnd     = form.watch("missionEndDate");
  const watchedOvertimeStart  = form.watch("overtimeStartDate");
  const watchedOvertimeEnd    = form.watch("overtimeEndDate");

  const calcHours = (s: string | undefined, e: string | undefined): number | null => {
    if (!s || !e) return null;
    const [sh, sm] = s.split(":").map(Number);
    const [eh, em] = e.split(":").map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? Math.round(diff / 60 * 100) / 100 : null;
  };

  const calcDays = (s: string | undefined, e: string | undefined): number | null => {
    if (!s || !e) return null;
    const diff = Math.round((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1;
    return diff > 0 ? diff : null;
  };

  const previewHours = calcHours(watchedStartTime, watchedEndTime);
  const previewMissionDays = calcDays(watchedMissionStart, watchedMissionEnd);
  const previewOvertimeDays = calcDays(watchedOvertimeStart, watchedOvertimeEnd);

  const { data: custodyCheck } = useCheckUnreturnedCustodies(
    user?.employeeId || "",
    selectedType === "RESIGNATION" && !!user?.employeeId,
  );
  const hasUnreturnedCustodies = custodyCheck?.hasUnreturned ?? false;

  const buildDetails = (data: FormData): Record<string, any> | undefined => {
    switch (data.type) {
      case "RESIGNATION":
        return { effectiveDate: data.effectiveDate, reasons: data.resignationReasons };
      case "TRANSFER":
        return {
          currentDepartmentId: data.currentDepartmentId,
          currentJobTitleId: data.currentJobTitleId,
          newDepartmentId: data.newDepartmentId,
          newJobTitleId: data.newJobTitleId,
        };
      case "PENALTY_PROPOSAL":
        return {
          targetEmployeeId: data.targetEmployeeId,
          targetJobTitle: data.targetJobTitle,
          category: penaltyCategory,
          penaltyType: penaltyType || undefined,
          penaltyDays: penaltyCategory === "MATERIAL" && penaltyDays ? Number(penaltyDays) : undefined,
          violationDescription: data.violationDescription,
        };
      case "OVERTIME":
      case "OVERTIME_EMPLOYEE":
        if (data.type === "OVERTIME" && overtimeSubType === "OVERTIME_MANAGER") {
          return {
            startDate: data.overtimeStartDate,
            endDate: data.overtimeEndDate,
            startTime: data.startTime,
            endTime: data.endTime,
            purpose: data.purpose,
            employeeIds: overtimeManagerEmployeeIds,
          };
        }
        return {
          overtimeDate: data.overtimeDate,
          startTime: data.startTime,
          endTime: data.endTime,
          tasks: data.tasks,
        };
      case "OVERTIME_MANAGER":
        return {
          startDate: data.overtimeStartDate,
          endDate: data.overtimeEndDate,
          startTime: data.startTime,
          endTime: data.endTime,
          purpose: data.purpose,
          employeeIds: overtimeManagerEmployeeIds,
        };
      case "BUSINESS_MISSION":
        return {
          missionType: data.missionType,
          startDate: data.missionStartDate,
          endDate: data.missionEndDate,
          destination: data.destination,
          missionReason: data.missionReason,
        };
      case "DELEGATION":
        return {
          delegationType: data.delegationType,
          startDate: data.delegationStartDate,
          endDate: data.delegationEndDate,
          delegateEmployeeId: data.delegateEmployeeId,
          delegateJobTitle: data.delegateJobTitle,
        };
      case "HIRING_REQUEST":
        return {
          positions: hiringPositions.map((p) => ({
            departmentId: p.departmentId,
            jobTitle: p.jobTitle,
            count: Number(p.count) || 1,
            reason: p.reason,
          })),
        };
      case "REWARD":
        return {
          employees: rewardEmployees.map((e) => ({
            employeeId: e.employeeId,
            category: e.category,
            rewardType: e.rewardType,
            amount: e.category === "MATERIAL" ? (Number(e.amount) || 0) : undefined,
            reason: e.reason,
          })),
        };
      case "COMPLAINT":
        return { complaintDescription: data.complaintDescription };
      case "WORK_ACCIDENT":
        return {
          incidentLocation: workAccident.incidentLocation,
          incidentType: workAccident.incidentType,
          incidentTypeOther: workAccident.incidentTypeOther || undefined,
          affectedPersonName: workAccident.affectedPersonName,
          affectedPersonJobTitle: workAccident.affectedPersonJobTitle || undefined,
          affectedPersonId: workAccident.affectedPersonId || undefined,
          incidentTime: workAccident.incidentTime,
          incidentTimeOfDay: workAccident.incidentTimeOfDay,
          incidentDetails: workAccident.incidentDetails,
          contributingFactors: workAccident.contributingFactors,
          immediateActions: workAccident.immediateActions,
          preventionRecommendations: workAccident.preventionRecommendations || undefined,
        };
      case "REMOTE_WORK":
        return {
          remoteWorkType: remoteWork.remoteWorkType,
          temporaryDays: remoteWork.temporaryDays ? Number(remoteWork.temporaryDays) : undefined,
          emergencyReason: remoteWork.emergencyReason || undefined,
          startDate: remoteWork.startDate,
          endDate: remoteWork.endDate || undefined,
          weeklyDaysCount: remoteWork.weeklyDaysCount ? Number(remoteWork.weeklyDaysCount) : undefined,
          proposedDays: remoteWork.proposedDays || undefined,
          justification: remoteWork.justification,
          justificationOther: remoteWork.justificationOther || undefined,
          tasks: remoteWork.tasks.filter(Boolean),
          requiredTools: remoteWork.requiredTools,
          specificSoftware: remoteWork.specificSoftware || undefined,
        };
      default:
        return undefined;
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const actualType = data.type === "OVERTIME" ? overtimeSubType : data.type as RequestType;

      if (actualType === "OVERTIME_MANAGER") {
        if (!data.overtimeStartDate) { toast.error("تاريخ البدء مطلوب"); return; }
        if (!data.overtimeEndDate) { toast.error("تاريخ الانتهاء مطلوب"); return; }
        if (!data.purpose?.trim()) { toast.error("أسباب التكليف الإضافي مطلوبة"); return; }
        if (overtimeManagerEmployeeIds.length === 0) { toast.error("يجب اختيار موظف واحد على الأقل"); return; }
      }
      const created = await createRequest.mutateAsync({
        type: actualType,
        reason: data.reason || "",
        notes: data.notes || undefined,
        details: buildDetails(data),
      });
      if (submitMode === "submit" && created?.id) {
        await submitRequest.mutateAsync(created.id);
      }
      onOpenChange(false);
      form.reset({ type: "OTHER", reason: "", notes: "" });
      setHiringPositions([{ departmentId: "", jobTitle: "", count: "1", reason: "" }]);
      setRewardEmployees([{ employeeId: "", category: "MORAL", rewardType: "", amount: "", reason: "" }]);
      setPenaltyCategory("MORAL");
      setPenaltyType("");
      setPenaltyDays("");
      setOvertimeManagerEmployeeIds([]);
      setWorkAccident(defaultWorkAccident);
      setRemoteWork(defaultRemoteWork);
    } catch {
      // Error handled by mutation
    }
  };

  const isLoading = createRequest.isPending || submitRequest.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-130 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title || t("requests.newRequest")}</DialogTitle>
          {!defaultType && (
            <DialogDescription>{t("requests.newRequestDescription")}</DialogDescription>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* نوع الطلب — hidden when a defaultType is pre-selected */}
            {!defaultType && (
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("requests.fields.type")}</FormLabel>
                  <Select value={field.value} onValueChange={(v) => { field.onChange(v); form.clearErrors(); }}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type === "OVERTIME"
                            ? "طلب تكليف إضافي"
                            : t(`requests.types.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            )}

            {/* ── RESIGNATION ── */}
            {selectedType === "RESIGNATION" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                {hasUnreturnedCustodies && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <p>{t("custodies.unreturnedWarning")}</p>
                  </div>
                )}
                <FormField control={form.control} name="effectiveDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ الاستقالة الفعلي *</FormLabel>
                    <FormControl><Input {...field} type="date" /></FormControl>
                    <p className="text-xs text-muted-foreground">يجب أن يكون بعد 30 يوماً على الأقل من اليوم</p>
                  </FormItem>
                )} />
                <FormField control={form.control} name="resignationReasons" render={({ field }) => (
                  <FormItem>
                    <FormLabel>أسباب الاستقالة *</FormLabel>
                    <FormControl><Textarea {...field} rows={3} placeholder="اذكر أسباب الاستقالة..." /></FormControl>
                  </FormItem>
                )} />
              </div>
            )}

            {/* ── TRANSFER ── */}
            {selectedType === "TRANSFER" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="currentDepartmentId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>القسم الحالي *</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger></FormControl>
                        <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="currentJobTitleId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>المسمى الحالي *</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger></FormControl>
                        <SelectContent>{jobTitles.map((j: any) => <SelectItem key={j.id} value={j.id}>{j.nameAr}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="newDepartmentId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>القسم المطلوب *</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger></FormControl>
                        <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="newJobTitleId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>المسمى المطلوب *</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger></FormControl>
                        <SelectContent>{jobTitles.map((j: any) => <SelectItem key={j.id} value={j.id}>{j.nameAr}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>
              </div>
            )}

            {/* ── PENALTY_PROPOSAL ── */}
            {selectedType === "PENALTY_PROPOSAL" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <FormField control={form.control} name="targetEmployeeId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الموظف المقترح بحقه الجزاء *</FormLabel>
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="اختر موظفاً" /></SelectTrigger></FormControl>
                      <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstNameAr} {e.lastNameAr}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="targetJobTitle" render={({ field }) => (
                  <FormItem>
                    <FormLabel>مسماه الوظيفي *</FormLabel>
                    <FormControl><Input {...field} placeholder="المسمى الوظيفي" /></FormControl>
                  </FormItem>
                )} />

                {/* التصنيف */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">التصنيف *</label>
                  <div className="flex gap-2">
                    {([{ value: "MORAL", label: "معنوي" }, { value: "MATERIAL", label: "مادي" }] as const).map((c) => (
                      <button key={c.value} type="button"
                        onClick={() => { setPenaltyCategory(c.value); setPenaltyType(c.value === "MATERIAL" ? "DAYS_DEDUCTION" : ""); setPenaltyDays(""); }}
                        className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${penaltyCategory === c.value ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 hover:border-primary/50"}`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  {penaltyCategory === "MORAL" && (
                    <p className="text-xs text-muted-foreground">إجراء معنوي بلا أثر مالي</p>
                  )}
                </div>

                {/* نوع العقوبة — للمعنوي فقط */}
                {penaltyCategory === "MORAL" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">نوع العقوبة *</label>
                  <div className="flex flex-wrap gap-2">
                    {PENALTY_TYPES_MORAL.map((pt) => (
                      <button key={pt.value} type="button"
                        onClick={() => setPenaltyType(pt.value)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${penaltyType === pt.value ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 hover:border-primary/50"}`}
                      >
                        {pt.label}
                      </button>
                    ))}
                  </div>
                </div>
                )}

                {/* أيام الخصم — للمادي فقط */}
                {penaltyCategory === "MATERIAL" && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">أيام الخصم *</label>
                    <div className="flex flex-wrap gap-2">
                      {PENALTY_DAYS_OPTIONS.map((d) => (
                        <button key={d} type="button"
                          onClick={() => setPenaltyDays(String(d))}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${penaltyDays === String(d) ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 hover:border-primary/50"}`}
                        >
                          {d} يوم
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-amber-600">سيُخصم {penaltyDays || "؟"} يوم من راتب الموظف للشهر الذي يُعتمد فيه</p>
                  </div>
                )}

                <FormField control={form.control} name="violationDescription" render={({ field }) => (
                  <FormItem>
                    <FormLabel>وصف المخالفة *</FormLabel>
                    <FormControl><Textarea {...field} rows={3} placeholder="اشرح المخالفة..." /></FormControl>
                  </FormItem>
                )} />
              </div>
            )}

            {/* ── OVERTIME (مدير / موظف) ── */}
            {selectedType === "OVERTIME" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                {isManager && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">النوع:</span>
                    {(["OVERTIME_EMPLOYEE", "OVERTIME_MANAGER"] as const).map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setOvertimeSubType(sub)}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                          overtimeSubType === sub
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-muted-foreground/30 hover:border-primary/50"
                        }`}
                      >
                        {OVERTIME_TYPE_LABELS[sub]}
                      </button>
                    ))}
                  </div>
                )}
                {overtimeSubType === "OVERTIME_EMPLOYEE" && (
                  <>
                    <p className="text-xs text-muted-foreground">إذا كان التاريخ هو اليوم لا يمكن تقديم الطلب بعد الساعة 12:00 ظهراً</p>
                    <FormField control={form.control} name="overtimeDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاريخ التكليف الإضافي *</FormLabel>
                        <FormControl><Input {...field} type="date" /></FormControl>
                      </FormItem>
                    )} />
                  </>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="startTime" render={({ field }) => (
                    <FormItem><FormLabel>وقت البدء *</FormLabel><FormControl><Input {...field} type="time" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="endTime" render={({ field }) => (
                    <FormItem><FormLabel>وقت الانتهاء *</FormLabel><FormControl><Input {...field} type="time" /></FormControl></FormItem>
                  )} />
                </div>
                {previewHours !== null && (
                  <p className="text-xs text-muted-foreground text-left">إجمالي الساعات: <span className="font-semibold text-foreground">{previewHours} ساعة</span></p>
                )}
                {overtimeSubType === "OVERTIME_EMPLOYEE" ? (
                  <FormField control={form.control} name="tasks" render={({ field }) => (
                    <FormItem>
                      <FormLabel>أسباب التكليف الإضافي *</FormLabel>
                      <FormControl><Textarea {...field} rows={2} placeholder="اذكر أسباب التكليف الإضافي..." /></FormControl>
                    </FormItem>
                  )} />
                ) : (
                  /* ── OVERTIME_MANAGER extra fields ── */
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="overtimeStartDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>تاريخ البدء *</FormLabel>
                          <FormControl><Input {...field} type="date" /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="overtimeEndDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>تاريخ الانتهاء *</FormLabel>
                          <FormControl><Input {...field} type="date" /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                    {previewOvertimeDays !== null && (
                      <p className="text-xs text-muted-foreground text-left">إجمالي الأيام: <span className="font-semibold text-foreground">{previewOvertimeDays} يوم</span></p>
                    )}
                    <FormField control={form.control} name="purpose" render={({ field }) => (
                      <FormItem>
                        <FormLabel>أسباب التكليف الإضافي *</FormLabel>
                        <FormControl><Textarea {...field} rows={2} placeholder="اذكر أسباب التكليف الإضافي..." /></FormControl>
                      </FormItem>
                    )} />
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        الموظفون المعنيون *
                        {overtimeManagerEmployeeIds.length > 0 && (
                          <span className="mr-1 text-xs text-muted-foreground">({overtimeManagerEmployeeIds.length} محدد)</span>
                        )}
                      </label>
                      {Array.isArray(subordinatesData) && subordinatesData.length === 0 && (
                        <p className="text-xs text-muted-foreground">لا يوجد مرؤوسون مرتبطون بحسابك</p>
                      )}
                      <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                        {(Array.isArray(subordinatesData) ? subordinatesData : []).map((emp: any) => {
                          const selected = overtimeManagerEmployeeIds.includes(emp.id);
                          return (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => setOvertimeManagerEmployeeIds((prev) =>
                                selected ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]
                              )}
                              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                                selected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-muted-foreground/30 hover:border-primary/50"
                              }`}
                            >
                              {emp.firstNameAr} {emp.lastNameAr}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── BUSINESS_MISSION ── */}
            {selectedType === "BUSINESS_MISSION" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <FormField control={form.control} name="missionType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع المهمة *</FormLabel>
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="INTERNAL">داخلية</SelectItem>
                        <SelectItem value="EXTERNAL">خارجية</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="missionStartDate" render={({ field }) => (
                    <FormItem><FormLabel>تاريخ البدء *</FormLabel><FormControl><Input {...field} type="date" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="missionEndDate" render={({ field }) => (
                    <FormItem><FormLabel>تاريخ الانتهاء *</FormLabel><FormControl><Input {...field} type="date" /></FormControl></FormItem>
                  )} />
                </div>
                {previewMissionDays !== null && (
                  <p className="text-xs text-muted-foreground text-left">إجمالي الأيام: <span className="font-semibold text-foreground">{previewMissionDays} يوم</span></p>
                )}
                <FormField control={form.control} name="destination" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوجهة *</FormLabel>
                    <FormControl><Input {...field} placeholder="المدينة / الجهة" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="missionReason" render={({ field }) => (
                  <FormItem>
                    <FormLabel>سبب المهمة *</FormLabel>
                    <FormControl><Textarea {...field} rows={2} placeholder="اشرح سبب المهمة..." /></FormControl>
                  </FormItem>
                )} />
              </div>
            )}

            {/* ── DELEGATION ── */}
            {selectedType === "DELEGATION" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <FormField control={form.control} name="delegationType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع التفويض *</FormLabel>
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="FULL">كامل</SelectItem>
                        <SelectItem value="PARTIAL">جزئي</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="delegationStartDate" render={({ field }) => (
                    <FormItem><FormLabel>تاريخ البدء *</FormLabel><FormControl><Input {...field} type="date" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="delegationEndDate" render={({ field }) => (
                    <FormItem><FormLabel>تاريخ الانتهاء *</FormLabel><FormControl><Input {...field} type="date" /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="delegateEmployeeId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الموظف المفوَّض إليه *</FormLabel>
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder="اختر موظفاً" /></SelectTrigger></FormControl>
                      <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstNameAr} {e.lastNameAr}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="delegateJobTitle" render={({ field }) => (
                  <FormItem>
                    <FormLabel>مسمى الموظف المفوَّض إليه *</FormLabel>
                    <FormControl><Input {...field} placeholder="المسمى الوظيفي" /></FormControl>
                  </FormItem>
                )} />
              </div>
            )}

            {/* ── HIRING_REQUEST ── */}
            {selectedType === "HIRING_REQUEST" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">الوظائف المطلوبة *</p>
                  {hiringPositions.length < 10 && (
                    <Button type="button" variant="outline" size="sm" className="gap-1"
                      onClick={() => setHiringPositions((a) => [...a, { departmentId: "", jobTitle: "", count: "1", reason: "" }])}>
                      <Plus className="h-3.5 w-3.5" />إضافة وظيفة
                    </Button>
                  )}
                </div>
                {hiringPositions.map((pos, i) => (
                  <div key={i} className="rounded border p-3 space-y-2 relative">
                    {hiringPositions.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="absolute top-1 left-1 h-7 w-7"
                        onClick={() => setHiringPositions((a) => a.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium">القسم *</label>
                        <Select value={pos.departmentId} onValueChange={(v) => setHiringPositions((a) => a.map((x, j) => j === i ? { ...x, departmentId: v } : x))}>
                          <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                          <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">عدد الشواغر *</label>
                        <Input type="number" min={1} value={pos.count}
                          onChange={(e) => setHiringPositions((a) => a.map((x, j) => j === i ? { ...x, count: e.target.value } : x))} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">المسمى الوظيفي *</label>
                      <Input value={pos.jobTitle} placeholder="مسمى الوظيفة المطلوبة"
                        onChange={(e) => setHiringPositions((a) => a.map((x, j) => j === i ? { ...x, jobTitle: e.target.value } : x))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">سبب الاحتياج *</label>
                      <Input value={pos.reason} placeholder="سبب الاحتياج لهذه الوظيفة"
                        onChange={(e) => setHiringPositions((a) => a.map((x, j) => j === i ? { ...x, reason: e.target.value } : x))} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── REWARD ── */}
            {selectedType === "REWARD" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">الموظفون المرشحون للمكافأة *</p>
                    <p className="text-xs text-muted-foreground mt-1">المبالغ المعتمدة تُضاف تلقائياً للراتب.</p>
                  </div>
                  {rewardEmployees.length < 10 && (
                    <Button type="button" variant="outline" size="sm" className="gap-1"
                      onClick={() => setRewardEmployees((a) => [...a, { employeeId: "", category: "MORAL", rewardType: "", amount: "", reason: "" }])}>
                      <Plus className="h-3.5 w-3.5" />إضافة موظف
                    </Button>
                  )}
                </div>
                {rewardEmployees.map((emp, i) => (
                  <div key={i} className="rounded border p-3 space-y-2 relative">
                    {rewardEmployees.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="absolute top-1 left-1 h-7 w-7"
                        onClick={() => setRewardEmployees((a) => a.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                    <div className="space-y-1">
                      <label className="text-xs font-medium">الموظف *</label>
                      <Select value={emp.employeeId} onValueChange={(v) => setRewardEmployees((a) => a.map((x, j) => j === i ? { ...x, employeeId: v } : x))}>
                        <SelectTrigger><SelectValue placeholder="اختر موظفاً" /></SelectTrigger>
                        <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstNameAr} {e.lastNameAr}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {/* التصنيف */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium">التصنيف *</label>
                      <div className="flex gap-2">
                        {([{ value: "MORAL", label: "معنوي" }, { value: "MATERIAL", label: "مادي" }] as const).map((c) => (
                          <button key={c.value} type="button"
                            onClick={() => setRewardEmployees((a) => a.map((x, j) => j === i ? { ...x, category: c.value, amount: "" } : x))}
                            className={`px-3 py-1 rounded-full text-xs border transition-colors ${emp.category === c.value ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 hover:border-primary/50"}`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={`grid gap-2 ${emp.category === "MATERIAL" ? "grid-cols-2" : "grid-cols-1"}`}>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">نوع المكافأة *</label>
                        <Input value={emp.rewardType} placeholder="نوع المكافأة"
                          onChange={(e) => setRewardEmployees((a) => a.map((x, j) => j === i ? { ...x, rewardType: e.target.value } : x))} />
                      </div>
                      {emp.category === "MATERIAL" && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium">المبلغ *</label>
                          <Input type="number" min={0} value={emp.amount}
                            onChange={(e) => setRewardEmployees((a) => a.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">سبب المكافأة *</label>
                      <Input value={emp.reason} placeholder="سبب المكافأة"
                        onChange={(e) => setRewardEmployees((a) => a.map((x, j) => j === i ? { ...x, reason: e.target.value } : x))} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── COMPLAINT ── */}
            {selectedType === "COMPLAINT" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <FormField control={form.control} name="complaintDescription" render={({ field }) => (
                  <FormItem>
                    <FormLabel>تفاصيل الشكوى *</FormLabel>
                    <FormControl><Textarea {...field} rows={4} placeholder="اشرح الشكوى بالتفصيل..." /></FormControl>
                  </FormItem>
                )} />
              </div>
            )}

            {/* ── WORK_ACCIDENT ── */}
            {selectedType === "WORK_ACCIDENT" && (
              <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
                <p className="text-sm font-semibold">تفاصيل حادث العمل</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">موقع الحادث *</label>
                    <Input value={workAccident.incidentLocation} placeholder="القسم / الغرفة / المكان"
                      onChange={(e) => setWorkAccident((p) => ({ ...p, incidentLocation: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">نوع الحادث *</label>
                    <select
                      value={workAccident.incidentType}
                      onChange={(e) => setWorkAccident((p) => ({ ...p, incidentType: e.target.value }))}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">اختر</option>
                      {INCIDENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>

                {workAccident.incidentType === "OTHER" && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium">تفاصيل نوع الحادث *</label>
                    <Input value={workAccident.incidentTypeOther} placeholder="اذكر نوع الحادث..."
                      onChange={(e) => setWorkAccident((p) => ({ ...p, incidentTypeOther: e.target.value }))} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">اسم المتضرر *</label>
                    <Input value={workAccident.affectedPersonName} placeholder="الاسم الكامل"
                      onChange={(e) => setWorkAccident((p) => ({ ...p, affectedPersonName: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">مسماه الوظيفي</label>
                    <Input value={workAccident.affectedPersonJobTitle} placeholder="المسمى الوظيفي"
                      onChange={(e) => setWorkAccident((p) => ({ ...p, affectedPersonJobTitle: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">رقم هوية المتضرر</label>
                    <Input value={workAccident.affectedPersonId} placeholder="رقم الهوية"
                      onChange={(e) => setWorkAccident((p) => ({ ...p, affectedPersonId: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">وقت الحادث *</label>
                    <Input type="time" value={workAccident.incidentTime}
                      onChange={(e) => setWorkAccident((p) => ({ ...p, incidentTime: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">ص / م</label>
                    <select
                      value={workAccident.incidentTimeOfDay}
                      onChange={(e) => setWorkAccident((p) => ({ ...p, incidentTimeOfDay: e.target.value }))}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="AM">ص (AM)</option>
                      <option value="PM">م (PM)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">تفاصيل الحادث *</label>
                  <textarea
                    value={workAccident.incidentDetails}
                    rows={3}
                    placeholder="صف ما حدث بالتفصيل..."
                    onChange={(e) => setWorkAccident((p) => ({ ...p, incidentDetails: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium">العوامل المساهمة</label>
                  <div className="flex flex-wrap gap-2">
                    {CONTRIBUTING_FACTORS.map((f) => {
                      const checked = workAccident.contributingFactors.includes(f.value);
                      return (
                        <button key={f.value} type="button"
                          onClick={() => setWorkAccident((p) => ({
                            ...p,
                            contributingFactors: checked
                              ? p.contributingFactors.filter((x) => x !== f.value)
                              : [...p.contributingFactors, f.value],
                          }))}
                          className={`px-3 py-1 rounded-full text-xs border transition-colors ${checked ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 hover:border-primary/50"}`}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 rounded border p-3">
                  <p className="text-xs font-semibold">الإجراءات الفورية</p>
                  <div className="space-y-2">
                    {[
                      { key: "firstAid", label: "تم تقديم إسعافات أولية" },
                      { key: "hospitalTransfer", label: "تم نقله للمستشفى" },
                      { key: "supervisorNotified", label: "تم إبلاغ المشرف" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input type="checkbox"
                            checked={(workAccident.immediateActions as any)[key]}
                            onChange={(e) => setWorkAccident((p) => ({
                              ...p, immediateActions: { ...p.immediateActions, [key]: e.target.checked },
                            }))}
                          />
                          {label}
                        </label>
                        {key === "firstAid" && workAccident.immediateActions.firstAid && (
                          <Input className="mt-1" placeholder="من قدم الإسعافات؟"
                            value={workAccident.immediateActions.firstAidBy}
                            onChange={(e) => setWorkAccident((p) => ({ ...p, immediateActions: { ...p.immediateActions, firstAidBy: e.target.value } }))} />
                        )}
                        {key === "hospitalTransfer" && workAccident.immediateActions.hospitalTransfer && (
                          <Input className="mt-1" placeholder="اسم المستشفى"
                            value={workAccident.immediateActions.hospitalName}
                            onChange={(e) => setWorkAccident((p) => ({ ...p, immediateActions: { ...p.immediateActions, hospitalName: e.target.value } }))} />
                        )}
                        {key === "supervisorNotified" && workAccident.immediateActions.supervisorNotified && (
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <Input placeholder="اسم المشرف"
                              value={workAccident.immediateActions.supervisorName}
                              onChange={(e) => setWorkAccident((p) => ({ ...p, immediateActions: { ...p.immediateActions, supervisorName: e.target.value } }))} />
                            <Input placeholder="وقت الإبلاغ"
                              value={workAccident.immediateActions.supervisorNotifiedTime}
                              onChange={(e) => setWorkAccident((p) => ({ ...p, immediateActions: { ...p.immediateActions, supervisorNotifiedTime: e.target.value } }))} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">توصيات الوقاية</label>
                  <textarea
                    value={workAccident.preventionRecommendations}
                    rows={2}
                    placeholder="اقتراحات لمنع تكرار الحادث..."
                    onChange={(e) => setWorkAccident((p) => ({ ...p, preventionRecommendations: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  />
                </div>
              </div>
            )}

            {/* ── REMOTE_WORK ── */}
            {selectedType === "REMOTE_WORK" && (
              <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
                <p className="text-sm font-semibold">تفاصيل طلب العمل عن بعد</p>

                <div className="space-y-1">
                  <label className="text-xs font-medium">نوع العمل عن بعد *</label>
                  <div className="flex gap-2">
                    {REMOTE_WORK_TYPES.map((t) => (
                      <button key={t.value} type="button"
                        onClick={() => setRemoteWork((p) => ({ ...p, remoteWorkType: t.value }))}
                        className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${remoteWork.remoteWorkType === t.value ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 hover:border-primary/50"}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {remoteWork.remoteWorkType === "TEMPORARY" && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium">عدد الأيام *</label>
                    <Input type="number" min={1} value={remoteWork.temporaryDays} placeholder="عدد الأيام"
                      onChange={(e) => setRemoteWork((p) => ({ ...p, temporaryDays: e.target.value }))} />
                  </div>
                )}

                {remoteWork.remoteWorkType === "EMERGENCY" && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium">سبب الطارئ *</label>
                    <Input value={remoteWork.emergencyReason} placeholder="اذكر سبب الطارئ"
                      onChange={(e) => setRemoteWork((p) => ({ ...p, emergencyReason: e.target.value }))} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">تاريخ البدء *</label>
                    <Input type="date" value={remoteWork.startDate}
                      onChange={(e) => setRemoteWork((p) => ({ ...p, startDate: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">تاريخ الانتهاء</label>
                    <Input type="date" value={remoteWork.endDate}
                      onChange={(e) => setRemoteWork((p) => ({ ...p, endDate: e.target.value }))} />
                  </div>
                </div>

                {remoteWork.remoteWorkType === "REGULAR" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">عدد الأيام أسبوعياً *</label>
                      <Input type="number" min={1} max={7} value={remoteWork.weeklyDaysCount}
                        onChange={(e) => setRemoteWork((p) => ({ ...p, weeklyDaysCount: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">الأيام المقترحة *</label>
                      <Input value={remoteWork.proposedDays} placeholder="مثال: الإثنين والأربعاء"
                        onChange={(e) => setRemoteWork((p) => ({ ...p, proposedDays: e.target.value }))} />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-medium">مبررات الطلب *</label>
                  <div className="flex flex-wrap gap-2">
                    {JUSTIFICATION_OPTIONS.map((j) => {
                      const checked = remoteWork.justification.includes(j.value);
                      return (
                        <button key={j.value} type="button"
                          onClick={() => setRemoteWork((p) => ({
                            ...p,
                            justification: checked
                              ? p.justification.filter((x) => x !== j.value)
                              : [...p.justification, j.value],
                          }))}
                          className={`px-3 py-1 rounded-full text-xs border transition-colors ${checked ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 hover:border-primary/50"}`}
                        >
                          {j.label}
                        </button>
                      );
                    })}
                  </div>
                  {remoteWork.justification.includes("OTHER") && (
                    <Input value={remoteWork.justificationOther} placeholder="اذكر المبرر..."
                      onChange={(e) => setRemoteWork((p) => ({ ...p, justificationOther: e.target.value }))} />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">المهام المخططة *</label>
                    <button type="button"
                      onClick={() => setRemoteWork((p) => ({ ...p, tasks: [...p.tasks, ""] }))}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> إضافة مهمة
                    </button>
                  </div>
                  {remoteWork.tasks.map((task, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input value={task} placeholder={`مهمة ${i + 1}`}
                        onChange={(e) => setRemoteWork((p) => ({ ...p, tasks: p.tasks.map((t, j) => j === i ? e.target.value : t) }))} />
                      {remoteWork.tasks.length > 1 && (
                        <button type="button" onClick={() => setRemoteWork((p) => ({ ...p, tasks: p.tasks.filter((_, j) => j !== i) }))}>
                          <X className="h-4 w-4 text-destructive" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium">الأدوات المطلوبة</label>
                  <div className="flex flex-wrap gap-2">
                    {REQUIRED_TOOLS.map((tool) => {
                      const checked = remoteWork.requiredTools.includes(tool.value);
                      return (
                        <button key={tool.value} type="button"
                          onClick={() => setRemoteWork((p) => ({
                            ...p,
                            requiredTools: checked
                              ? p.requiredTools.filter((x) => x !== tool.value)
                              : [...p.requiredTools, tool.value],
                          }))}
                          className={`px-3 py-1 rounded-full text-xs border transition-colors ${checked ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 hover:border-primary/50"}`}
                        >
                          {tool.label}
                        </button>
                      );
                    })}
                  </div>
                  {remoteWork.requiredTools.includes("SPECIFIC_SOFTWARE") && (
                    <Input value={remoteWork.specificSoftware} placeholder="اسم البرنامج المحدد"
                      onChange={(e) => setRemoteWork((p) => ({ ...p, specificSoftware: e.target.value }))} />
                  )}
                </div>
              </div>
            )}

            {/* ملاحظات */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("requests.fields.notes")} ({t("common.optional")})</FormLabel>
                  <FormControl><Textarea {...field} rows={2} /></FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" variant="outline" disabled={isLoading} onClick={() => setSubmitMode("draft")}>
                {t("requests.saveAsDraft")}
              </Button>
              <Button type="submit" disabled={isLoading} onClick={() => setSubmitMode("submit")}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                {t("requests.submitRequest")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
