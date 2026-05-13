"use client";

import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLeaveTypes } from "@/lib/hooks/use-leave-types";
import { useEmployees } from "@/lib/hooks/use-employees";
import { CreateLeaveRequestData, CreateHourlyLeaveData, LeaveRequest } from "@/lib/api/leave-requests";
import { useState } from "react";
import { toast } from "sonner";

const formSchema = z.object({
  leaveTypeId: z.string().min(1),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  date: z.date().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().optional(),
  halfDayPeriod: z.enum(["MORNING", "AFTERNOON"]).optional(),
  substituteId: z.string().optional(),
  attachmentUrl: z.string().optional(),
  deceasedRelation: z.enum(["FIRST_DEGREE", "SECOND_DEGREE"]).optional(),
});

type FormData = z.infer<typeof formSchema>;

function FilePicker({ value, onChange, labels }: {
  value: string;
  onChange: (url: string) => void;
  labels: { attachFile: string; changeAttachment: string; attachment: string; uploadError: string };
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.fileUrl) {
        onChange(json.fileUrl);
        setFileName(json.fileName || file.name);
      }
    } catch {
      toast.error(labels.uploadError);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Paperclip className="h-4 w-4 ml-2" />}
        {value ? labels.changeAttachment : labels.attachFile}
      </Button>
      {value && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span className="max-w-40 truncate">{fileName || labels.attachment}</span>
          <button type="button" onClick={() => { onChange(""); setFileName(""); }} className="text-destructive hover:text-destructive/80">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

interface LeaveRequestFormProps {
  onSubmit: (data: CreateLeaveRequestData) => Promise<void>;
  onHourlySubmit?: (data: CreateHourlyLeaveData) => Promise<void>;
  initialData?: LeaveRequest;
  isLoading?: boolean;
}

export function LeaveRequestForm({ onSubmit, onHourlySubmit, initialData, isLoading }: LeaveRequestFormProps) {
  const t = useTranslations();
  const { data: leaveTypesData } = useLeaveTypes();
  const { data: employeesData } = useEmployees({ limit: 500 });

  // Helper function to extract array
  const extractArray = (data: any): any[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data?.items)) return data.data.items;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  };

  const leaveTypes = extractArray(leaveTypesData).filter(
    (lt: any) => !lt.nameAr?.includes("طارئ") && !lt.nameEn?.toLowerCase().includes("emergency")
  );
  const employees = extractArray(employeesData);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leaveTypeId: initialData?.leaveTypeId || "",
      startDate: initialData?.startDate ? new Date(initialData.startDate) : undefined,
      endDate: initialData?.endDate ? new Date(initialData.endDate) : undefined,
      date: undefined,
      startTime: "09:00",
      endTime: "11:00",
      reason: initialData?.reason || "",
      halfDayPeriod: initialData?.halfDayPeriod || undefined,
      substituteId: initialData?.substituteId || "",
      attachmentUrl: (initialData as any)?.attachmentUrl || "",
      deceasedRelation: (initialData as any)?.deceasedRelation || undefined,
    },
  });

  const selectedLeaveTypeId = form.watch("leaveTypeId");
  const watchedStartTime = form.watch("startTime");
  const watchedEndTime = form.watch("endTime");
  const selectedLeaveType = leaveTypes.find((t: any) => t.id === selectedLeaveTypeId);
  const isBereavement = selectedLeaveType?.code === "BEREAVEMENT";
  const isHourlyType = selectedLeaveType != null && selectedLeaveType.maxHoursPerMonth != null;
  const isHalfDayType = selectedLeaveType?.allowHalfDay === true && !isHourlyType;

  const watchedStartDate = form.watch("startDate");
  const watchedEndDate = form.watch("endDate");

  const durationMinutes = (() => {
    if (!watchedStartTime || !watchedEndTime) return 0;
    const [sh, sm] = watchedStartTime.split(":").map(Number);
    const [eh, em] = watchedEndTime.split(":").map(Number);
    return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
  })();

  const totalDaysPreview = (() => {
    if (isHourlyType || isHalfDayType) return null;
    if (!watchedStartDate || !watchedEndDate) return null;
    const diff = Math.round((watchedEndDate.getTime() - watchedStartDate.getTime()) / 86400000) + 1;
    return diff > 0 ? diff : null;
  })();

  const handleSubmit = async (data: FormData) => {
    if (isHourlyType) {
      if (!data.date || !data.startTime || !data.endTime) return;
      const [sh, sm] = data.startTime.split(":").map(Number);
      const [eh, em] = data.endTime.split(":").map(Number);
      if (eh * 60 + em <= sh * 60 + sm) {
        form.setError("endTime", { message: "وقت الانتهاء يجب أن يكون بعد وقت البداية" });
        return;
      }
      const hourlyData: CreateHourlyLeaveData = {
        leaveTypeId: data.leaveTypeId,
        date: format(data.date, "yyyy-MM-dd"),
        startTime: data.startTime,
        endTime: data.endTime,
        reason: data.reason || undefined,
      };
      await onHourlySubmit?.(hourlyData);
      return;
    }

    if (!data.startDate || !data.endDate) return;
    const submitData: CreateLeaveRequestData = {
      leaveTypeId: data.leaveTypeId,
      startDate: format(data.startDate, "yyyy-MM-dd"),
      endDate: format(data.endDate, "yyyy-MM-dd"),
      reason: data.reason || "",
      isHalfDay: isHalfDayType,
      halfDayPeriod: isHalfDayType ? data.halfDayPeriod : undefined,
      substituteId: data.substituteId || undefined,
      ...(data.attachmentUrl && { attachmentUrl: data.attachmentUrl }),
      ...(isBereavement && data.deceasedRelation && { deceasedRelation: data.deceasedRelation }),
    };

    await onSubmit(submitData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="leaveTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("leaves.fields.leaveType")}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("leaveBalances.selectLeaveType")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {leaveTypes.map((type: any) => (
                    <SelectItem key={type.id} value={type.id}>
                      <span className="flex items-center gap-2 w-full">
                        <span>{type.nameAr}</span>
                        {type.minServiceMonths && (
                          <span className="text-xs text-muted-foreground">
                            [{type.minServiceMonths} شهر خدمة]
                          </span>
                        )}
                        {type.maxLifetimeUsage === 1 && (
                          <span className="text-xs text-muted-foreground">
                            [مرة واحدة مدى الحياة]
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {isBereavement && (
          <FormField
            control={form.control}
            name="deceasedRelation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>درجة القرابة <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر درجة القرابة" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="FIRST_DEGREE">قرابة أولى (أب، أم، زوج/زوجة، أبناء)</SelectItem>
                    <SelectItem value="SECOND_DEGREE">قرابة ثانية (أخ، أخت، جد، جدة)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {isHourlyType ? (
          <>
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("leaves.fields.startDate")}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-right font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : <span>{t("leaves.form.selectDate")}</span>}
                          <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>وقت البداية</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>وقت الانتهاء</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {durationMinutes > 0 && (
              <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
                المدة: {Math.floor(durationMinutes / 60)} ساعة
                {durationMinutes % 60 > 0 ? ` و ${durationMinutes % 60} دقيقة` : ""}
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("leaves.fields.startDate")}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-right font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : <span>{t("leaves.form.selectDate")}</span>}
                          <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(d) => {
                          field.onChange(d);
                          if (isHalfDayType && d) form.setValue("endDate", d);
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isHalfDayType && (
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("leaves.fields.endDate")}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-right font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>{t("leaves.form.selectDate")}</span>}
                            <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        {totalDaysPreview !== null && (
          <div className="rounded-md bg-blue-50 border border-blue-100 px-4 py-2.5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">عدد الأيام</span>
            <span className="font-semibold text-blue-700">{totalDaysPreview} {totalDaysPreview === 1 ? "يوم" : "أيام"}</span>
          </div>
        )}

        {isHalfDayType && (
          <FormField
            control={form.control}
            name="halfDayPeriod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("leaves.form.halfDayPeriod")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("leaves.form.selectPeriod")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="MORNING">{t("leaves.form.morning")}</SelectItem>
                    <SelectItem value="AFTERNOON">{t("leaves.form.afternoon")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="substituteId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("leaves.fields.substitute")} {t("common.optional")}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("leaves.form.selectSubstitute")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstNameAr} {emp.lastNameAr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("leaves.fields.reason")}</FormLabel>
              <FormControl>
                <Textarea {...field} rows={4} placeholder={t("leaves.form.reasonPlaceholder")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="attachmentUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("leaves.form.attachments")}</FormLabel>
              <FormControl>
                <FilePicker
                  value={field.value || ""}
                  onChange={field.onChange}
                  labels={{
                    attachFile: t("leaves.form.attachFile"),
                    changeAttachment: t("leaves.form.changeAttachment"),
                    attachment: t("leaves.form.attachment"),
                    uploadError: t("leaves.form.uploadError"),
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
