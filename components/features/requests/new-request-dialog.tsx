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
import { useEmployees } from "@/lib/hooks/use-employees";
import { useJobTitles } from "@/lib/hooks/use-job-titles";
import { useCheckUnreturnedCustodies } from "@/lib/hooks/use-custodies";
import { useAuthStore } from "@/lib/stores/auth-store";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { RequestType } from "@/types";
import { Loader2, Plus, Trash2, AlertTriangle, X } from "lucide-react";
import { useState, useEffect } from "react";

const ALL_REQUEST_TYPES: (RequestType | "OVERTIME")[] = [
  "TRANSFER", "RESIGNATION", "REWARD",
  "PENALTY_PROPOSAL", "OVERTIME",
  "BUSINESS_MISSION", "DELEGATION", "HIRING_REQUEST", "COMPLAINT",
  "WORK_ACCIDENT", "REMOTE_WORK", "OTHER",
];

const MANAGER_ONLY_TYPES = [
  "HIRING_REQUEST",
  "REWARD",
  "PENALTY_PROPOSAL",
  "OVERTIME_MANAGER",
];

const MANAGER_PERMISSIONS = [
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
  OVERTIME_EMPLOYEE: "موظف",
  OVERTIME_MANAGER: "مدير",
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
  // OVERTIME_EMPLOYEE / OVERTIME_MANAGER
  overtimeDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  totalHours: z.string().optional(),
  tasks: z.string().optional(),
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
type RewardEmployee = { employeeId: string; rewardType: string; amount: string; reason: string };

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
    { employeeId: "", rewardType: "", amount: "", reason: "" },
  ]);
  const [overtimeSubType, setOvertimeSubType] = useState<"OVERTIME_EMPLOYEE" | "OVERTIME_MANAGER">("OVERTIME_EMPLOYEE");
  const [workAccident, setWorkAccident] = useState(defaultWorkAccident);
  const [remoteWork, setRemoteWork] = useState(defaultRemoteWork);

  const createRequest = useCreateRequest();
  const submitRequest = useSubmitRequest();
  const { data: deptData } = useDepartments({ limit: 100 });
  const { data: empData } = useEmployees({ limit: 100 });
  const { data: titlesData } = useJobTitles({ limit: 100 });

  const departments: any[] = (deptData as any)?.data?.items || (deptData as any)?.data || [];
  const employees: any[] = (empData as any)?.data?.items || (empData as any)?.items || [];
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
          violationDescription: data.violationDescription,
        };
      case "OVERTIME":
      case "OVERTIME_EMPLOYEE":
      case "OVERTIME_MANAGER":
        return {
          overtimeDate: data.overtimeDate,
          startTime: data.startTime,
          endTime: data.endTime,
          totalHours: data.totalHours ? Number(data.totalHours) : undefined,
          ...(overtimeSubType === "OVERTIME_EMPLOYEE" ? { tasks: data.tasks } : { purpose: data.purpose }),
        };
      case "BUSINESS_MISSION":
        return {
          missionType: data.missionType,
          startDate: data.missionStartDate,
          endDate: data.missionEndDate,
          totalDays: data.totalDays ? Number(data.totalDays) : undefined,
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
            rewardType: e.rewardType,
            amount: Number(e.amount) || 0,
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
      setRewardEmployees([{ employeeId: "", rewardType: "", amount: "", reason: "" }]);
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
                            ? isManager ? "وقت إضافي مدير/موظف" : "وقت إضافي"
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
                <p className="text-xs text-muted-foreground">إذا كان التاريخ هو اليوم لا يمكن تقديم الطلب بعد الساعة 12:00 ظهراً</p>
                <FormField control={form.control} name="overtimeDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ العمل الإضافي *</FormLabel>
                    <FormControl><Input {...field} type="date" /></FormControl>
                  </FormItem>
                )} />
                <div className="grid grid-cols-3 gap-3">
                  <FormField control={form.control} name="startTime" render={({ field }) => (
                    <FormItem><FormLabel>وقت البدء *</FormLabel><FormControl><Input {...field} type="time" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="endTime" render={({ field }) => (
                    <FormItem><FormLabel>وقت الانتهاء *</FormLabel><FormControl><Input {...field} type="time" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="totalHours" render={({ field }) => (
                    <FormItem><FormLabel>إجمالي الساعات *</FormLabel><FormControl><Input {...field} type="number" min={0} step={0.5} /></FormControl></FormItem>
                  )} />
                </div>
                {overtimeSubType === "OVERTIME_EMPLOYEE" ? (
                  <FormField control={form.control} name="tasks" render={({ field }) => (
                    <FormItem>
                      <FormLabel>المهام المنجزة *</FormLabel>
                      <FormControl><Textarea {...field} rows={2} placeholder="صف المهام التي أُنجزت..." /></FormControl>
                    </FormItem>
                  )} />
                ) : (
                  <FormField control={form.control} name="purpose" render={({ field }) => (
                    <FormItem>
                      <FormLabel>الغرض من العمل الإضافي *</FormLabel>
                      <FormControl><Textarea {...field} rows={2} placeholder="اشرح الغرض..." /></FormControl>
                    </FormItem>
                  )} />
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
                <div className="grid grid-cols-3 gap-3">
                  <FormField control={form.control} name="missionStartDate" render={({ field }) => (
                    <FormItem><FormLabel>تاريخ البدء *</FormLabel><FormControl><Input {...field} type="date" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="missionEndDate" render={({ field }) => (
                    <FormItem><FormLabel>تاريخ الانتهاء *</FormLabel><FormControl><Input {...field} type="date" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="totalDays" render={({ field }) => (
                    <FormItem><FormLabel>إجمالي الأيام *</FormLabel><FormControl><Input {...field} type="number" min={1} /></FormControl></FormItem>
                  )} />
                </div>
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
                    <p className="text-xs text-muted-foreground mt-1">ملاحظة: المبالغ المعتمدة سيتم إضافتها تلقائياً إلى راتب الموظف في مسير الرواتب.</p>
                  </div>
                  {rewardEmployees.length < 10 && (
                    <Button type="button" variant="outline" size="sm" className="gap-1"
                      onClick={() => setRewardEmployees((a) => [...a, { employeeId: "", rewardType: "", amount: "", reason: "" }])}>
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
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium">نوع المكافأة *</label>
                        <Input value={emp.rewardType} placeholder="نوع المكافأة"
                          onChange={(e) => setRewardEmployees((a) => a.map((x, j) => j === i ? { ...x, rewardType: e.target.value } : x))} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">المبلغ *</label>
                        <Input type="number" min={0} value={emp.amount}
                          onChange={(e) => setRewardEmployees((a) => a.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} />
                      </div>
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
