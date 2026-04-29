"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCreateLeaveType, useUpdateLeaveType } from "@/lib/hooks/use-leave-types";
import { LeaveType } from "@/types";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { SalaryDeductionRule } from "@/lib/api/leave-types";

const formSchema = z.object({
  code: z.string().optional(),
  nameAr: z.string().min(1, "الاسم بالعربي مطلوب"),
  nameEn: z.string().min(1, "الاسم بالإنجليزي مطلوب"),
  defaultDays: z.number().min(0),
  isPaid: z.boolean(),
  requiresApproval: z.boolean(),
  allowHalfDay: z.boolean(),
  color: z.string().optional(),
  minServiceMonths: z.number().nullable().optional(),
  maxLifetimeUsage: z.number().nullable().optional(),
  maxHoursPerMonth: z.number().nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface LeaveTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaveType?: LeaveType;
}

export function LeaveTypeDialog({ open, onOpenChange, leaveType }: LeaveTypeDialogProps) {
  const t = useTranslations();
  const isEdit = !!leaveType;

  const createLeaveType = useCreateLeaveType();
  const updateLeaveType = useUpdateLeaveType();

  const [deductionRules, setDeductionRules] = useState<SalaryDeductionRule[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      nameAr: "",
      nameEn: "",
      defaultDays: 0,
      isPaid: true,
      requiresApproval: true,
      allowHalfDay: false,
      color: "#3B82F6",
      minServiceMonths: null,
      maxLifetimeUsage: null,
      maxHoursPerMonth: null,
    },
  });

  useEffect(() => {
    if (leaveType) {
      form.reset({
        code: leaveType.code,
        nameAr: leaveType.nameAr,
        nameEn: leaveType.nameEn,
        defaultDays: leaveType.defaultDays,
        isPaid: leaveType.isPaid,
        requiresApproval: leaveType.requiresApproval,
        allowHalfDay: leaveType.allowHalfDay,
        color: leaveType.color || "#3B82F6",
        minServiceMonths: leaveType.minServiceMonths ?? null,
        maxLifetimeUsage: leaveType.maxLifetimeUsage ?? null,
        maxHoursPerMonth: leaveType.maxHoursPerMonth ?? null,
      });
      setDeductionRules(leaveType.salaryDeductionRules ?? []);
    } else {
      form.reset({
        code: "",
        nameAr: "",
        nameEn: "",
        defaultDays: 0,
        isPaid: true,
        requiresApproval: true,
        allowHalfDay: false,
        color: "#3B82F6",
        minServiceMonths: null,
        maxLifetimeUsage: null,
        maxHoursPerMonth: null,
      });
      setDeductionRules([]);
    }
  }, [leaveType, form]);

  const addRule = () =>
    setDeductionRules((prev) => [...prev, { fromDay: 1, toDay: 30, deductionPercent: 0 }]);

  const removeRule = (i: number) =>
    setDeductionRules((prev) => prev.filter((_, idx) => idx !== i));

  const updateRule = (i: number, field: keyof SalaryDeductionRule, value: number) =>
    setDeductionRules((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        code: data.code ?? "",
        minServiceMonths: data.minServiceMonths || null,
        maxLifetimeUsage: data.maxLifetimeUsage || null,
        maxHoursPerMonth: data.maxHoursPerMonth || null,
        salaryDeductionRules: deductionRules.length > 0 ? deductionRules : null,
      };
      if (isEdit) {
        await updateLeaveType.mutateAsync({ id: leaveType.id, data: payload });
      } else {
        await createLeaveType.mutateAsync(payload);
      }
      onOpenChange(false);
      form.reset();
    } catch {
      // Error handled by mutation
    }
  };

  const isLoading = createLeaveType.isPending || updateLeaveType.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("leaveTypes.editLeaveType") : t("leaveTypes.addLeaveType")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* الاسمان */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="nameAr" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("leaveTypes.fields.nameAr")}</FormLabel>
                  <FormControl><Input {...field} placeholder="إجازة سنوية" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="nameEn" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("leaveTypes.fields.nameEn")}</FormLabel>
                  <FormControl><Input {...field} placeholder="Annual Leave" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* الأيام واللون */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="defaultDays" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("leaveTypes.fields.defaultDays")}</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min={0}
                      onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="color" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("leaveTypes.fields.color")}</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input {...field} type="color" className="w-14 h-10 p-1 cursor-pointer" />
                      <Input {...field} placeholder="#3B82F6" className="flex-1" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Switches */}
            <div className="space-y-3">
              {(["isPaid", "requiresApproval", "allowHalfDay"] as const).map((name) => (
                <FormField key={name} control={form.control} name={name} render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="cursor-pointer">{t(`leaveTypes.fields.${name}`)}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value as boolean} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              ))}
            </div>

            {/* شروط الأهلية */}
            <div className="rounded-lg border p-3 space-y-3">
              <p className="text-sm font-medium">شروط الأهلية</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="minServiceMonths" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">الحد الأدنى لأشهر الخدمة</FormLabel>
                    <FormControl>
                      <Input
                        type="number" min={0} placeholder="مثال: 6"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="maxLifetimeUsage" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">الحد الأقصى مدى الحياة</FormLabel>
                    <FormControl>
                      <Input
                        type="number" min={1} placeholder="مثال: 1 للحج"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="maxHoursPerMonth" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">الحد الأقصى للساعات الشهرية (للإجازة الساعية)</FormLabel>
                  <FormControl>
                    <Input
                      type="number" min={0} step={0.5} placeholder="مثال: 2"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* قواعد خصم الراتب */}
            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">قواعد خصم الراتب</p>
                <Button type="button" variant="outline" size="sm" onClick={addRule} className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  إضافة قاعدة
                </Button>
              </div>
              {deductionRules.length === 0 && (
                <p className="text-xs text-muted-foreground">لا توجد قواعد خصم — الإجازة مدفوعة بالكامل</p>
              )}
              {deductionRules.map((rule, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">من اليوم</p>
                    <Input type="number" min={1} value={rule.fromDay}
                      onChange={(e) => updateRule(i, "fromDay", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">إلى اليوم</p>
                    <Input type="number" min={1} value={rule.toDay}
                      onChange={(e) => updateRule(i, "toDay", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">نسبة الخصم %</p>
                    <Input type="number" min={0} max={100} value={rule.deductionPercent}
                      onChange={(e) => updateRule(i, "deductionPercent", Number(e.target.value))} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="text-destructive"
                    onClick={() => removeRule(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                {t("common.save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
