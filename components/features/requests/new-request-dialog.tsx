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
import { RequestType } from "@/types";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const ALL_REQUEST_TYPES: RequestType[] = [
  "TRANSFER", "RESIGNATION", "REWARD", "OTHER",
  "PENALTY_PROPOSAL", "OVERTIME_EMPLOYEE", "OVERTIME_MANAGER",
  "BUSINESS_MISSION", "DELEGATION", "HIRING_REQUEST", "COMPLAINT",
];

// Types that don't need a details section — reason field is enough
const NO_DETAILS_TYPES: RequestType[] = [
  "OTHER",
];

const formSchema = z.object({
  type: z.enum(ALL_REQUEST_TYPES as [RequestType, ...RequestType[]]),
  reason: z.string().min(1, "السبب مطلوب"),
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

interface NewRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewRequestDialog({ open, onOpenChange }: NewRequestDialogProps) {
  const t = useTranslations();
  const [submitMode, setSubmitMode] = useState<"draft" | "submit">("draft");
  const [hiringPositions, setHiringPositions] = useState<HiringPosition[]>([
    { departmentId: "", jobTitle: "", count: "1", reason: "" },
  ]);
  const [rewardEmployees, setRewardEmployees] = useState<RewardEmployee[]>([
    { employeeId: "", rewardType: "", amount: "", reason: "" },
  ]);

  const createRequest = useCreateRequest();
  const submitRequest = useSubmitRequest();
  const { data: deptData } = useDepartments({ limit: 100 });
  const { data: empData } = useEmployees({ limit: 100 });
  const { data: titlesData } = useJobTitles();

  const departments: any[] = (deptData as any)?.data?.items || (deptData as any)?.data || [];
  const employees: any[] = (empData as any)?.data?.items || (empData as any)?.items || [];
  const jobTitles: any[] = Array.isArray(titlesData)
    ? titlesData
    : (titlesData as any)?.data?.items || (titlesData as any)?.data || [];

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { type: "OTHER", reason: "", notes: "" },
  });

  const selectedType = form.watch("type");

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
      case "OVERTIME_EMPLOYEE":
        return {
          overtimeDate: data.overtimeDate,
          startTime: data.startTime,
          endTime: data.endTime,
          totalHours: data.totalHours ? Number(data.totalHours) : undefined,
          tasks: data.tasks,
        };
      case "OVERTIME_MANAGER":
        return {
          overtimeDate: data.overtimeDate,
          startTime: data.startTime,
          endTime: data.endTime,
          totalHours: data.totalHours ? Number(data.totalHours) : undefined,
          purpose: data.purpose,
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
      default:
        return undefined;
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const created = await createRequest.mutateAsync({
        type: data.type,
        reason: data.reason,
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
    } catch {
      // Error handled by mutation
    }
  };

  const isLoading = createRequest.isPending || submitRequest.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-130 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("requests.newRequest")}</DialogTitle>
          <DialogDescription>{t("requests.newRequestDescription")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* نوع الطلب */}
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
                      {ALL_REQUEST_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`requests.types.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* السبب — مطلوب لجميع الأنواع */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("requests.fields.reason")} *</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} placeholder={t("requests.fields.reasonPlaceholder")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ── RESIGNATION ── */}
            {selectedType === "RESIGNATION" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
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

            {/* ── OVERTIME_EMPLOYEE ── */}
            {selectedType === "OVERTIME_EMPLOYEE" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
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
                <FormField control={form.control} name="tasks" render={({ field }) => (
                  <FormItem>
                    <FormLabel>المهام المنجزة *</FormLabel>
                    <FormControl><Textarea {...field} rows={2} placeholder="صف المهام التي أُنجزت..." /></FormControl>
                  </FormItem>
                )} />
              </div>
            )}

            {/* ── OVERTIME_MANAGER ── */}
            {selectedType === "OVERTIME_MANAGER" && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
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
                <FormField control={form.control} name="purpose" render={({ field }) => (
                  <FormItem>
                    <FormLabel>الغرض من العمل الإضافي *</FormLabel>
                    <FormControl><Textarea {...field} rows={2} placeholder="اشرح الغرض..." /></FormControl>
                  </FormItem>
                )} />
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
                  <p className="text-sm font-medium">الموظفون المرشحون للمكافأة *</p>
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
