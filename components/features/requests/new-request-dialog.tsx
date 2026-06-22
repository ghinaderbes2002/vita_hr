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
import { useCreateMaintenanceRequest } from "@/lib/hooks/use-maintenance-requests";
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

const ALL_REQUEST_TYPES: (RequestType | "OVERTIME" | "MAINTENANCE")[] = [
  "TRANSFER", "RESIGNATION", "REWARD",
  "PENALTY_PROPOSAL", "OVERTIME",
  "BUSINESS_MISSION", "DELEGATION", "HIRING_REQUEST", "COMPLAINT",
  "REMOTE_WORK", "MAINTENANCE", "OTHER",
];

const MAINTENANCE_WORK_LOCATIONS = ["SHAHBA", "CENTER", "NEW_ALEPPO"] as const;
const MAINTENANCE_PRIORITIES = ["URGENT", "MEDIUM", "NORMAL"] as const;

const defaultMaintenance = {
  workLocation: "CENTER",
  assetType: "",
  assetNumber: "",
  brandModel: "",
  faultDescription: "",
  priority: "NORMAL",
};

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

const INCIDENT_TYPE_VALUES = [
  "EMPLOYEE_INJURY", "PATIENT_ACCIDENT", "VISITOR_ACCIDENT",
  "PROPERTY_DAMAGE", "BIOLOGICAL_CHEMICAL", "MEDICATION_ERROR", "OTHER",
];

const CONTRIBUTING_FACTOR_VALUES = [
  "SAFETY_PROCEDURES", "MEDICAL_DEVICE", "CHEMICAL_SPILL",
  "CROWDING", "HUMAN_ERROR", "OTHER",
];

const REMOTE_WORK_TYPE_VALUES = ["TEMPORARY", "REGULAR", "EMERGENCY"];

const JUSTIFICATION_OPTION_VALUES = ["HEALTH", "FAMILY_CARE", "PRODUCTIVITY", "TRAVEL", "OTHER"];

const REQUIRED_TOOL_VALUES = ["LAPTOP", "PHONE", "VPN", "SPECIFIC_SOFTWARE", "PERSONAL_DEVICE"];

const PENALTY_MORAL_TYPE_VALUES = ["NOTICE", "WARNING_1", "WARNING_2"];
const PENALTY_DAYS_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3];

const NO_DETAILS_TYPES: RequestType[] = ["OTHER"];

