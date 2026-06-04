"use client";

import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, Paperclip, X, AlertTriangle } from "lucide-react";
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
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { useAuthStore } from "@/lib/stores/auth-store";
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

const ONES = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة",
  "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر",
  "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
const TENS = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];

function toArabicMonths(n: number): string {
  if (n <= 0) return "";
  if (n < 20) return `${ONES[n]} ${n <= 2 ? "شهر" : "أشهر"} خدمة`;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const tensWord = TENS[tens];
  const onesWord = ones > 0 ? `${ONES[ones]} و` : "";
  return `${onesWord}${tensWord} شهراً خدمة`;
}

function FilePicker({ value, onChange, labels }: {
  value: string;
  onChange: (url: string) => void;
  labels: { attachFile: string; changeAttachment: string; attachment: string; uploadError: string };
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const { accessToken, user } = useAuthStore();

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("titleAr", file.name);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        body: fd,
      });

      if (!res.ok) throw new Error(`${res.status}`);

      const json = await res.json();
      if (json.fileUrl) {
        onChange(json.fileUrl);
        const rawName = json.fileName || file.name;
        // فك تشفير اسم الملف إذا كان محرفاً
        let decoded = rawName;
        if (/[À-ÿ]/.test(rawName) && !/[؀-ۿ]/.test(rawName)) {
          try {
            const bytes = new Uint8Array(rawName.length);
            for (let i = 0; i < rawName.length; i++) bytes[i] = rawName.charCodeAt(i) & 0xFF;
            decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
          } catch { /* keep original */ }
        }
        setFileName(decoded);
      } else {
        throw new Error("no fileUrl");
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
  hourlyStats?: { usedHours: number; pendingHours: number; monthlyLimit: number };
}

export function LeaveRequestForm({ onSubmit, onHourlySubmit, initialData, isLoading, hourlyStats }: LeaveRequestFormProps) {
  const t = useTranslations();
  const { data: leaveTypesData } = useLeaveTypes();
  const { data: employeesData } = useEmployeesBasicList();

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
  const isAnnualLeave = selectedLeaveType?.code === "ANNUAL" || selectedLeaveType?.nameAr?.includes("سنوية");
  const isHalfDayType = selectedLeaveType?.allowHalfDay === true && !isHourlyType && !isAnnualLeave;

  const watchedStartDate = form.watch("startDate");
  const watchedEndDate = form.watch("endDate");

  const totalDaysPreview = (() => {
    if (isHourlyType || isHalfDayType) return null;
    if (!watchedStartDate || !watchedEndDate) return null;
    const diff = Math.round((watchedEndDate.getTime() - watchedStartDate.getTime()) / 86400000) + 1;
    return diff > 0 ? diff : null;
  })();

  // تلميح نافذة التقديم
  const submissionWindowHint = (() => {
    if (!selectedLeaveType) return null;
    const code = selectedLeaveType.code?.toUpperCase();
    const minNotice = selectedLeaveType.minDaysNotice;

    if (code === "HAJJ")     return "يجب التقديم قبل 60 يوم على الأقل — لا يجوز استرجاعياً";
    if (code === "UMRAH")    return "يجب التقديم قبل 10 أيام على الأقل — لا يجوز استرجاعياً";
    if (code === "MARRIAGE") return "يجب التقديم قبل 7 أيام على الأقل — لا يجوز استرجاعياً";
    if (code === "SICK")     return "يمكن التقديم يوماً مسبقاً أو استرجاعياً حتى 7 أيام";

    // سنوية / ساعية / نصف يوم / غير مدفوعة → نافذة 7 أيام بالاتجاهين
    if (isHourlyType || isAnnualLeave || isHalfDayType) {
      if (totalDaysPreview && totalDaysPreview > 4) {
        return "الإجازة تتجاوز 4 أيام — يجب التقديم قبل 7 أيام على الأقل ولا يجوز استرجاعياً";
      }
      if (isHourlyType || isHalfDayType) {
        return "يمكن التقديم مسبقاً أو استرجاعياً حتى 7 أيام";
      }
      return "يمكن التقديم مسبقاً أو استرجاعياً حتى 7 أيام · إذا تجاوزت 4 أيام → 7 أيام إشعار مسبق إلزامي";
    }

    if (minNotice > 0) return `يجب التقديم قبل ${minNotice} يوم على الأقل`;
    return null;
  })();

  const durationMinutes = (() => {
    if (!watchedStartTime || !watchedEndTime) return 0;
    const sParts = watchedStartTime?.split?.(":");
    const eParts = watchedEndTime?.split?.(":");
    if (!sParts || !eParts || sParts.length < 2 || eParts.length < 2) return 0;
    const [sh, sm] = sParts.map(Number);
    const [eh, em] = eParts.map(Number);
    return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
  })();

  const requestedHours = durationMinutes / 60;
  const overLimitHours = (() => {
    if (!isHourlyType || !hourlyStats || requestedHours <= 0) return 0;
    const total = hourlyStats.usedHours + hourlyStats.pendingHours + requestedHours;
    return Math.max(0, total - hourlyStats.monthlyLimit);
  })();

  const handleSubmit = async (data: FormData) => {
    if (isHourlyType) {
      if (!data.date) {
        form.setError("date", { message: "التاريخ مطلوب" });
        return;
      }
      if (!data.startTime || !data.endTime) return;
      const [sh = 0, sm = 0] = (data.startTime ?? "").split(":").map(Number);
      const [eh = 0, em = 0] = (data.endTime ?? "").split(":").map(Number);
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

    if (!data.startDate) {
      form.setError("startDate", { message: "تاريخ البداية مطلوب" });
      return;
    }
    if (!data.endDate) {
      form.setError("endDate", { message: "تاريخ الانتهاء مطلوب" });
      return;
    }
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
                            [{toArabicMonths(type.minServiceMonths)}]
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

        {submissionWindowHint && (
          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            <span>ℹ️</span>
            <span>{submissionWindowHint}</span>
          </div>
        )}

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
                        disabled={(date) => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - 7); return date < d; }}
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

            {overLimitHours > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <span className="font-semibold">{overLimitHours.toFixed(1)} ساعة</span> من طلبك ستُخصم من راتبك
                  {hourlyStats && (
                    <span className="text-amber-600"> (الحد الشهري المدفوع: {hourlyStats.monthlyLimit} ساعة، المستخدم: {(hourlyStats.usedHours + hourlyStats.pendingHours).toFixed(1)} ساعة)</span>
                  )}
                </span>
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
                        disabled={(date) => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - 7); return date < d; }}
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
                          disabled={(date) => {
                            if (watchedStartDate) {
                              const minDate = new Date(watchedStartDate);
                              minDate.setHours(0, 0, 0, 0);
                              return date < minDate;
                            }
                            const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - 7); return date < d;
                          }}
                          defaultMonth={isAnnualLeave && watchedStartDate ? watchedStartDate : undefined}
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
              <Select onValueChange={(v) => field.onChange(v === "none" ? "" : v)} value={field.value || "none"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("leaves.form.selectSubstitute")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">— بدون بديل —</SelectItem>
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
