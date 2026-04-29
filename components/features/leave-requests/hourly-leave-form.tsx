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
import { useMyLeaveBalances } from "@/lib/hooks/use-leave-balances";
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

  const { data: myBalances } = useMyLeaveBalances(new Date().getFullYear());
  const balanceForType = leaveTypeId
    ? (Array.isArray(myBalances) ? myBalances : []).find((b: any) => b.leaveTypeId === leaveTypeId)
    : null;
  const selectedType = leaveTypes.find((t: any) => t.id === leaveTypeId);
  const maxHoursPerMonth: number | null = selectedType?.maxHoursPerMonth ?? null;
  const usedHours: number = balanceForType?.usedHours ?? 0;
  const pendingHours: number = balanceForType?.pendingHours ?? 0;

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

      {maxHoursPerMonth !== null && leaveTypeId && (
        <div className="rounded-md bg-muted/50 px-3 py-2 text-sm space-y-1">
          <div className="flex justify-between text-muted-foreground">
            <span>الإجازات الساعية هذا الشهر</span>
            <span>{usedHours + pendingHours} / {maxHoursPerMonth} ساعة</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-400 transition-all"
              style={{ width: `${Math.min(100, ((usedHours + pendingHours) / maxHoursPerMonth) * 100)}%` }}
            />
          </div>
          {maxHoursPerMonth - usedHours - pendingHours > 0 ? (
            <p className="text-xs text-muted-foreground">المتاح: {(maxHoursPerMonth - usedHours - pendingHours).toFixed(1)} ساعة</p>
          ) : (
            <p className="text-xs text-red-600">تجاوزت الحد الشهري</p>
          )}
        </div>
      )}

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
