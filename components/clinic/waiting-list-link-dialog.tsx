"use client";

import { useTranslations } from "next-intl";
import { CalendarPlus, Link2, Loader2, SearchX } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatClinicTime } from "@/lib/utils";
import {
  useLinkWaitingListAppointment, useWaitingListAppointmentMatches,
} from "@/lib/hooks/use-clinic-waiting-list";
import type { WaitingListEntry } from "@/lib/api/clinic-waiting-list";

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

/**
 * Existing appointments that may already be this entry's booking. Nothing is
 * linked until the user picks one: the server never links on its own, even when
 * there is a single candidate.
 */
export function WaitingListLinkDialog({
  entry,
  onClose,
  onBookNew,
}: {
  entry: WaitingListEntry | null;
  onClose: () => void;
  /** Absent when the user may not book appointments. */
  onBookNew?: (entry: WaitingListEntry) => void;
}) {
  const tAppt = useTranslations("clinic.appointments");
  const { data: matches = [], isLoading, isError } = useWaitingListAppointmentMatches(entry?.id);
  const link = useLinkWaitingListAppointment();

  const linkTo = (appointmentId: string) => {
    if (!entry) return;
    link.mutate({ id: entry.id, appointmentId }, { onSuccess: onClose });
  };

  return (
    <Dialog open={!!entry} onOpenChange={(o) => { if (!o && !link.isPending) onClose(); }}>
      <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ربط بموعد موجود</DialogTitle>
          <DialogDescription>
            مواعيد قد تخص <span className="font-medium text-foreground">{entry?.patientName}</span> — بحسب رقم المريض أو اسمه.
            اختر الموعد الصحيح لربطه؛ المواعيد من نفس نوع الخدمة تظهر أولاً.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : isError ? (
          <p className="py-8 text-center text-sm text-destructive">تعذّر تحميل المواعيد المرشّحة</p>
        ) : matches.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <SearchX className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">لا توجد مواعيد مرشّحة لهذا المريض</p>
            <p className="text-xs text-muted-foreground">يمكنك حجز موعد جديد له مباشرة.</p>
          </div>
        ) : (
          <ul className="divide-y rounded-md border">
            {matches.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{m.patientName}</span>
                    {m.sameType && (
                      <Badge variant="outline" className="border-green-200 bg-green-100 text-[10px] text-green-800">
                        نفس الخدمة
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono" dir="ltr">{fmtDate(m.date)} · {formatClinicTime(m.startTime) || "—"}</span>
                    {" · "}
                    {tAppt(`types.${m.appointmentType}`)}
                    {m.practitioner ? ` · ${m.practitioner}` : ""}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5" disabled={link.isPending}
                  onClick={() => linkTo(m.id)}>
                  {link.isPending && link.variables?.appointmentId === m.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Link2 className="h-3.5 w-3.5" />}
                  ربط
                </Button>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={link.isPending}>إغلاق</Button>
          {onBookNew && entry && (
            <Button className="gap-1.5" onClick={() => onBookNew(entry)} disabled={link.isPending}>
              <CalendarPlus className="h-4 w-4" />
              حجز موعد جديد
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