const formSchema = z.object({
  type: z.enum([...ALL_REQUEST_TYPES] as [string, ...string[]]),
  reason: z.string().optional(),
  notes: z.string().optional(),
  effectiveDate: z.string().optional(),
  resignationReasons: z.string().optional(),
  currentDepartmentId: z.string().optional(),
  currentJobTitleId: z.string().optional(),
  newDepartmentId: z.string().optional(),
  newJobTitleId: z.string().optional(),
  targetEmployeeId: z.string().optional(),
  targetJobTitle: z.string().optional(),
  violationDescription: z.string().optional(),
  overtimeDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  totalHours: z.string().optional(),
  tasks: z.string().optional(),
  overtimeStartDate: z.string().optional(),
  overtimeEndDate: z.string().optional(),
  purpose: z.string().optional(),
  missionType: z.string().optional(),
  missionStartDate: z.string().optional(),
  missionEndDate: z.string().optional(),
  totalDays: z.string().optional(),
  destination: z.string().optional(),
  missionReason: z.string().optional(),
  delegationType: z.string().optional(),
  delegationStartDate: z.string().optional(),
  delegationEndDate: z.string().optional(),
  delegateEmployeeId: z.string().optional(),
  delegateJobTitle: z.string().optional(),
  complaintDescription: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

type HiringPosition = { departmentId: string; jobTitle: string; count: string; reason: string };
type RewardEmployee = { employeeId: string; category: "MATERIAL" | "MORAL"; rewardType: string; amount: string; reason: string };

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
  const [maintenanceData, setMaintenanceData] = useState(defaultMaintenance);

  const { data: myEmployee } = useMyEmployee();
  const managerEmployeeId = (myEmployee as any)?.id || user?.employeeId || "";
  const showAllEmployees = isAdmin() || !managerEmployeeId;

  const createRequest = useCreateRequest();
  const submitRequest = useSubmitRequest();
  const createMaintenanceRequest = useCreateMaintenanceRequest();
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

  useEffect(() => {
    if (open && defaultType) {
      form.reset({ type: defaultType, reason: "", notes: "" });
    }
  }, [open, defaultType]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedType = form.watch("type");
  const watchedDelegationType = form.watch("delegationType");
  const watchedStartTime      = form.watch("startTime");
  const watchedEndTime        = form.watch("endTime");
  const watchedMissionStart   = form.watch("missionStartDate");
  const watchedMissionEnd     = form.watch("missionEndDate");
  const watchedOvertimeStart  = form.watch("overtimeStartDate");
  const watchedOvertimeEnd    = form.watch("overtimeEndDate");

  const calcHours = (s: string | null | undefined, e: string | null | undefined): number | null => {
    if (!s || !e) return null;
    const sParts = s.split(":");
    const eParts = e.split(":");
    if (sParts.length < 2 || eParts.length < 2) return null;
    const sh = Number(sParts[0]) || 0;
    const sm = Number(sParts[1]) || 0;
    const eh = Number(eParts[0]) || 0;
    const em = Number(eParts[1]) || 0;
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
      if (data.type === "MAINTENANCE") {
        if (!maintenanceData.assetType.trim()) {
          toast.error(t("maintenance.fields.assetType"));
          return;
        }
        if (maintenanceData.faultDescription.trim().length < 5) {
          toast.error(t("maintenance.fields.faultDescription"));
          return;
        }
        await createMaintenanceRequest.mutateAsync({
          workLocation: maintenanceData.workLocation as any,
          assetType: maintenanceData.assetType,
          assetNumber: maintenanceData.assetNumber || undefined,
          brandModel: maintenanceData.brandModel || undefined,
          faultDescription: maintenanceData.faultDescription,
          priority: maintenanceData.priority as any,
        });
        onOpenChange(false);
        form.reset({ type: "OTHER", reason: "", notes: "" });
        setMaintenanceData(defaultMaintenance);
        return;
      }

      const actualType = data.type === "OVERTIME" ? overtimeSubType : data.type as RequestType;

      if (actualType === "OVERTIME_MANAGER") {
        if (!data.overtimeStartDate) { toast.error(t("requests.dialog.overtime.startDate")); return; }
        if (!data.overtimeEndDate) { toast.error(t("requests.dialog.overtime.endDate")); return; }
        if (!data.purpose?.trim()) { toast.error(t("requests.dialog.overtime.purposeLabel")); return; }
        if (overtimeManagerEmployeeIds.length === 0) { toast.error(t("requests.dialog.overtime.assignedEmployees")); return; }
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
      setMaintenanceData(defaultMaintenance);
    } catch {
      // Error handled by mutation
    }
  };

  const isLoading = createRequest.isPending || submitRequest.isPending || createMaintenanceRequest.isPending;

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
                          {t(`requests.types.${type}` as any)}
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
                    <FormLabel>{t("requests.dialog.resignation.effectiveDateLabel")}</FormLabel>
                    <FormControl><Input {...field} type="date" /></FormControl>
                    <p className="text-xs text-muted-foreground">{t("requests.dialog.resignation.effectiveDateHint")}</p>
                  </FormItem>
                )} />
                <FormField control={form.control} name="resignationReasons" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("requests.dialog.resignation.reasonsLabel")}</FormLabel>
                    <FormControl><Textarea {...field} rows={3} placeholder={t("requests.dialog.resignation.reasonsPlaceholder")} /></FormControl>
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
                      <FormLabel>{t("requests.dialog.transfer.currentDept")}</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("requests.dialog.choose")} /></SelectTrigger></FormControl>
                        <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="currentJobTitleId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("requests.dialog.transfer.currentTitle")}</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("requests.dialog.choose")} /></SelectTrigger></FormControl>
                        <SelectContent>{jobTitles.map((j: any) => <SelectItem key={j.id} value={j.id}>{j.nameAr}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="newDepartmentId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("requests.dialog.transfer.newDept")}</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("requests.dialog.choose")} /></SelectTrigger></FormControl>
                        <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="newJobTitleId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("requests.dialog.transfer.newTitle")}</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("requests.dialog.choose")} /></SelectTrigger></FormControl>
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
                    <FormLabel>{t("requests.dialog.penalty.targetEmployee")}</FormLabel>
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("requests.dialog.chooseEmployee")} /></SelectTrigger></FormControl>
                      <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstNameAr} {e.lastNameAr}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="targetJobTitle" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("requests.dialog.penalty.jobTitle")}</FormLabel>
                    <FormControl><Input {...field} placeholder={t("requests.dialog.penalty.jobTitlePlaceholder")} /></FormControl>
                  </FormItem>
                )} />

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("requests.dialog.penalty.categoryLabel")}</label>
                  <div className="flex gap-2">
                    {(["MORAL", "MATERIAL"] as const).map((c) => (
                      <button key={c} type="button"
                        onClick={() => { setPenaltyCategory(c); setPenaltyType(c === "MATERIAL" ? "DAYS_DEDUCTION" : ""); setPenaltyDays(""); }}
                        className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${penaltyCategory === c ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 hover:border-primary/50"}`}
                      >
                        {c === "MORAL" ? t("requests.dialog.penalty.categoryMoral") : t("requests.dialog.penalty.categoryMaterial")}
                      </button>
                    ))}
                  </div>
                  {penaltyCategory === "MORAL" && (
                    <p className="text-xs text-muted-foreground">{t("requests.dialog.penalty.moralNote")}</p>
                  )}
                </div>

                {penaltyCategory === "MORAL" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("requests.dialog.penalty.penaltyTypeLabel")}</label>
                  <div className="flex flex-wrap gap-2">
                    {PENALTY_MORAL_TYPE_VALUES.map((pv) => (
                      <button key={pv} type="button"
                        onClick={() => setPenaltyType(pv)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${penaltyType === pv ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 hover:border-primary/50"}`}
                      >
                        {t(`requests.dialog.penalty.moralTypes.${pv}` as any)}
                      </button>
                    ))}
                  </div>
                </div>
                )}

                {penaltyCategory === "MATERIAL" && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t("requests.dialog.penalty.deductionDaysLabel")}</label>
                    <div className="flex flex-wrap gap-2">
                      {PENALTY_DAYS_OPTIONS.map((d) => (
                        <button key={d} type="button"
                          onClick={() => setPenaltyDays(String(d))}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${penaltyDays === String(d) ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 hover:border-primary/50"}`}
                        >
                          {d} {t("requests.dialog.penalty.dayUnit")}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-amber-600">{t("requests.dialog.penalty.deductionNote", { days: penaltyDays || "?" })}</p>
                  </div>
                )}

                <FormField control={form.control} name="violationDescription" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("requests.dialog.penalty.violationLabel")}</FormLabel>
                    <FormControl><Textarea {...field} rows={3} placeholder={t("requests.dialog.penalty.violationPlaceholder")} /></FormControl>
                  </FormItem>
                )} />
              </div>
            )}

            {/* ── OVERTIME ── */}
            {selectedType === "OVERTIME" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                {isManager && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{t("requests.dialog.overtime.overtimeSub")}</span>
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
                        {t(`requests.dialog.overtime.types.${sub}` as any)}
                      </button>
                    ))}
                  </div>
                )}
                {overtimeSubType === "OVERTIME_EMPLOYEE" && (
                  <>
                    <p className="text-xs text-muted-foreground">{t("requests.dialog.overtime.todayNote")}</p>
                    <FormField control={form.control} name="overtimeDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("requests.dialog.overtime.assignmentDate")}</FormLabel>
                        <FormControl><Input {...field} type="date" /></FormControl>
                      </FormItem>
                    )} />
                  </>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="startTime" render={({ field }) => (
                    <FormItem><FormLabel>{t("requests.dialog.overtime.startTime")}</FormLabel><FormControl><Input {...field} type="time" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="endTime" render={({ field }) => (
                    <FormItem><FormLabel>{t("requests.dialog.overtime.endTime")}</FormLabel><FormControl><Input {...field} type="time" /></FormControl></FormItem>
                  )} />
                </div>
                {previewHours !== null && (
                  <p className="text-xs text-muted-foreground text-left">{t("requests.dialog.overtime.totalHours", { hours: previewHours })}</p>
                )}
                {overtimeSubType === "OVERTIME_EMPLOYEE" ? (
                  <FormField control={form.control} name="tasks" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("requests.dialog.overtime.purposeLabel")}</FormLabel>
                      <FormControl><Textarea {...field} rows={2} placeholder={t("requests.dialog.overtime.purposePlaceholder")} /></FormControl>
                    </FormItem>
                  )} />
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="overtimeStartDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("requests.dialog.overtime.startDate")}</FormLabel>
                          <FormControl><Input {...field} type="date" /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="overtimeEndDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("requests.dialog.overtime.endDate")}</FormLabel>
                          <FormControl><Input {...field} type="date" /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                    {previewOvertimeDays !== null && (
                      <p className="text-xs text-muted-foreground text-left">{t("requests.dialog.overtime.totalDays", { days: previewOvertimeDays })}</p>
                    )}
                    <FormField control={form.control} name="purpose" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("requests.dialog.overtime.purposeLabel")}</FormLabel>
                        <FormControl><Textarea {...field} rows={2} placeholder={t("requests.dialog.overtime.purposePlaceholder")} /></FormControl>
                      </FormItem>
                    )} />
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {t("requests.dialog.overtime.assignedEmployees")}
                        {overtimeManagerEmployeeIds.length > 0 && (
                          <span className="mr-1 text-xs text-muted-foreground">{t("requests.dialog.overtime.selectedCount", { count: overtimeManagerEmployeeIds.length })}</span>
                        )}
                      </label>
                      {Array.isArray(subordinatesData) && subordinatesData.length === 0 && (
                        <p className="text-xs text-muted-foreground">{t("requests.dialog.overtime.noSubordinates")}</p>
                      )}
                      <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                        {(Array.isArray(subordinatesData) ? subordinatesData : []).map((emp: any) => {
                          const sel = overtimeManagerEmployeeIds.includes(emp.id);
                          return (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => setOvertimeManagerEmployeeIds((prev) =>
                                sel ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]
                              )}
                              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                                sel
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
                    <FormLabel>{t("requests.dialog.mission.typeLabel")}</FormLabel>
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("requests.dialog.choose")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="INTERNAL">{t("requests.dialog.mission.internal")}</SelectItem>
                        <SelectItem value="EXTERNAL">{t("requests.dialog.mission.external")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="missionStartDate" render={({ field }) => (
                    <FormItem><FormLabel>{t("requests.dialog.mission.startDate")}</FormLabel><FormControl><Input {...field} type="date" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="missionEndDate" render={({ field }) => (
                    <FormItem><FormLabel>{t("requests.dialog.mission.endDate")}</FormLabel><FormControl><Input {...field} type="date" /></FormControl></FormItem>
                  )} />
                </div>
                {previewMissionDays !== null && (
                  <p className="text-xs text-muted-foreground text-left">{t("requests.dialog.mission.totalDays", { days: previewMissionDays })}</p>
                )}
                <FormField control={form.control} name="destination" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("requests.dialog.mission.destination")}</FormLabel>
                    <FormControl><Input {...field} placeholder={t("requests.dialog.mission.destinationPlaceholder")} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="missionReason" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("requests.dialog.mission.reasonLabel")}</FormLabel>
                    <FormControl><Textarea {...field} rows={2} placeholder={t("requests.dialog.mission.reasonPlaceholder")} /></FormControl>
                  </FormItem>
                )} />
              </div>
            )}

            {/* ── DELEGATION ── */}
            {selectedType === "DELEGATION" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <FormField control={form.control} name="delegationType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("requests.dialog.delegation.typeLabel")}</FormLabel>
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("requests.dialog.choose")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="FULL">{t("requests.dialog.delegation.full")}</SelectItem>
                        <SelectItem value="PARTIAL">{t("requests.dialog.delegation.partial")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="delegationStartDate" render={({ field }) => (
                    <FormItem><FormLabel>{t("requests.dialog.delegation.startDate")}</FormLabel><FormControl><Input {...field} type="date" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="delegationEndDate" render={({ field }) => (
                    <FormItem><FormLabel>{t("requests.dialog.delegation.endDate")}</FormLabel><FormControl><Input {...field} type="date" /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="delegateEmployeeId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("requests.dialog.delegation.delegateEmployee")}</FormLabel>
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("requests.dialog.chooseEmployee")} /></SelectTrigger></FormControl>
                      <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstNameAr} {e.lastNameAr}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="delegateJobTitle" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("requests.dialog.delegation.delegateTitle")}</FormLabel>
                    <FormControl><Input {...field} placeholder={t("requests.dialog.delegation.titlePlaceholder")} /></FormControl>
                  </FormItem>
                )} />
              </div>
            )}

            {/* ── HIRING_REQUEST ── */}
            {selectedType === "HIRING_REQUEST" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{t("requests.dialog.hiring.positionsTitle")}</p>
                  {hiringPositions.length < 10 && (
                    <Button type="button" variant="outline" size="sm" className="gap-1"
                      onClick={() => setHiringPositions((a) => [...a, { departmentId: "", jobTitle: "", count: "1", reason: "" }])}>
                      <Plus className="h-3.5 w-3.5" />{t("requests.dialog.hiring.addPosition")}
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
                        <label className="text-xs font-medium">{t("requests.dialog.hiring.deptLabel")}</label>
                        <Select value={pos.departmentId} onValueChange={(v) => setHiringPositions((a) => a.map((x, j) => j === i ? { ...x, departmentId: v } : x))}>
                          <SelectTrigger><SelectValue placeholder={t("requests.dialog.choose")} /></SelectTrigger>
                          <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.nameAr}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">{t("requests.dialog.hiring.vacancies")}</label>
                        <Input type="number" min={1} value={pos.count}
                          onChange={(e) => setHiringPositions((a) => a.map((x, j) => j === i ? { ...x, count: e.target.value } : x))} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">{t("requests.dialog.hiring.jobTitle")}</label>
                      <Input value={pos.jobTitle} placeholder={t("requests.dialog.hiring.jobTitlePlaceholder")}
                        onChange={(e) => setHiringPositions((a) => a.map((x, j) => j === i ? { ...x, jobTitle: e.target.value } : x))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">{t("requests.dialog.hiring.reasonLabel")}</label>
                      <Input value={pos.reason} placeholder={t("requests.dialog.hiring.reasonPlaceholder")}
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
                    <p className="text-sm font-medium">{t("requests.dialog.reward.employeesTitle")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("requests.dialog.reward.autoAddNote")}</p>
                  </div>
                  {rewardEmployees.length < 10 && (
                    <Button type="button" variant="outline" size="sm" className="gap-1"
                      onClick={() => setRewardEmployees((a) => [...a, { employeeId: "", category: "MORAL", rewardType: "", amount: "", reason: "" }])}>
                      <Plus className="h-3.5 w-3.5" />{t("requests.dialog.reward.addEmployee")}
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
                      <label className="text-xs font-medium">{t("requests.dialog.reward.employeeLabel")}</label>
                      <Select value={emp.employeeId} onValueChange={(v) => setRewardEmployees((a) => a.map((x, j) => j === i ? { ...x, employeeId: v } : x))}>
                        <SelectTrigger><SelectValue placeholder={t("requests.dialog.chooseEmployee")} /></SelectTrigger>
                        <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstNameAr} {e.lastNameAr}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">{t("requests.dialog.reward.categoryLabel")}</label>
                      <div className="flex gap-2">
                        {(["MORAL", "MATERIAL"] as const).map((c) => (
                          <button key={c} type="button"
                            onClick={() => setRewardEmployees((a) => a.map((x, j) => j === i ? { ...x, category: c, amount: "" } : x))}
                            className={`px-3 py-1 rounded-full text-xs border transition-colors ${emp.category === c ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 hover:border-primary/50"}`}
                          >
                            {c === "MORAL" ? t("requests.dialog.reward.categoryMoral") : t("requests.dialog.reward.categoryMaterial")}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={`grid gap-2 ${emp.category === "MATERIAL" ? "grid-cols-2" : "grid-cols-1"}`}>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">{t("requests.dialog.reward.rewardTypeLabel")}</label>
                        <Input value={emp.rewardType} placeholder={t("requests.dialog.reward.rewardTypePlaceholder")}
                          onChange={(e) => setRewardEmployees((a) => a.map((x, j) => j === i ? { ...x, rewardType: e.target.value } : x))} />
                      </div>
                      {emp.category === "MATERIAL" && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium">{t("requests.dialog.reward.amountLabel")}</label>
                          <Input type="number" min={0} value={emp.amount}
                            onChange={(e) => setRewardEmployees((a) => a.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">{t("requests.dialog.reward.reasonLabel")}</label>
                      <Input value={emp.reason} placeholder={t("requests.dialog.reward.reasonPlaceholder")}
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
                    <FormLabel>{t("requests.dialog.complaint.descLabel")}</FormLabel>
                    <FormControl><Textarea {...field} rows={4} placeholder={t("requests.dialog.complaint.descPlaceholder")} /></FormControl>
                  </FormItem>
                )} />
              </div>
            )}

            {/* ── WORK_ACCIDENT ── */}
            {selectedType === "WORK_ACCIDENT" && (
              <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
                <p className="text-sm font-semibold">{t("requests.dialog.workAccident.sectionTitle")}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t("requests.dialog.workAccident.locationLabel")}</label>
                    <Input value={workAccident.incidentLocation} placeholder={t("requests.dialog.workAccident.locationPlaceholder")}
                      onChange={(e) => setWorkAccident((p) => ({ ...p, incidentLocation: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t("requests.dialog.workAccident.incidentTypeLabel")}</label>
                    <select
                      value={workAccident.incidentType}
                      onChange={(e) => setWorkAccident((p) => ({ ...p, incidentType: e.target.value }))}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">{t("requests.dialog.choose")}</option>
                      {INCIDENT_TYPE_VALUES.map((v) => <option key={v} value={v}>{t(`requests.dialog.workAccident.incidentTypes.${v}` as any)}</option>)}
                    </select>
                  </div>
                </div>

                {workAccident.incidentType === "OTHER" && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t("requests.dialog.workAccident.incidentTypeOtherLabel")}</label>
                    <Input value={workAccident.incidentTypeOther} placeholder={t("requests.dialog.workAccident.incidentTypeOtherPlaceholder")}
                      onChange={(e) => setWorkAccident((p) => ({ ...p, incidentTypeOther: e.target.value }))} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t("requests.dialog.workAccident.affectedName")}</label>
                    <Input value={workAccident.affectedPersonName} placeholder={t("requests.dialog.workAccident.affectedNamePlaceholder")}
                      onChange={(e) => setWorkAccident((p) => ({ ...p, affectedPersonName: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t("requests.dialog.workAccident.affectedTitle")}</label>
                    <Input value={workAccident.affectedPersonJobTitle} placeholder={t("requests.dialog.workAccident.affectedTitlePlaceholder")}
                      onChange={(e) => setWorkAccident((p) => ({ ...p, affectedPersonJobTitle: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t("requests.dialog.workAccident.affectedId")}</label>
                    <Input value={workAccident.affectedPersonId} placeholder={t("requests.dialog.workAccident.affectedIdPlaceholder")}
                      onChange={(e) => setWorkAccident((p) => ({ ...p, affectedPersonId: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t("requests.dialog.workAccident.incidentTime")}</label>
                    <Input type="time" value={workAccident.incidentTime}
                      onChange={(e) => setWorkAccident((p) => ({ ...p, incidentTime: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t("requests.dialog.workAccident.amPm")}</label>
                    <select
                      value={workAccident.incidentTimeOfDay}
                      onChange={(e) => setWorkAccident((p) => ({ ...p, incidentTimeOfDay: e.target.value }))}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">{t("requests.dialog.workAccident.detailsLabel")}</label>
                  <textarea
                    value={workAccident.incidentDetails}
                    rows={3}
                    placeholder={t("requests.dialog.workAccident.detailsPlaceholder")}
                    onChange={(e) => setWorkAccident((p) => ({ ...p, incidentDetails: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium">{t("requests.dialog.workAccident.contributingFactorsLabel")}</label>
                  <div className="flex flex-wrap gap-2">
                    {CONTRIBUTING_FACTOR_VALUES.map((fv) => {
                      const checked = workAccident.contributingFactors.includes(fv);
                      return (
                        <button key={fv} type="button"
                          onClick={() => setWorkAccident((p) => ({
                            ...p,
                            contributingFactors: checked
                              ? p.contributingFactors.filter((x) => x !== fv)
                              : [...p.contributingFactors, fv],
                          }))}
                          className={`px-3 py-1 rounded-full text-xs border transition-colors ${checked ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 hover:border-primary/50"}`}
                        >
                          {t(`requests.dialog.workAccident.factorTypes.${fv}` as any)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 rounded border p-3">
                  <p className="text-xs font-semibold">{t("requests.dialog.workAccident.immediateActionsTitle")}</p>
                  <div className="space-y-2">
                    {[
                      { key: "firstAid", labelKey: "requests.dialog.workAccident.firstAid" },
                      { key: "hospitalTransfer", labelKey: "requests.dialog.workAccident.hospitalTransfer" },
                      { key: "supervisorNotified", labelKey: "requests.dialog.workAccident.supervisorNotified" },
                    ].map(({ key, labelKey }) => (
                      <div key={key}>
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <input type="checkbox"
                            checked={(workAccident.immediateActions as any)[key]}
                            onChange={(e) => setWorkAccident((p) => ({
                              ...p, immediateActions: { ...p.immediateActions, [key]: e.target.checked },
                            }))}
                          />
                          {t(labelKey as any)}
                        </label>
                        {key === "firstAid" && workAccident.immediateActions.firstAid && (
                          <Input className="mt-1" placeholder={t("requests.dialog.workAccident.firstAidPlaceholder")}
                            value={workAccident.immediateActions.firstAidBy}
                            onChange={(e) => setWorkAccident((p) => ({ ...p, immediateActions: { ...p.immediateActions, firstAidBy: e.target.value } }))} />
                        )}
                        {key === "hospitalTransfer" && workAccident.immediateActions.hospitalTransfer && (
                          <Input className="mt-1" placeholder={t("requests.dialog.workAccident.hospitalPlaceholder")}
                            value={workAccident.immediateActions.hospitalName}
                            onChange={(e) => setWorkAccident((p) => ({ ...p, immediateActions: { ...p.immediateActions, hospitalName: e.target.value } }))} />
                        )}
                        {key === "supervisorNotified" && workAccident.immediateActions.supervisorNotified && (
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <Input placeholder={t("requests.dialog.workAccident.supervisorNamePlaceholder")}
                              value={workAccident.immediateActions.supervisorName}
                              onChange={(e) => setWorkAccident((p) => ({ ...p, immediateActions: { ...p.immediateActions, supervisorName: e.target.value } }))} />
                            <Input placeholder={t("requests.dialog.workAccident.supervisorTimePlaceholder")}
                              value={workAccident.immediateActions.supervisorNotifiedTime}
                              onChange={(e) => setWorkAccident((p) => ({ ...p, immediateActions: { ...p.immediateActions, supervisorNotifiedTime: e.target.value } }))} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium">{t("requests.dialog.workAccident.preventionLabel")}</label>
                  <textarea
                    value={workAccident.preventionRecommendations}
                    rows={2}
                    placeholder={t("requests.dialog.workAccident.preventionPlaceholder")}
                    onChange={(e) => setWorkAccident((p) => ({ ...p, preventionRecommendations: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  />
                </div>
              </div>
            )}

            {/* ── REMOTE_WORK ── */}
            {selectedType === "REMOTE_WORK" && (
              <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
                <p className="text-sm font-semibold">{t("requests.dialog.remoteWork.sectionTitle")}</p>

                <div className="space-y-1">
                  <label className="text-xs font-medium">{t("requests.dialog.remoteWork.typeLabel")}</label>
                  <div className="flex gap-2">
                    {REMOTE_WORK_TYPE_VALUES.map((rv) => (
                      <button key={rv} type="button"
                        onClick={() => setRemoteWork((p) => ({ ...p, remoteWorkType: rv }))}
                        className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${remoteWork.remoteWorkType === rv ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 hover:border-primary/50"}`}
                      >
                        {t(`requests.dialog.remoteWork.workTypes.${rv}` as any)}
                      </button>
                    ))}
                  </div>
                </div>

                {remoteWork.remoteWorkType === "TEMPORARY" && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t("requests.dialog.remoteWork.temporaryDaysLabel")}</label>
                    <Input type="number" min={1} value={remoteWork.temporaryDays} placeholder={t("requests.dialog.remoteWork.temporaryDaysPlaceholder")}
                      onChange={(e) => setRemoteWork((p) => ({ ...p, temporaryDays: e.target.value }))} />
                  </div>
                )}

                {remoteWork.remoteWorkType === "EMERGENCY" && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t("requests.dialog.remoteWork.emergencyReasonLabel")}</label>
                    <Input value={remoteWork.emergencyReason} placeholder={t("requests.dialog.remoteWork.emergencyReasonPlaceholder")}
                      onChange={(e) => setRemoteWork((p) => ({ ...p, emergencyReason: e.target.value }))} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t("requests.dialog.remoteWork.startDate")}</label>
                    <Input type="date" value={remoteWork.startDate}
                      onChange={(e) => setRemoteWork((p) => ({ ...p, startDate: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t("requests.dialog.remoteWork.endDate")}</label>
                    <Input type="date" value={remoteWork.endDate}
                      onChange={(e) => setRemoteWork((p) => ({ ...p, endDate: e.target.value }))} />
                  </div>
                </div>

                {remoteWork.remoteWorkType === "REGULAR" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">{t("requests.dialog.remoteWork.weeklyDays")}</label>
                      <Input type="number" min={1} max={7} value={remoteWork.weeklyDaysCount}
                        onChange={(e) => setRemoteWork((p) => ({ ...p, weeklyDaysCount: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">{t("requests.dialog.remoteWork.proposedDays")}</label>
                      <Input value={remoteWork.proposedDays} placeholder={t("requests.dialog.remoteWork.proposedDaysPlaceholder")}
                        onChange={(e) => setRemoteWork((p) => ({ ...p, proposedDays: e.target.value }))} />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-medium">{t("requests.dialog.remoteWork.justificationsLabel")}</label>
                  <div className="flex flex-wrap gap-2">
                    {JUSTIFICATION_OPTION_VALUES.map((jv) => {
                      const checked = remoteWork.justification.includes(jv);
                      return (
                        <button key={jv} type="button"
                          onClick={() => setRemoteWork((p) => ({
                            ...p,
                            justification: checked
                              ? p.justification.filter((x) => x !== jv)
                              : [...p.justification, jv],
                          }))}
                          className={`px-3 py-1 rounded-full text-xs border transition-colors ${checked ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 hover:border-primary/50"}`}
                        >
                          {t(`requests.dialog.remoteWork.justificationOptions.${jv}` as any)}
                        </button>
                      );
                    })}
                  </div>
                  {remoteWork.justification.includes("OTHER") && (
                    <Input value={remoteWork.justificationOther} placeholder={t("requests.dialog.remoteWork.justificationOtherPlaceholder")}
                      onChange={(e) => setRemoteWork((p) => ({ ...p, justificationOther: e.target.value }))} />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">{t("requests.dialog.remoteWork.tasksLabel")}</label>
                    <button type="button"
                      onClick={() => setRemoteWork((p) => ({ ...p, tasks: [...p.tasks, ""] }))}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> {t("requests.dialog.remoteWork.addTask")}
                    </button>
                  </div>
                  {remoteWork.tasks.map((task, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input value={task} placeholder={t("requests.dialog.remoteWork.taskPlaceholder", { number: i + 1 })}
                        onChange={(e) => setRemoteWork((p) => ({ ...p, tasks: p.tasks.map((tk, j) => j === i ? e.target.value : tk) }))} />
                      {remoteWork.tasks.length > 1 && (
                        <button type="button" onClick={() => setRemoteWork((p) => ({ ...p, tasks: p.tasks.filter((_, j) => j !== i) }))}>
                          <X className="h-4 w-4 text-destructive" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium">{t("requests.dialog.remoteWork.toolsLabel")}</label>
                  <div className="flex flex-wrap gap-2">
                    {REQUIRED_TOOL_VALUES.map((tv) => {
                      const checked = remoteWork.requiredTools.includes(tv);
                      return (
                        <button key={tv} type="button"
                          onClick={() => setRemoteWork((p) => ({
                            ...p,
                            requiredTools: checked
                              ? p.requiredTools.filter((x) => x !== tv)
                              : [...p.requiredTools, tv],
                          }))}
                          className={`px-3 py-1 rounded-full text-xs border transition-colors ${checked ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 hover:border-primary/50"}`}
                        >
                          {t(`requests.dialog.remoteWork.requiredTools.${tv}` as any)}
                        </button>
                      );
                    })}
                  </div>
                  {remoteWork.requiredTools.includes("SPECIFIC_SOFTWARE") && (
                    <Input value={remoteWork.specificSoftware} placeholder={t("requests.dialog.remoteWork.specificSoftwarePlaceholder")}
                      onChange={(e) => setRemoteWork((p) => ({ ...p, specificSoftware: e.target.value }))} />
                  )}
                </div>
              </div>
            )}

            {/* ── MAINTENANCE ── */}
            {selectedType === "MAINTENANCE" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t("maintenance.fields.workLocation")}</label>
                    <select
                      value={maintenanceData.workLocation}
                      onChange={(e) => setMaintenanceData((p) => ({ ...p, workLocation: e.target.value }))}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {MAINTENANCE_WORK_LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>{t(`maintenance.workLocations.${loc}` as any)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t("maintenance.fields.priority")}</label>
                    <select
                      value={maintenanceData.priority}
                      onChange={(e) => setMaintenanceData((p) => ({ ...p, priority: e.target.value }))}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {MAINTENANCE_PRIORITIES.map((p) => (
                        <option key={p} value={p}>{t(`maintenance.priorities.${p}` as any)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">{t("maintenance.fields.assetType")}</label>
                  <Input
                    value={maintenanceData.assetType}
                    placeholder={t("maintenance.fields.assetTypePlaceholder")}
                    onChange={(e) => setMaintenanceData((p) => ({ ...p, assetType: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t("maintenance.fields.assetNumber")}</label>
                    <Input
                      value={maintenanceData.assetNumber}
                      placeholder={t("maintenance.fields.assetNumberPlaceholder")}
                      onChange={(e) => setMaintenanceData((p) => ({ ...p, assetNumber: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">{t("maintenance.fields.brandModel")}</label>
                    <Input
                      value={maintenanceData.brandModel}
                      placeholder={t("maintenance.fields.brandModelPlaceholder")}
                      onChange={(e) => setMaintenanceData((p) => ({ ...p, brandModel: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">{t("maintenance.fields.faultDescription")}</label>
                  <textarea
                    value={maintenanceData.faultDescription}
                    rows={3}
                    placeholder={t("maintenance.fields.faultDescriptionPlaceholder")}
                    onChange={(e) => setMaintenanceData((p) => ({ ...p, faultDescription: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  />
                </div>
              </div>
            )}

            {selectedType !== "MAINTENANCE" && (
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{selectedType === "DELEGATION" && watchedDelegationType === "PARTIAL" ? "التفويض بالصلاحيات التالية" : `${t("requests.fields.notes")} (${t("common.optional")})`}</FormLabel>
                    <FormControl><Textarea {...field} rows={2} /></FormControl>
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              {selectedType !== "MAINTENANCE" && (
                <Button type="submit" variant="outline" disabled={isLoading} onClick={() => setSubmitMode("draft")}>
                  {t("requests.saveAsDraft")}
                </Button>
              )}
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
