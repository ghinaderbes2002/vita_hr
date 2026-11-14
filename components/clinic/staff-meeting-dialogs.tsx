"use client";

import { useState } from "react";
import { Ban, CalendarDays, Clock, Loader2, Pencil, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TherapistPicker } from "@/components/clinic/therapist-picker";
import { MEETING_STYLE, MEETING_TYPES, meetingStyle, meetingTypeLabel } from "@/components/clinic/appointment-timeline";
import { useCancelInternalMeeting, useCreateInternalMeeting, useUpdateInternalMeeting } from "@/lib/hooks/use-clinic-appointments";
import { CreateInternalMeetingDto, InternalMeeting, InternalMeetingType } from "@/lib/api/clinic-appointments";
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

const pad = (n: number) => String(n).padStart(2, "0");
/** The form in local time, the same way it's turned back into ISO on submit. */
const formFromMeeting = (m: InternalMeeting) => {
  const s = new Date(m.startTime);
  const e = new Date(m.endTime);
  return {
    title: m.title,
    meetingType: m.meetingType,
    meetingTypeOther: m.meetingTypeOther ?? "",
    attendeeIds: [...(m.attendeeIds ?? [])],
    date: `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`,
    startTime: `${pad(s.getHours())}:${pad(s.getMinutes())}`,
    endTime: `${pad(e.getHours())}:${pad(e.getMinutes())}`,
    notes: m.notes ?? "",
  };
};

/** A meeting that's cancelled or already over can't be changed any more. */
export const meetingIsLocked = (m: InternalMeeting) =>
  m.status === "CANCELLED" || new Date(m.endTime).getTime() <= Date.now();

/**
 * حجز اجتماع أو تدريب داخلي لمجموعة موظفين. الباك يرفض الحجز كاملاً إن كان لأحد
 * الحضور جلسة متداخلة، فيُلوَّن المتعارضون بالأحمر في القائمة ويبقى النموذج مفتوحاً.
 * مع `meeting` يصير نموذج تعديل: يُعبّأ ببياناته ولا يُرسل إلا ما تغيّر.
 */
