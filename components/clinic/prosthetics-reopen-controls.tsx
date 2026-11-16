"use client";

// Completing a delivered prosthetics case after the fact.
//
// A delivered case is locked server-side (any write → CASE_DELIVERED_LOCKED).
// Someone holding clinic.prosthetics.reopen can reopen it to fill the gaps,
// then lock it again. Reopening only grants write access: `status` stays
// DELIVERED and no delivery date moves. The backend stores the missing
// required fields on the case (`missingFields`), so nothing is computed here.
import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import {
  useReopenProstheticsCase, useRelockProstheticsCase, useTreatmentPrograms, useReviewPrograms,
} from "@/lib/hooks/use-clinic-prosthetics";
import type { MissingField, ProstheticsCase } from "@/lib/api/clinic-prosthetics";

const SECTION_LABEL: Record<string, string> = {
  team: "الفريق المعالج",
  general_assessment: "التقييم العام",
  upper_assessment: "تقييم الطرف العلوي",
  lower_assessment: "تقييم الطرف السفلي",
  treatment_program: "برنامج العلاج",
  review_program: "برنامج المراجعة",
  gait_analysis: "تحليل المشي",
  balance_assessment: "تقييم التوازن",
  final_evaluation: "التقييم النهائي",
};

/** The case tab each section lives on — for the "go to" links. */
const SECTION_TAB: Record<string, string> = {
  team: "assessment",
  general_assessment: "assessment",
  upper_assessment: "assessment",
  lower_assessment: "assessment",
  treatment_program: "treatment_program",
  review_program: "treatment_program",
  gait_analysis: "gait_analysis",
  balance_assessment: "balance_assessment",
  final_evaluation: "final_evaluation",
};

const FIELD_LABEL: Record<string, string> = {
  prosthetistIds: "فني الأطراف",
  physiotherapistIds: "المعالج الفيزيائي",
  amputationDate: "تاريخ البتر",
  amputationSide: "جانب البتر",
  amputationCause: "سبب البتر",
  amputationCauseOtherDetail: "تفاصيل سبب البتر",
  clinicalHistory: "التاريخ السريري",
  residualLimbLength: "طول الجذمور",
  residualLimbShape: "شكل الجذمور",
  amputationLevelNote: "ملاحظة مستوى البتر",
  loadTolerance: "تحمّل الحمل",
  notes: "الملاحظات",
  skinNotes: "ملاحظات الجلد",
  closureNotes: "ملاحظات الإغلاق",
  skinAppearance: "مظهر الجلد",
  skinColor: "لون الجلد",
  skinTemperature: "حرارة الجلد",
  scarCondition: "حالة الندبة",
  generalHealthNotes: "ملاحظات الصحة العامة",
  otherLimbCondition: "حالة الطرف الآخر",
  sessionDate: "تاريخ الجلسة",
  sessionTime: "وقت الجلسة",
  technicianId: "الفني",
  description: "الوصف",
  assessmentDate: "تاريخ التقييم",
  residualLimbCondition: "حالة الجذمور",
  suspensionSystemUsed: "نظام التعليق",
  socksDelivered: "الجوارب المسلّمة",
  linersDelivered: "البطانات المسلّمة",
  fittingDate: "تاريخ التركيب",
  generalNotes: "ملاحظات عامة",
};

const fieldLabel = (f: string) => FIELD_LABEL[f] ?? f;

/** Missing fields grouped by section, in the backend's section order. */
function groupBySection(fields: MissingField[]) {
  const groups = new Map<string, MissingField[]>();
  for (const f of fields) {
    const list = groups.get(f.section) ?? [];
    list.push(f);
    groups.set(f.section, list);
  }
  return [...groups.entries()];
}

const SIDE_LABEL: Record<string, string> = { RIGHT: "يمين", LEFT: "يسار" };

/**
 * The per-side assessments keep one record per side; name the side so a gap on
 * the other side's record (which the case page doesn't show) is recognisable.
 */
function sideOf(caseData: ProstheticsCase | undefined, section: string, recordId?: string) {
  if (!caseData || !recordId) return null;
  const recs = section === "upper_assessment" ? caseData.upperAssessment
    : section === "lower_assessment" ? caseData.lowerAssessment
    : null;
  const side = recs?.find((r) => r.id === recordId)?.side;
  return side ? SIDE_LABEL[side] ?? side : null;
}

