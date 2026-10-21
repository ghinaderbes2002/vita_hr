"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WhatsappConfirmButton } from "@/components/clinic/whatsapp-confirm-button";
import { usePatientAppointments } from "@/lib/hooks/use-clinic-appointments";
import { Appointment } from "@/lib/api/clinic-appointments";
import { CLINIC_WHATSAPP_NUMBER } from "@/lib/clinic/whatsapp";
import { formatClockTime } from "@/lib/utils/date";

const pad = (n: number) => String(n).padStart(2, "0");

/** The appointment's day and time, as they read in the message ("02:00 م"). */
function slotOf(a: Appointment, locale: string) {
  const start = a.startTime && a.startTime.length > 5 ? new Date(a.startTime) : null;
  return {
    date: start
      ? start.toLocaleDateString(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      : (a.date ?? ""),
    time: start ? formatClockTime(`${pad(start.getHours())}:${pad(start.getMinutes())}`) : (a.startTime ?? ""),
  };
}

const startOf = (a: Appointment) => (a.startTime && a.startTime.length > 5 ? new Date(a.startTime).getTime() : 0);

/**
 * WhatsApp confirmation for an appointment — and, when the same patient has
 * other upcoming bookings still SCHEDULED, a picker so all of them go out in
 * one message. With nothing else upcoming it behaves like the plain button.
 */
export function WhatsappAppointmentsButton({
  appointment, phone, patientName, locale, disabledReason,
}: {
  appointment: Appointment;
  phone?: string | null;
  patientName: string;
  locale: string;
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  // Only a registered patient has a list to look through; a walk-in has just this one.
  const { data: patientAppts = [] } = usePatientAppointments(appointment.patientId || undefined);

  const others = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return patientAppts
      .filter((a) => a.id !== appointment.id && a.status === "SCHEDULED" && startOf(a) >= today.getTime())
      .sort((a, b) => startOf(a) - startOf(b));
  }, [patientAppts, appointment.id]);

  const [picked, setPicked] = useState<Set<string>>(new Set());
  // Everything starts ticked each time the picker opens.
  const openPicker = () => {
    setPicked(new Set([appointment.id, ...others.map((a) => a.id)]));
    setOpen(true);
  };

  const self = slotOf(appointment, locale);
  if (others.length === 0) {
    return (
      <WhatsappConfirmButton
        phone={phone}
        patientName={patientName}
        date={self.date}
        time={self.time}
        disabledReason={disabledReason}
      />
    );
  }

  const all = [appointment, ...others].sort((a, b) => startOf(a) - startOf(b));
  const slots = all.filter((a) => picked.has(a.id)).map((a) => slotOf(a, locale));
  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!phone}
        title={phone ? undefined : disabledReason}
        onClick={openPicker}
        className="gap-2 border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
      >
        إرسال عبر واتساب
        <span className="rounded-full bg-green-100 px-1.5 text-xs font-semibold text-green-800">{others.length + 1}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>المواعيد المرسلة في الرسالة</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            لدى {patientName || "المريض"} مواعيد قادمة أخرى بحالة «مجدول». اختر ما تريد تأكيده في رسالة واحدة:
          </p>
          <div className="space-y-1.5">
            {all.map((a) => {
              const s = slotOf(a, locale);
              return (
                <label key={a.id} className="flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 hover:bg-muted/50">
                  <Checkbox checked={picked.has(a.id)} onCheckedChange={() => toggle(a.id)} />
                  <span className="flex-1 text-sm">
                    {s.date}
                    <span className="ms-2 font-mono text-xs text-muted-foreground" dir="ltr">{s.time}</span>
                  </span>
                  {a.id === appointment.id && (
                    <span className="rounded bg-muted px-1.5 text-[10px] text-muted-foreground">هذا الموعد</span>
                  )}
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            يُفتح واتساب برسالة جاهزة — تأكد أنك مسجّل الدخول بحساب المركز {CLINIC_WHATSAPP_NUMBER} قبل الإرسال.
          </p>
          <DialogFooter>
            <WhatsappConfirmButton
              phone={phone}
              patientName={patientName}
              date={self.date}
              time={self.time}
              slots={slots}
              disabledReason={slots.length === 0 ? "اختر موعداً واحداً على الأقل" : disabledReason}
              className={slots.length === 0 ? "pointer-events-none opacity-50" : "w-full"}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
