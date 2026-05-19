"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useCreateWorkSchedule, useUpdateWorkSchedule } from "@/lib/hooks/use-work-schedules";
import { WorkSchedule } from "@/lib/api/work-schedules";

const formSchema = z.object({
  code: z.string().optional(),
  nameAr: z.string().min(1, "الاسم بالعربي مطلوب"),
  nameEn: z.string().min(1, "الاسم بالإنجليزي مطلوب"),
  workStartTime: z.string().min(1, "وقت بداية العمل مطلوب"),
  workEndTime: z.string().min(1, "وقت نهاية العمل مطلوب"),
  workDays: z.array(z.number()).min(1, "يجب اختيار يوم واحد على الأقل"),
  lateToleranceMin: z.number().min(0).optional(),
  earlyLeaveToleranceMin: z.number().min(0).optional(),
  isActive: z.boolean(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface WorkScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: WorkSchedule | null;
}

const weekDays = [
  { value: 0, label: "الأحد" },
  { value: 1, label: "الإثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
  { value: 5, label: "الجمعة" },
  { value: 6, label: "السبت" },
];

function parseWorkDays(workDays: any): number[] {
  if (Array.isArray(workDays)) return workDays;
  if (!workDays) return [];
  try { return JSON.parse(workDays); } catch { return []; }
}

export function WorkScheduleDialog({ open, onOpenChange, schedule }: WorkScheduleDialogProps) {
  const t = useTranslations();
  const createSchedule = useCreateWorkSchedule();
  const updateSchedule = useUpdateWorkSchedule();

  const defaultValues: FormData = {
    code: schedule?.code || "",
    nameAr: schedule?.nameAr || "",
    nameEn: schedule?.nameEn || "",
    workStartTime: schedule?.workStartTime || "",
    workEndTime: schedule?.workEndTime || "",
    workDays: parseWorkDays(schedule?.workDays),
    lateToleranceMin: schedule?.lateToleranceMin ?? 0,
    earlyLeaveToleranceMin: schedule?.earlyLeaveToleranceMin ?? 0,
    isActive: schedule?.isActive ?? true,
    description: schedule?.description || "",
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, schedule]);

  const onSubmit = async (data: FormData) => {
    try {
      const submitData: any = {
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        workStartTime: data.workStartTime,
        workEndTime: data.workEndTime,
        workDays: JSON.stringify(data.workDays),
        lateToleranceMin: Number(data.lateToleranceMin ?? 0),
        earlyLeaveToleranceMin: Number(data.earlyLeaveToleranceMin ?? 0),
        isActive: Boolean(data.isActive),
      };

      if (data.code) submitData.code = data.code;
      if (data.description) submitData.description = data.description;

      if (schedule) {
        await updateSchedule.mutateAsync({ id: schedule.id, data: submitData });
      } else {
        await createSchedule.mutateAsync(submitData);
      }
      onOpenChange(false);
    } catch {
      // handled by mutation
    }
  };

  const isPending = createSchedule.isPending || updateSchedule.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {schedule ? "تعديل جدول عمل" : "إضافة جدول عمل"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* حقل نشط */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>نشط</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nameAr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم بالعربي</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="دوام كامل" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nameEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم بالإنجليزي</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Full Time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* حقول الوقت */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="workStartTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>وقت بداية العمل</FormLabel>
                    <FormControl>
                      <Input {...field} type="time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="workEndTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>وقت نهاية العمل</FormLabel>
                    <FormControl>
                      <Input {...field} type="time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="workDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>أيام العمل</FormLabel>
                  <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          checked={field.value?.includes(day.value)}
                          onCheckedChange={(checked) => {
                            const current = field.value || [];
                            field.onChange(
                              checked
                                ? [...current, day.value].sort()
                                : current.filter((v) => v !== day.value)
                            );
                          }}
                        />
                        <label className="text-sm">{day.label}</label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* تسامح التأخير */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lateToleranceMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تسامح التأخير (دقيقة)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="earlyLeaveToleranceMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تسامح الخروج المبكر (دقيقة)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الوصف (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="وصف جدول العمل..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                {t("common.save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
