"use client";

import { useEffect, useState } from "react";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useCreateWorkSchedule, useUpdateWorkSchedule } from "@/lib/hooks/use-work-schedules";
import { WorkSchedule } from "@/lib/api/work-schedules";

const formSchema = z.object({
  code: z.string().min(1, "الكود مطلوب"),
  nameAr: z.string().min(1, "الاسم بالعربي مطلوب"),
  nameEn: z.string().min(1, "الاسم بالإنجليزي مطلوب"),
  workStartTime: z.string().min(1, "وقت بداية العمل مطلوب"),
  workEndTime: z.string().min(1, "وقت نهاية العمل مطلوب"),
  workDays: z.array(z.number()).min(1, "يجب اختيار يوم واحد على الأقل"),
  lateToleranceMin: z.number().min(0, "يجب أن يكون 0 أو أكثر"),
  earlyLeaveToleranceMin: z.number().min(0, "يجب أن يكون 0 أو أكثر"),
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

export function WorkScheduleDialog({ open, onOpenChange, schedule }: WorkScheduleDialogProps) {
  const t = useTranslations();
  const createSchedule = useCreateWorkSchedule();
  const updateSchedule = useUpdateWorkSchedule();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: schedule?.code || "",
      nameAr: schedule?.nameAr || "",
      nameEn: schedule?.nameEn || "",
      workStartTime: schedule?.workStartTime || "",
      workEndTime: schedule?.workEndTime || "",
      workDays: schedule?.workDays ? JSON.parse(schedule.workDays) : [],
      lateToleranceMin: schedule?.lateToleranceMin || 0,
      earlyLeaveToleranceMin: schedule?.earlyLeaveToleranceMin || 0,
      isActive: schedule?.isActive ?? true,
      description: schedule?.description || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        code: schedule?.code || "",
        nameAr: schedule?.nameAr || "",
        nameEn: schedule?.nameEn || "",
        workStartTime: schedule?.workStartTime || "",
        workEndTime: schedule?.workEndTime || "",
        workDays: schedule?.workDays ? JSON.parse(schedule.workDays) : [],
        lateToleranceMin: schedule?.lateToleranceMin || 0,
        earlyLeaveToleranceMin: schedule?.earlyLeaveToleranceMin || 0,
        isActive: schedule?.isActive ?? true,
        description: schedule?.description || "",
      });
    }
  }, [open, schedule, form]);

  const onSubmit = async (data: FormData) => {
    try {
      const submitData: any = {
        code: data.code,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        workStartTime: data.workStartTime,
        workEndTime: data.workEndTime,
        workDays: JSON.stringify(data.workDays),
        lateToleranceMin: Number(data.lateToleranceMin),
        earlyLeaveToleranceMin: Number(data.earlyLeaveToleranceMin),
        isActive: Boolean(data.isActive),
      };

      // Only add description if it has a value
      if (data.description) {
        submitData.description = data.description;
      }

      console.log("Submitting work schedule data:", submitData);

      if (schedule) {
        await updateSchedule.mutateAsync({ id: schedule.id, data: submitData });
      } else {
        await createSchedule.mutateAsync(submitData);
      }
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error submitting work schedule:", error);
      console.error("Error response:", error.response?.data);
      // Error handled by mutation
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الكود</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="WS001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
            </div>

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
                            if (checked) {
                              field.onChange([...current, day.value].sort());
                            } else {
                              field.onChange(current.filter((v) => v !== day.value));
                            }
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lateToleranceMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تسامح التأخير (دقيقة)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        value={field.value}
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
                        {...field}
                        type="number"
                        value={field.value}
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