export function StaffMeetingDialog({
  open, onOpenChange, defaultDate, staff, staffName, meeting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** YYYY-MM-DD — اليوم المحدد في التقويم. */
  defaultDate: string;
  /** نفس قائمة اختيار المعالجين في مواعيد المرضى؛ القيمة المرسلة userId. */
  staff: any[];
  staffName: (id: string) => string;
  /** The meeting being edited; absent when booking a new one. */
  meeting?: InternalMeeting | null;
}) {
  const initialForm = () => (meeting ? formFromMeeting(meeting) : emptyForm(defaultDate));
  const [form, setForm] = useState(initialForm);
  const [conflictedIds, setConflictedIds] = useState<string[]>([]);
  const createMeeting = useCreateInternalMeeting();
  const updateMeeting = useUpdateInternalMeeting();
  const pending = createMeeting.isPending || updateMeeting.isPending;

  // نموذج نظيف على اليوم المحدد عند كل فتح (تعديل الحالة أثناء الرندر عند تغيّر open).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(initialForm());
      setConflictedIds([]);
    }
  }

  const endBeforeStart = form.endTime <= form.startTime;
  const canSubmit =
    !!form.title.trim() && form.attendeeIds.length > 0 && !!form.date && !endBeforeStart && !pending;

  const handleSubmit = async () => {
    setConflictedIds([]);
    const dto: CreateInternalMeetingDto = {
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
    };
    try {
      if (meeting) {
        // Only what changed: the server checks for clashes only when the time or attendees move.
        const changes: Partial<CreateInternalMeetingDto> = {};
        if (dto.title !== meeting.title) changes.title = dto.title;
        if (dto.meetingType !== meeting.meetingType) changes.meetingType = dto.meetingType;
        if (dto.meetingType === "OTHER" && (dto.meetingTypeOther ?? "") !== (meeting.meetingTypeOther ?? "")) {
          changes.meetingTypeOther = dto.meetingTypeOther ?? "";
        }
        const sameIds = [...dto.attendeeIds].sort().join() === [...(meeting.attendeeIds ?? [])].sort().join();
        if (!sameIds) changes.attendeeIds = dto.attendeeIds;
        if (new Date(dto.startTime).getTime() !== new Date(meeting.startTime).getTime()) changes.startTime = dto.startTime;
        if (new Date(dto.endTime).getTime() !== new Date(meeting.endTime).getTime()) changes.endTime = dto.endTime;
        if (form.notes.trim() !== (meeting.notes ?? "").trim()) changes.notes = form.notes.trim();
        if (Object.keys(changes).length > 0) await updateMeeting.mutateAsync({ id: meeting.id, dto: changes });
      } else {
        await createMeeting.mutateAsync(dto);
      }
      onOpenChange(false);
    } catch (e: any) {
      // الرسالة تظهر في التوست من الـ hook؛ هنا فقط نعلّم المتعارضين.
      const ids = e?.response?.data?.details?.conflictedUserIds;
      if (Array.isArray(ids)) setConflictedIds(ids);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!pending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>{meeting ? "تعديل الاجتماع / النشاط" : "اجتماع / نشاط جديد"}</DialogTitle>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="gap-1.5">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {meeting ? "حفظ التعديلات" : "حجز"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StaffMeetingDetailsDialog({
  meeting, onClose, staffName, locale, canEdit = false, canCancel = false, onEdit,
}: {
  meeting: InternalMeeting | null;
  onClose: () => void;
  staffName: (id: string) => string;
  locale: string;
  /** Already folded in: the creator, or the update / cancel permission. */
  canEdit?: boolean;
  canCancel?: boolean;
  onEdit?: (m: InternalMeeting) => void;
}) {
  const st = meeting ? meetingStyle(meeting) : null;
  const cancelMeeting = useCancelInternalMeeting();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const locked = !meeting || meetingIsLocked(meeting);
  const cancelled = meeting?.status === "CANCELLED";
  const stamp = (iso: string) =>
    new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  const close = () => { setCancelling(false); setReason(""); onClose(); };

  const confirmCancel = async () => {
    if (!meeting) return;
    try {
      await cancelMeeting.mutateAsync({ id: meeting.id, reason: reason.trim() || undefined });
      close();
    } catch { /* toast from the hook */ }
  };

  return (
    <Dialog open={!!meeting} onOpenChange={(o) => { if (!o && !cancelMeeting.isPending) close(); }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {st && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: st.bar }} />}
            <span className={cancelled ? "line-through opacity-70" : undefined}>{meeting?.title}</span>
          </DialogTitle>
        </DialogHeader>
        {meeting && st && (
          <div className="space-y-4 text-sm">
            {cancelled && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                <p className="font-medium">
                  أُلغي هذا الاجتماع
                  {meeting.cancelledBy && <> بواسطة {staffName(meeting.cancelledBy)}</>}
                  {meeting.cancelledAt && <> — {stamp(meeting.cancelledAt)}</>}
                </p>
                {meeting.cancelledReason && <p className="mt-1 text-xs">السبب: {meeting.cancelledReason}</p>}
              </div>
            )}
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
            {meeting.updatedAt && (
              <p className="text-xs text-muted-foreground">
                آخر تعديل{meeting.updatedBy && <>: {staffName(meeting.updatedBy)}</>} — {stamp(meeting.updatedAt)}
              </p>
            )}
            {meeting.notes && (
              <div className="space-y-1">
                <p className="text-muted-foreground">ملاحظات</p>
                <p className="whitespace-pre-wrap">{meeting.notes}</p>
              </div>
            )}
          </div>
        )}
        {cancelling && (
          <div className="space-y-2 rounded-md border border-red-200 p-3 dark:border-red-900">
            <Label>سبب الإلغاء <span className="text-xs font-normal text-muted-foreground">(اختياري — يصل للحضور مع الإشعار)</span></Label>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setCancelling(false); setReason(""); }} disabled={cancelMeeting.isPending}>تراجع</Button>
              <Button variant="destructive" size="sm" className="gap-1.5" onClick={confirmCancel} disabled={cancelMeeting.isPending}>
                {cancelMeeting.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                تأكيد الإلغاء
              </Button>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            {meeting && !locked && canEdit && onEdit && (
              <Button variant="outline" className="gap-1.5" onClick={() => onEdit(meeting)}>
                <Pencil className="h-4 w-4" /> تعديل
              </Button>
            )}
            {meeting && !locked && canCancel && !cancelling && (
              <Button variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setCancelling(true)}>
                <Ban className="h-4 w-4" /> إلغاء الاجتماع
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={close}>إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
