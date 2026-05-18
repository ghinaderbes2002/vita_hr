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
import { useCreateSalesCommission } from "@/lib/hooks/use-sales-commissions";
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

const schema = z.object({
  employeeId: z.string().min(1, "الموظف مطلوب"),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  amount: z.coerce.number().positive("يجب أن يكون المبلغ أكبر من 0"),
  description: z.string().min(1, "الوصف مطلوب"),
  salesReference: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmployeeId?: string;
  defaultYear?: number;
  defaultMonth?: number;
}

export function CreateCommissionDialog({
  open,
  onOpenChange,
  defaultEmployeeId,
  defaultYear,
  defaultMonth,
}: Props) {
  const now = new Date();
  const create = useCreateSalesCommission();
  const { data: empData } = useEmployees({ limit: 500 });
  const employees: any[] = (empData as any)?.data?.items || (empData as any)?.items || [];

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      employeeId: defaultEmployeeId || "",
      year: defaultYear || now.getFullYear(),
      month: defaultMonth || now.getMonth() + 1,
      amount: 0,
      description: "",
      salesReference: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        employeeId: defaultEmployeeId || "",
        year: defaultYear || now.getFullYear(),
        month: defaultMonth || now.getMonth() + 1,
        amount: 0,
        description: "",
        salesReference: "",
      });
    }
  }, [open, defaultEmployeeId, defaultYear, defaultMonth]);

  const onSubmit = async (data: FormData) => {
    try {
      await create.mutateAsync({
        employeeId: data.employeeId,
        year: data.year,
        month: data.month,
        amount: data.amount,
        description: data.description,
        salesReference: data.salesReference || undefined,
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
          <DialogTitle>إضافة عمولة مبيعات</DialogTitle>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="year" render={({ field }) => (
                <FormItem>
                  <FormLabel>السنة</FormLabel>
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

              <FormField control={form.control} name="month" render={({ field }) => (
                <FormItem>
                  <FormLabel>الشهر</FormLabel>
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

            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel>المبلغ ($)</FormLabel>
                <FormControl><Input type="number" min={0} step={0.01} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>الوصف</FormLabel>
                <FormControl><Textarea rows={2} placeholder="وصف العمولة..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="salesReference" render={({ field }) => (
              <FormItem>
                <FormLabel>رقم المرجع (اختياري)</FormLabel>
                <FormControl><Input placeholder="رقم الفاتورة أو المرجع..." {...field} /></FormControl>
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
