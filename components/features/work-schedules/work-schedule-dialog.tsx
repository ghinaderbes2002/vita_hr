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
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useCreateWorkSchedule, useUpdateWorkSchedule } from "@/lib/hooks/use-work-schedules";
import { WorkSchedule } from "@/lib/api/work-schedules";

const formSchema = z.object({
  code: z.string().optional(),
  nameAr: z.string().min(1, "Arabic name is required"),
  nameEn: z.string().min(1, "English name is required"),
  shiftType: z.enum(["DAY", "NIGHT", "FLEXIBLE"]),
  workStartTime: z.string().optional(),
  workEndTime: z.string().optional(),
  minimumWorkHours: z.number().min(1, "Must be at least 1 hour").optional(),
  requiresContinuousWork: z.boolean().optional(),
  workDays: z.array(z.number()).min(1, "At least one day is required"),
  lateToleranceMin: z.number().min(0).optional(),
  earlyLeaveToleranceMin: z.number().min(0).optional(),
  isActive: z.boolean(),
  description: z.string().optional(),
}).refine((data) => {
  if (data.shiftType !== "FLEXIBLE") {
    return !!data.workStartTime && !!data.workEndTime;
  }
  return true;
}, { message: "Start and end time are required", path: ["workStartTime"] });

type FormData = z.infer<typeof formSchema>;

interface WorkScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: WorkSchedule | null;
}

const WEEK_DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

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
    shiftType: (schedule?.shiftType as any) || "DAY",
    workStartTime: schedule?.workStartTime || "",
    workEndTime: schedule?.workEndTime || "",
    minimumWorkHours: schedule?.minimumWorkMinutes ? Math.round(schedule.minimumWorkMinutes / 60) : 8,
    requiresContinuousWork: schedule?.requiresContinuousWork ?? false,
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

  const shiftType = form.watch("shiftType");
  const isFlexible = shiftType === "FLEXIBLE";

  useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, schedule]);

  const onSubmit = async (data: FormData) => {
    try {
      const submitData: any = {
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        shiftType: data.shiftType,
        workDays: JSON.stringify(data.workDays),
        isActive: Boolean(data.isActive),
      };

      if (data.code) submitData.code = data.code;
      if (data.description) submitData.description = data.description;

      if (!isFlexible) {
        submitData.workStartTime = data.workStartTime;
        submitData.workEndTime = data.workEndTime;
        submitData.lateToleranceMin = Number(data.lateToleranceMin ?? 0);
        submitData.earlyLeaveToleranceMin = Number(data.earlyLeaveToleranceMin ?? 0);
      } else {
        submitData.minimumWorkMinutes = (data.minimumWorkHours ?? 8) * 60;
        submitData.requiresContinuousWork = data.requiresContinuousWork ?? false;
      }

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
      <DialogContent className="sm:max-w-175 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {schedule ? t("workSchedules.dialog.editTitle") : t("workSchedules.dialog.addTitle")}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <FormField
              control={form.control}
              name="shiftType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("workSchedules.dialog.shiftTypeLabel")}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex gap-6"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="DAY" id="shift-day" />
                        <Label htmlFor="shift-day">{t("workSchedules.dialog.shiftDay")}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="NIGHT" id="shift-night" />
                        <Label htmlFor="shift-night">{t("workSchedules.dialog.shiftNight")}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="FLEXIBLE" id="shift-flex" />
                        <Label htmlFor="shift-flex">{t("workSchedules.dialog.shiftFlexible")}</Label>
                      </div>
                    </RadioGroup>
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
                    <FormLabel>{t("workSchedules.dialog.active")}</FormLabel>
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
                    <FormLabel>{t("workSchedules.dialog.nameAr")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("workSchedules.dialog.nameArPlaceholder")} />
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
                    <FormLabel>{t("workSchedules.dialog.nameEn")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Full Time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!isFlexible && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="workStartTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("workSchedules.dialog.workStartTime")}</FormLabel>
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
                        <FormLabel>{t("workSchedules.dialog.workEndTime")}</FormLabel>
                        <FormControl>
                          <Input {...field} type="time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lateToleranceMin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("workSchedules.dialog.lateTolerance")}</FormLabel>
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
                        <FormLabel>{t("workSchedules.dialog.earlyLeaveTolerance")}</FormLabel>
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
              </>
            )}

            {isFlexible && (
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 p-4 space-y-4">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">{t("workSchedules.dialog.flexSettings")}</p>

                <FormField
                  control={form.control}
                  name="minimumWorkHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("workSchedules.dialog.minDailyHours")}</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={24}
                            className="w-24"
                            value={field.value ?? 8}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 8)}
                          />
                          <span className="text-sm text-muted-foreground">{t("workSchedules.dialog.hourPerDay")}</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requiresContinuousWork"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel className="text-sm">{t("workSchedules.dialog.continuousWork")}</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="workDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("workSchedules.dialog.workDaysLabel")}</FormLabel>
                  <div className="grid grid-cols-7 gap-2">
                    {WEEK_DAY_KEYS.map((key, value) => (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          checked={field.value?.includes(value)}
                          onCheckedChange={(checked) => {
                            const current = field.value || [];
                            field.onChange(
                              checked
                                ? [...current, value].sort()
                                : current.filter((v) => v !== value)
                            );
                          }}
                        />
                        <label className="text-sm">{t(`workSchedules.weekDays.${key}` as any)}</label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("workSchedules.dialog.description")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder={t("workSchedules.dialog.descriptionPlaceholder")} />
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