function MissingFieldsList({ fields, onJump, caseData }: {
  fields: MissingField[];
  onJump?: (tab: string) => void;
  caseData?: ProstheticsCase;
}) {
  // Session lists are already loaded by the case page (same query keys), so
  // these are cache hits. The number matches the "#n" on each session card.
  const caseId = caseData?.id ?? "";
  const { data: treatment = [] } = useTreatmentPrograms(caseId);
  const { data: review = [] } = useReviewPrograms(caseId);
  const sessionNumbers = (section: string, list: MissingField[]) => {
    const recs: any[] = section === "treatment_program" ? treatment
      : section === "review_program" ? review
      : [];
    if (!recs.length) return null;
    const nums = [...new Set(list.map((f) => recs.findIndex((r) => r.id === f.recordId)))]
      .filter((i) => i >= 0)
      .sort((a, b) => a - b)
      .map((i) => `#${i + 1}`);
    return nums.length ? nums.join("، ") : null;
  };
  // Per-side assessments are split by side: each side is its own record.
  const groups: [string, MissingField[], string | null][] = [];
  for (const [section, list] of groupBySection(fields)) {
    if (section === "upper_assessment" || section === "lower_assessment") {
      const bySide = new Map<string | null, MissingField[]>();
      for (const f of list) {
        const s = sideOf(caseData, section, f.recordId);
        bySide.set(s, [...(bySide.get(s) ?? []), f]);
      }
      for (const [s, l] of bySide) groups.push([section, l, s]);
    } else {
      groups.push([section, list, null]);
    }
  }
  return (
    <ul className="space-y-2">
      {groups.map(([section, list, side]) => {
        // Multi-record sections repeat a field once per record; show each once with a count.
        const counts = new Map<string, number>();
        for (const f of list) counts.set(f.field, (counts.get(f.field) ?? 0) + 1);
        const records = new Set(list.map((f) => f.recordId).filter(Boolean)).size;
        const nums = sessionNumbers(section, list);
        const tab = SECTION_TAB[section];
        return (
          <li key={`${section}-${side ?? ""}`} className="text-xs">
            <div className="flex items-center gap-2 font-medium">
              <span>{SECTION_LABEL[section] ?? section}{side && ` — ${side}`}</span>
              {nums
                ? <span className="text-muted-foreground font-normal">(الجلسات {nums})</span>
                : !side && records > 1 && <span className="text-muted-foreground font-normal">({records} سجلات)</span>}
              {tab && onJump && (
                <button type="button" className="text-primary hover:underline font-normal" onClick={() => onJump(tab)}>
                  انتقال
                </button>
              )}
            </div>
            <p className="mt-0.5 text-muted-foreground">
              {[...counts.entries()].map(([f, n]) => (n > 1 ? `${fieldLabel(f)} (×${n})` : fieldLabel(f))).join("، ")}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function ProstheticsReopenControls({
  caseData, onJumpToTab,
}: {
  caseData: ProstheticsCase;
  onJumpToTab?: (tab: string) => void;
}) {
  const { hasPermission, isAdmin } = usePermissions();
  const canReopen = isAdmin() || hasPermission(PERMISSIONS.CLINIC_PROSTHETICS.REOPEN);
  const reopen = useReopenProstheticsCase();
  const relock = useRelockProstheticsCase();

  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  // Set when relock comes back CASE_STILL_INCOMPLETE — the fields it named.
  const [blocked, setBlocked] = useState<MissingField[] | null>(null);
  const [forceReason, setForceReason] = useState("");

  const delivered = caseData.status === "DELIVERED";
  const reopened = delivered && !!caseData.isReopened;
  const missing = caseData.missingFields ?? [];

  const submitReopen = async () => {
    try {
      await reopen.mutateAsync({ id: caseData.id, reason: reopenReason.trim() });
      setReopenOpen(false);
      setReopenReason("");
    } catch { /* toast from the hook */ }
  };

  const submitRelock = async (force?: { reason: string }) => {
    try {
      await relock.mutateAsync({ id: caseData.id, force });
      setBlocked(null);
      setForceReason("");
    } catch (e: any) {
      const data = e?.response?.data;
      if (data?.code === "CASE_STILL_INCOMPLETE") {
        setBlocked(data?.details?.missingFields ?? data?.error?.details?.missingFields ?? missing);
      }
    }
  };

  return (
    <>
      {/* Header buttons */}
      {delivered && !reopened && canReopen && (
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setReopenOpen(true)}>
          <LockOpen className="h-4 w-4" />
          إعادة فتح للاستكمال
        </Button>
      )}
      {reopened && canReopen && (
        <Button variant="outline" size="sm" className="gap-2" disabled={relock.isPending} onClick={() => submitRelock()}>
          {relock.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          إعادة القفل
        </Button>
      )}

      <Dialog open={reopenOpen} onOpenChange={(o) => { if (!reopen.isPending) setReopenOpen(o); }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إعادة فتح الحالة للاستكمال</DialogTitle>
            <DialogDescription>
              تبقى الحالة «تم التسليم» ولا يتغيّر تاريخ التسليم — يُفتح التعديل فقط لاستكمال النواقص. يُسجَّل السبب في السجل الزمني.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3} value={reopenReason} onChange={(e) => setReopenReason(e.target.value)}
            placeholder="السبب (إجباري) — مثلاً: استكمال تاريخ التركيب والملاحظات"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReopenOpen(false)} disabled={reopen.isPending}>تراجع</Button>
            <Button onClick={submitReopen} disabled={reopen.isPending || !reopenReason.trim()}>
              {reopen.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              إعادة الفتح
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!blocked} onOpenChange={(o) => { if (!o && !relock.isPending) { setBlocked(null); setForceReason(""); } }}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>لا يمكن إعادة القفل بعد</DialogTitle>
            <DialogDescription>ما زالت هناك حقول إجبارية فارغة:</DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto rounded-md border p-3">
            <MissingFieldsList
              caseData={caseData}
              fields={blocked ?? []}
              onJump={onJumpToTab && ((tab) => { setBlocked(null); onJumpToTab(tab); })}
            />
          </div>
          <div className="space-y-2 rounded-md border border-amber-200 p-3 dark:border-amber-900">
            <p className="text-xs text-muted-foreground">
              أو أقفلها رغم النواقص — تبقى الحالة ضمن «الحالات الناقصة» ويُسجَّل القرار وسببه.
            </p>
            <Textarea
              rows={2} value={forceReason} onChange={(e) => setForceReason(e.target.value)}
              placeholder="سبب التجاوز (إجباري)"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setBlocked(null); setForceReason(""); }} disabled={relock.isPending}>
              متابعة الاستكمال
            </Button>
            <Button
              variant="destructive"
              disabled={relock.isPending || !forceReason.trim()}
              onClick={() => submitRelock({ reason: forceReason.trim() })}
            >
              {relock.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              تجاوز وأقفل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}

/** Reopened notice and the missing-fields list — shown under the case header. */
export function ProstheticsCaseCompleteness({
  caseData, onJumpToTab,
}: {
  caseData: ProstheticsCase;
  onJumpToTab?: (tab: string) => void;
}) {
  const { hasPermission, isAdmin } = usePermissions();
  const canReopen = isAdmin() || hasPermission(PERMISSIONS.CLINIC_PROSTHETICS.REOPEN);
  const [listOpen, setListOpen] = useState(false);
  const delivered = caseData.status === "DELIVERED";
  const reopened = delivered && !!caseData.isReopened;
  const missing = caseData.missingFields ?? [];
  if (!reopened && !(caseData.hasMissingFields && missing.length > 0)) return null;

  return (
      <div className="space-y-2">
        {reopened && (
          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
            <LockOpen className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">
                الحالة مفتوحة لاستكمال النواقص
                {caseData.reopenedAt && <span className="font-normal"> — منذ {new Date(caseData.reopenedAt).toLocaleDateString("en-GB")}</span>}
              </p>
              {caseData.reopenReason && <p className="text-xs mt-0.5">السبب: {caseData.reopenReason}</p>}
            </div>
          </div>
        )}
        {caseData.hasMissingFields && missing.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <button
              type="button"
              className="flex w-full items-center gap-2 text-sm font-medium text-start"
              onClick={() => setListOpen((v) => !v)}
              aria-expanded={listOpen}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="flex-1">
                الحالة ناقصة — {missing.length} حقل إجباري فارغ
                {delivered && !reopened && canReopen && <span className="font-normal"> (أعد فتحها لاستكمالها)</span>}
              </span>
              {listOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {listOpen && (
              <div className="mt-2 border-t border-amber-200 pt-2 dark:border-amber-900">
                <MissingFieldsList fields={missing} onJump={onJumpToTab} caseData={caseData} />
              </div>
            )}
          </div>
        )}
      </div>
  );
}
