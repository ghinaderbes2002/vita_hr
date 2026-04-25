"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveLeaveTypes } from "@/lib/hooks/use-leave-types";
import { useCreateHourlyLeave } from "@/lib/hooks/use-leave-requests";
import { format } from "date-fns";

interface HourlyLeaveFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

function parseMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function HourlyLeaveForm({ onSuccess, onCancel }: HourlyLeaveFormProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: leaveTypesData } = useActiveLeaveTypes();
  const leaveTypes: any[] = (leaveTypesData as any)?.data ?? leaveTypesData ?? [];

  const mutation = useCreateHourlyLeave();

  const durationMinutes = (() => {
    if (!startTime || !endTime) return 0;
    return Math.max(0, parseMinutes(endTime) - parseMinutes(startTime));
  })();

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!leaveTypeId) errs.leaveTypeId = "نوع الإجازة مطلوب";
    if (!date) errs.date = "التاريخ مطلوب";
    if (!startTime) errs.startTime = "وقت البداية مطلوب";
    if (!endTime) errs.endTime = "وقت الانتهاء مطلوب";
    if (startTime && endTime && parseMinutes(endTime) <= parseMinutes(startTime)) {
      errs.endTime = "وقت الانتهاء يجب أن يكون بعد وقت البداية";
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    await mutation.mutateAsync({ leaveTypeId, date, startTime, endTime, reason: reason || undefined });
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* نوع الإجازة */}
      <div className="space-y-1">
        <Label>نوع الإجازة</Label>
        <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
          <SelectTrigger>
            <SelectValue placeholder="اختر نوع الإجازة" />
          </SelectTrigger>
          <SelectContent>
            {leaveTypes.map((t: any) => (
              <SelectItem key={t.id} value={t.id}>
                {t.nameAr}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.leaveTypeId && <p className="text-xs text-red-600">{errors.leaveTypeId}</p>}
      </div>

      {/* التاريخ */}
      <div className="space-y-1">
        <Label>التاريخ</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        {errors.date && <p className="text-xs text-red-600">{errors.date}</p>}
      </div>

      {/* وقت البداية والنهاية */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>وقت البداية</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          {errors.startTime && <p className="text-xs text-red-600">{errors.startTime}</p>}
        </div>
        <div className="space-y-1">
          <Label>وقت الانتهاء</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          {errors.endTime && <p className="text-xs text-red-600">{errors.endTime}</p>}
        </div>
      </div>

      {/* عرض المدة تلقائياً */}
      {durationMinutes > 0 && (
        <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
          المدة: {Math.floor(durationMinutes / 60)} ساعة
          {durationMinutes % 60 > 0 ? ` و ${durationMinutes % 60} دقيقة` : ""}
        </div>
      )}

      {/* السبب */}
      <div className="space-y-1">
        <Label>السبب (اختياري)</Label>
        <Input
          placeholder="مثال: موعد طبي"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={mutation.isPending} className="flex-1">
          {mutation.isPending ? "جاري الإرسال..." : "تقديم الطلب"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
        )}
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-600">
          {(mutation.error as any)?.response?.data?.message || "حدث خطأ"}
        </p>
      )}
    </form>
  );
}
