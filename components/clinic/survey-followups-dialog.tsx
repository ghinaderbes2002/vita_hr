"use client";

// متابعة التقييمات: مرضى مرّ أسبوع على تسليم طرفهم أو على فحص فيتافوت ولم يُقيَّموا بعد.
// زر "تقييم" يفتح استبياناً جديداً مربوطاً بالمريض والقسم مباشرة.

import { useState } from "react";
import { ClipboardCheck, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSurveyPendingFollowups } from "@/lib/hooks/use-patient-surveys";
import type { SurveyDepartment, SurveyFollowupPatient } from "@/lib/api/patient-surveys";
import type { Patient } from "@/lib/api/clinic-patients";

interface Row {
  key: string;
  patient: SurveyFollowupPatient;
  date: string;
  days: number;
}

const fullName = (p: SurveyFollowupPatient) => `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "—";

/** The header button, with the number waiting. */
export function SurveyFollowupsButton({ onClick }: { onClick: () => void }) {
  const { data } = useSurveyPendingFollowups();
  const count = (data?.prosthetics.length ?? 0) + (data?.podiatry.length ?? 0);
  return (
    <Button variant="outline" onClick={onClick} className="gap-1.5">
      <ClipboardCheck className="h-4 w-4" />
      متابعة التقييمات
      {count > 0 && <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[11px]">{count}</Badge>}
    </Button>
  );
}

export function SurveyFollowupsDialog({
  open, onOpenChange, canCreate, onRate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canCreate: boolean;
  /** Opens the new-survey dialog for this patient and department. */
  onRate: (patient: Patient, department: SurveyDepartment) => void;
}) {
  const { data, isLoading, isError } = useSurveyPendingFollowups(open);
  const [tab, setTab] = useState<"PROSTHETICS" | "PODIATRY">("PROSTHETICS");

  const prosthetics: Row[] = (data?.prosthetics ?? []).map((r) => ({
    key: r.caseId, patient: r.patient ?? { id: r.patientId }, date: r.deliveredAt, days: r.daysSinceDelivered,
  }));
  const podiatry: Row[] = (data?.podiatry ?? []).map((r) => ({
    key: r.receptionId, patient: r.patient ?? { id: r.patientId }, date: r.sessionDate, days: r.daysSinceSession,
  }));

  const list = (rows: Row[], department: SurveyDepartment, dateLabel: string) =>
    isLoading ? (
      <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
    ) : isError ? (
      <p className="py-6 text-center text-sm text-destructive">تعذّر تحميل القائمة</p>
    ) : rows.length === 0 ? (
      <p className="py-10 text-center text-sm text-muted-foreground">لا يوجد مرضى بانتظار التقييم</p>
    ) : (
      <div className="max-h-[60vh] divide-y overflow-y-auto rounded-lg border">
        {[...rows].sort((a, b) => b.days - a.days).map((r) => (
          <div key={r.key} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {fullName(r.patient)}
                {r.patient.patientNumber && <span className="ms-1.5 text-xs text-muted-foreground">({r.patient.patientNumber})</span>}
              </p>
              <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                {r.patient.phone && (
                  <a href={`tel:${r.patient.phone}`} className="flex items-center gap-1 hover:text-foreground" dir="ltr">
                    <Phone className="h-3 w-3" />{r.patient.phone}
                  </a>
                )}
                <span>{dateLabel}: <span dir="ltr">{new Date(r.date).toLocaleDateString("en-GB")}</span></span>
              </p>
            </div>
            <Badge variant="outline" className={r.days >= 14 ? "border-red-300 bg-red-50 text-red-700" : "border-amber-300 bg-amber-50 text-amber-800"}>
              منذ {r.days} يوم
            </Badge>
            {canCreate && (
              <Button size="sm" className="h-8" onClick={() => onRate(r.patient as Patient, department)}>
                تقييم
              </Button>
            )}
          </div>
        ))}
      </div>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>متابعة التقييمات</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          مرضى مرّ أسبوع أو أكثر على تسليمهم أو فحصهم ولم يُعبّأ لهم استبيان بعد.
        </p>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} dir="rtl">
          <TabsList>
            <TabsTrigger value="PROSTHETICS">الأطراف الصناعية ({prosthetics.length})</TabsTrigger>
            <TabsTrigger value="PODIATRY">فيتافوت ({podiatry.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="PROSTHETICS" className="mt-3">{list(prosthetics, "PROSTHETICS", "تاريخ التسليم")}</TabsContent>
          <TabsContent value="PODIATRY" className="mt-3">{list(podiatry, "PODIATRY", "تاريخ الفحص")}</TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
