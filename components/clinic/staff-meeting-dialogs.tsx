"use client";

import { useState } from "react";
import { CalendarDays, Clock, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TherapistPicker } from "@/components/clinic/therapist-picker";
import { MEETING_STYLE, MEETING_TYPES, meetingStyle, meetingTypeLabel } from "@/components/clinic/appointment-timeline";
import { useCreateInternalMeeting } from "@/lib/hooks/use-clinic-appointments";
import { InternalMeeting, InternalMeetingType } from "@/lib/api/clinic-appointments";
import { formatClinicTime } from "@/lib/utils";

const emptyForm = (date: string) => ({
  title: "",
  meetingType: "MEETING" as InternalMeetingType,
  meetingTypeOther: "",
  attendeeIds: [] as string[],
  date,
  startTime: "10:00",
  endTime: "11:00",
  notes: "",
});

/**
 * حجز اجتماع أو تدريب داخلي لمجموعة موظفين. الباك يرفض الحجز كاملاً إن كان لأحد
 * الحضور جلسة متداخلة، فيُلوَّن المتعارضون بالأحمر في القائمة ويبقى النموذج مفتوحاً.
 */
export function StaffMeetingDialog({
  open, onOpenChange, defaultDate, staff, staffName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** YYYY-MM-DD — اليوم المحدد في التقويم. */
  defaultDate: string;
  /** نفس قائمة اختيار المعالجين في مواعيد المرضى؛ القيمة المرسلة userId. */
  staff: any[];
  staffName: (id: string) => string;
}) {
  const [form, setForm] = useState(() => emptyForm(defaultDate));
  const [conflictedIds, setConflictedIds] = useState<string[]>([]);
  const createMeeting = useCreateInternalMeeting();

  // نموذج نظيف على اليوم المحدد عند كل فتح (تعديل الحالة أثناء الرندر عند تغيّر open).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(emptyForm(defaultDate));
      setConflictedIds([]);
    }
  }

  const endBeforeStart = form.endTime <= form.startTime;
  const canSubmit =
    !!form.title.trim() && form.attendeeIds.length > 0 && !!form.date && !endBeforeStart && !createMeeting.isPending;

  const handleCreate = async () => {
    setConflictedIds([]);
    try {
      await createMeeting.mutateAsync({
        title: form.title.trim(),
        meetingType: form.meetingType,
        // Only OTHER takes a free-text type; left blank, the title stands for it.
        ...(form.meetingType === "OTHER" && form.meetingTypeOther.trim()
          ? { meetingTypeOther: form.meetingTypeOther.trim() }
          : {}),
        attendeeIds: form.attendeeIds,
        startTime: new Date(`${form.date}T${form.startTime}:00`).toISOString(),
        endTime: new Date(`${form.date}T${form.endTime}:00`).toISOString(),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      });
      onOpenChange(false);
    } catch (e: any) {
      // الرسالة تظهر في التوست من الـ hook؛ هنا فقط نعلّم المتعارضين.
      const ids = e?.response?.data?.details?.conflictedUserIds;
      if (Array.isArray(ids)) setConflictedIds(ids);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!createMeeting.isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>اجتماع / نشاط جديد</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* النوع كأزرار ظاهرة بدل قائمة — نقرة واحدة */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MEETING_TYPES.map((k) => {
              const active = form.meetingType === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, meetingType: k }))}
                  className={`flex items-center justify-center gap-2 rounded-md border px-2 py-2 text-sm font-medium transition-colors ${
                    active ? MEETING_STYLE[k].cls : "text-muted-foreground hover:bg-muted"
                  }`}
                  style={active ? { borderColor: MEETING_STYLE[k].bar } : undefined}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MEETING_STYLE[k].bar }} />
                  {MEETING_STYLE[k].label}
                </button>
              );
            })}
          </div>
          {form.meetingType === "OTHER" && (
            <div className="space-y-1.5">
              <Label>نوع النشاط <span className="text-xs font-normal text-muted-foreground">(اختياري)</span></Label>
              <Input
                value={form.meetingTypeOther}
                onChange={(e) => setForm((f) => ({ ...f, meetingTypeOther: e.target.value }))}
                placeholder="مثال: ورشة عمل"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>العنوان</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="مثال: اجتماع فريق الأطراف الصناعية"
            />
          </div>
          <div className="space-y-1.5">
            <Label>الحضور</Label>
            <TherapistPicker
              staff={staff}
              value={form.attendeeIds}
              onChange={(ids) => {
                setForm((f) => ({ ...f, attendeeIds: ids }));
                setConflictedIds((c) => c.filter((id) => ids.includes(id)));
              }}
              placeholder="اختر الموظفين"
              labelOf={staffName}
              highlightIds={conflictedIds}
            />
            {conflictedIds.length > 0 && (
              <p className="text-xs text-destructive">
                غير متاح بهذا الوقت: {conflictedIds.map(staffName).join("، ")}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>التاريخ</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>من</Label>
              <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>إلى</Label>
              <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
            </div>
          </div>
          {endBeforeStart && (
            <p className="text-xs text-destructive">وقت النهاية يجب أن يكون بعد وقت البداية</p>
          )}
          <div className="space-y-1.5">
            <Label>ملاحظات (اختياري)</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createMeeting.isPending}>إلغاء</Button>
          <Button onClick={handleCreate} disabled={!canSubmit} className="gap-1.5">
            {createMeeting.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            حجز
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StaffMeetingDetailsDialog({
  meeting, onClose, staffName, locale,
}: {
  meeting: InternalMeeting | null;
  onClose: () => void;
  staffName: (id: string) => string;
  locale: string;
}) {
  const st = meeting ? meetingStyle(meeting) : null;
  return (
    <Dialog open={!!meeting} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {st && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: st.bar }} />}
            {meeting?.title}
          </DialogTitle>
        </DialogHeader>
        {meeting && st && (
          <div className="space-y-4 text-sm">
            <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${st.cls}`}>{meetingTypeLabel(meeting)}</span>
            <div className="space-y-2">
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                {new Date(meeting.startTime).toLocaleDateString(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {formatClinicTime(meeting.startTime)} – {formatClinicTime(meeting.endTime)}
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" /> الحضور ({meeting.attendeeIds?.length ?? 0})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(meeting.attendeeIds ?? []).map((id) => (
                  <span key={id} className="rounded-full border bg-muted/40 px-2.5 py-0.5 text-xs">{staffName(id)}</span>
                ))}
              </div>
            </div>
            {meeting.createdBy && (
              <p className="text-muted-foreground">أنشأه: <span className="text-foreground">{staffName(meeting.createdBy)}</span></p>
            )}
            {meeting.notes && (
              <div className="space-y-1">
                <p className="text-muted-foreground">ملاحظات</p>
                <p className="whitespace-pre-wrap">{meeting.notes}</p>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
