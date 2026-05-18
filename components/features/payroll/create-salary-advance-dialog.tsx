"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useCreateSalaryAdvance } from "@/lib/hooks/use-salary-advances";
import { useEmployees } from "@/lib/hooks/use-employees";

const MONTHS = [
  { value: 1, label: "يناير" },
  { value: 2, label: "فبراير" },
  { value: 3, label: "مارس" },
  { value: 4, label: "أبريل" },
  { value: 5, label: "مايو" },
  { value: 6, label: "يونيو" },
  { value: 7, label: "يوليو" },
  { value: 8, label: "أغسطس" },
  { value: 9, label: "سبتمبر" },
  { value: 10, label: "أكتوبر" },
  { value: 11, label: "نوفمبر" },
  { value: 12, label: "ديسمبر" },
];

const schema = z
  .object({
    employeeId: z.string().min(1, "الموظف مطلوب"),
    totalAmount: z.coerce.number().positive("يجب أن يكون المبلغ أكبر من 0"),
    totalInstallments: z.coerce.number().int().positive("يجب أن يكون عدد الأقساط أكبر من 0"),
    installmentAmount: z.coerce.number().positive("يجب أن يكون القسط أكبر من 0"),
    startYear: z.coerce.number().int().min(2000).max(2100),
    startMonth: z.coerce.number().int().min(1).max(12),
    reason: z.string().optional(),
  })
  .refine((d) => d.installmentAmount <= d.totalAmount, {
    message: "قيمة القسط لا يمكن أن تتجاوز المبلغ الإجمالي",
    path: ["installmentAmount"],
  });

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmployeeId?: string;
}

export function CreateSalaryAdvanceDialog({ open, onOpenChange, defaultEmployeeId }: Props) {
  const now = new Date();
  const create = useCreateSalaryAdvance();
  const { data: empData } = useEmployees({ limit: 500 });
  const employees: any[] = (empData as any)?.data?.items || (empData as any)?.items || [];

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      employeeId: defaultEmployeeId || "",
      totalAmount: 0,
      totalInstallments: 1,
      installmentAmount: 0,
      startYear: now.getFullYear(),
      startMonth: now.getMonth() + 1,
      reason: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        employeeId: defaultEmployeeId || "",
        totalAmount: 0,
        totalInstallments: 1,
        installmentAmount: 0,
        startYear: now.getFullYear(),
        startMonth: now.getMonth() + 1,
        reason: "",
      });
    }
  }, [open, defaultEmployeeId]);

  const totalAmount = form.watch("totalAmount");
  const totalInstallments = form.watch("totalInstallments");

  const suggestedInstallment =
    totalAmount > 0 && totalInstallments > 0
      ? +(totalAmount / totalInstallments).toFixed(2)
      : 0;

  const onSubmit = async (data: FormData) => {
    try {
      await create.mutateAsync({
        employeeId: data.employeeId,
        totalAmount: data.totalAmount,
        totalInstallments: data.totalInstallments,
        installmentAmount: data.installmentAmount,
        startYear: data.startYear,
        startMonth: data.startMonth,
        reason: data.reason || undefined,
      });
      onOpenChange(false);
    } catch {
      // handled by mutation
    }
  };

  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إضافة سلفة راتب</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {!defaultEmployeeId && (
              <FormField control={form.control} name="employeeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>الموظف</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="اختر موظفاً" /></SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {employees.map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstNameAr} {emp.lastNameAr}
                          {emp.employeeNumber && (
                            <span className="text-muted-foreground mr-2">— {emp.employeeNumber}</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="totalAmount" render={({ field }) => (
              <FormItem>
                <FormLabel>المبلغ الإجمالي ($)</FormLabel>
                <FormControl><Input type="number" min={0} step={0.01} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="totalInstallments" render={({ field }) => (
                <FormItem>
                  <FormLabel>عدد الأقساط</FormLabel>
                  <FormControl><Input type="number" min={1} step={1} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="installmentAmount" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    قيمة القسط ($)
                    {suggestedInstallment > 0 && (
                      <button
                        type="button"
                        className="mr-2 text-xs text-primary underline"
                        onClick={() => form.setValue("installmentAmount", suggestedInstallment)}
                      >
                        (مقترح: {suggestedInstallment})
                      </button>
                    )}
                  </FormLabel>
                  <FormControl><Input type="number" min={0} step={0.01} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="startYear" render={({ field }) => (
                <FormItem>
                  <FormLabel>سنة البداية</FormLabel>
                  <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="startMonth" render={({ field }) => (
                <FormItem>
                  <FormLabel>شهر البداية</FormLabel>
                  <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem>
                <FormLabel>السبب (اختياري)</FormLabel>
                <FormControl><Textarea rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                حفظ
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
