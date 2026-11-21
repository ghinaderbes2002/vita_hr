"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CircleDashed, Loader2, Pencil, Plus, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { isClinicalDepartmentName } from "@/lib/clinic/departments";
import {
  useDeleteOrthoticsFollowUp, useOrthoticsFollowUps, useSaveOrthoticsFollowUp, useSaveOrthoticsSuitability,
} from "@/lib/hooks/use-clinic-orthotics";
import type { OrthoticsFollowUp, OrthoticsReception } from "@/lib/api/clinic-orthotics";
import { doctorAssessmentOf, physioAssessmentOf, prosthetistAssessmentOf } from "./orthotics-labels";

const fmtDate = (iso?: string | null) => (iso ? iso.slice(0, 10) : "—");
const fmtStamp = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" }) : "—";

function useStaffNames() {
  const { data = [] } = useEmployeesBasicList();
  return useMemo(() => {
    const byEmp: Record<string, string> = {};
    const byUser: Record<string, string> = {};
    for (const e of data) {
      const name = `${e.firstNameAr} ${e.lastNameAr}`.trim();
      byEmp[e.id] = name;
      if (e.userId) byUser[e.userId] = name;
    }
    return { byEmp, byUser, list: data };
  }, [data]);
}

// ─── اللجنة: آراء المقيّمين (للقراءة) ─────────────────────────────────────────

/**
 * The three assessors' opinions, shown read-only where the committee decides.
 * They are written and edited on their own tabs; this is the same saved text.
 */
export function OrthoticsOpinionsCard({ reception }: { reception: OrthoticsReception }) {
  const opinions = [
    {
      label: "رأي طبيب العظمية",
      text: doctorAssessmentOf(reception).doctorOpinion,
      by: reception.doctorAssessmentUpdatedByName,
    },
    {
      label: "رأي المعالج الفيزيائي",
      text: physioAssessmentOf(reception).physioOpinion,
      by: reception.physioAssessmentUpdatedByName,
    },
    {
      label: "رأي أخصائي الأطراف الصناعية",
      text: prosthetistAssessmentOf(reception).prosthetistOpinion,
      by: reception.prosthetistOpinionUpdatedByName,
    },
  ];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">آراء المقيّمين</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {opinions.map((o) => {
          const has = !!o.text?.trim();
          return (
            <div key={o.label} className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Label>{o.label}</Label>
                {has && (
                  <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs text-orange-700">
                    {o.by || "غير مسجَّل"}
                  </span>
                )}
                {has && (
                  <span className="flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs text-green-700">
                    <CheckCircle2 className="h-3 w-3" />
                    محفوظ — للقراءة فقط
                  </span>
                )}
              </div>
              <div className="min-h-16 rounded-md border bg-muted/30 px-3 py-2.5 text-sm whitespace-pre-line">
                {has ? o.text : <span className="text-muted-foreground">لم يُكتب بعد</span>}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── اللجنة: قرار المناسبة ─────────────────────────────────────────────────────

type Decision = "yes" | "no" | "undecided";
const toDecision = (v?: boolean | null): Decision => (v === true ? "yes" : v === false ? "no" : "undecided");

/**
 * The committee's suitability decision. Three states, not two: a reception
 * nobody has decided on yet is "لم يُقرَّر", never "غير مناسب".
 */
export function OrthoticsCommitteeTab({ reception, canEdit }: { reception: OrthoticsReception; canEdit: boolean }) {
  const save = useSaveOrthoticsSuitability();
  const { byUser } = useStaffNames();
  const current = toDecision(reception.isSuitable);
  const [editing, setEditing] = useState(false);
  const [decision, setDecision] = useState<Decision>(current);
  const [note, setNote] = useState(reception.suitabilityNote ?? "");
  const [target, setTarget] = useState(reception.targetAppliancesCount != null ? String(reception.targetAppliancesCount) : "");

  const startEdit = () => {
    // The switch has two positions; an undecided case opens on "غير مناسب" and
    // stays undecided until the decision is saved.
    setDecision(current === "undecided" ? "no" : current);
    setNote(reception.suitabilityNote ?? "");
    setTarget(reception.targetAppliancesCount != null ? String(reception.targetAppliancesCount) : "");
    setEditing(true);
  };

  const submit = async () => {
    // Notes are required with every decision, as in the prosthetics committee.
    if (decision === "undecided" || !note.trim()) return;
    await save.mutateAsync({
      id: reception.id,
      dto: {
        isSuitable: decision === "yes",
        suitabilityNote: note.trim(),
        ...(target !== "" ? { targetAppliancesCount: Number(target) } : {}),
      },
    });
    setEditing(false);
  };

  const badge = {
    yes: { icon: CheckCircle2, text: "مناسب", cls: "border-green-300 bg-green-50 text-green-800" },
    no: { icon: XCircle, text: "غير مناسب", cls: "border-red-300 bg-red-50 text-red-800" },
    undecided: { icon: CircleDashed, text: "لم يُقرَّر بعد", cls: "border-muted bg-muted/40 text-muted-foreground" },
  }[current];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">قرار اللجنة</CardTitle>
          {canEdit && !editing && (
            <Button size="sm" className="gap-1.5 bg-orange-500 text-white hover:bg-orange-600" onClick={startEdit}>
              <Pencil className="h-3.5 w-3.5" />
              {current === "undecided" ? "اتخاذ القرار" : "تعديل القرار"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!editing ? (
          <>
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold ${badge.cls}`}>
              <badge.icon className="h-4 w-4" />
              {badge.text}
            </div>
            {reception.suitabilityNote && (
              <div className={current === "no" ? "rounded-md border border-red-200 bg-red-50/60 p-3" : ""}>
                <p className="text-xs text-muted-foreground">{current === "no" ? "سبب عدم المناسبة" : "ملاحظة اللجنة"}</p>
                <p className="mt-0.5 text-sm whitespace-pre-line">{reception.suitabilityNote}</p>
              </div>
            )}
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">عدد المقومات المطلوبة (تقييم الطبيب)</p>
                <p className="font-medium">{reception.appliancesCount ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">عدد المقومات المعتمد من اللجنة</p>
                <p className="font-medium">{reception.targetAppliancesCount ?? "—"}</p>
              </div>
            </div>
            {reception.suitabilityUpdatedAt && (
              <p className="text-xs text-muted-foreground">
                قرّره{(() => {
                  const name = reception.suitabilityUpdatedByName
                    ?? (reception.suitabilityUpdatedBy ? byUser[reception.suitabilityUpdatedBy] : undefined);
                  return name ? ` ${name}` : "";
                })()}
                {" "}— {fmtStamp(reception.suitabilityUpdatedAt)}
              </p>
            )}
          </>
        ) : (
          <div className="space-y-4">
            {/* Same layout as the prosthetics committee: a switch between the two answers. */}
            <div className="space-y-1.5">
              <Label>هل المريض مناسب للمقوّم؟</Label>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">غير مناسب</span>
                <Switch
                  checked={decision === "yes"}
                  onCheckedChange={(v) => setDecision(v ? "yes" : "no")}
                />
                <span className="text-sm text-muted-foreground">مناسب</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>
                الملاحظات
                <span className="text-destructive"> *</span>
              </Label>
              <Textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ملاحظات اللجنة..."
              />
            </div>
            <div className="space-y-1.5 sm:max-w-xs">
              <Label>عدد المقومات المعتمد</Label>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={target}
                onChange={(e) => setTarget(e.target.value.replace(/[^\d]/g, ""))}
                placeholder={reception.appliancesCount != null ? `الطبيب طلب ${reception.appliancesCount}` : ""}
              />
            </div>
            <div className="space-y-2">
              <Button
                onClick={submit}
                disabled={!note.trim() || save.isPending}
                className="w-full gap-2"
              >
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                حفظ القرار
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setEditing(false)}>إلغاء</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── الجلسات: جلسات المتابعة ─────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = () => ({ visitDate: today(), findings: "", actions: "", practitionerId: "" });

/**
 * Follow-up sessions. Read-only when the committee found the case not
 * suitable — following up an unsuitable case makes no sense.
 */
export function OrthoticsSessionsTab({
  reception, canEdit, canView,
}: { reception: OrthoticsReception; canEdit: boolean; canView: boolean }) {
  const { data: sessions = [], isLoading } = useOrthoticsFollowUps(reception.id, canView);
  const saveSession = useSaveOrthoticsFollowUp(reception.id);
  const removeSession = useDeleteOrthoticsFollowUp(reception.id);
  const { byEmp, list } = useStaffNames();
  const notSuitable = reception.isSuitable === false;
  const writable = canEdit && !notSuitable;

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<OrthoticsFollowUp | null>(null);

  const openNew = () => { setEditingId(null); setForm(emptyForm()); setFormOpen(true); };
  const openEdit = (s: OrthoticsFollowUp) => {
    setEditingId(s.id);
    setForm({ visitDate: fmtDate(s.visitDate), findings: s.findings ?? "", actions: s.actions ?? "", practitionerId: s.practitionerId ?? "" });
    setFormOpen(true);
  };

  const submit = async () => {
    if (!form.visitDate || !form.findings.trim()) return;
    await saveSession.mutateAsync({
      followUpId: editingId ?? undefined,
      dto: {
        visitDate: form.visitDate,
        findings: form.findings.trim(),
        actions: form.actions.trim() || undefined,
        // Empty: the API records the current user.
        ...(form.practitionerId ? { practitionerId: form.practitionerId } : {}),
      },
    });
    setFormOpen(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">جلسات المتابعة</CardTitle>
          {writable && !formOpen && (
            <Button size="sm" className="gap-1.5 bg-orange-500 text-white hover:bg-orange-600" onClick={openNew}>
              <Plus className="h-3.5 w-3.5" /> جلسة جديدة
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {notSuitable && (
          <p className="rounded-md border border-red-200 bg-red-50/60 px-3 py-2 text-xs text-red-800">
            قرّرت اللجنة أن الحالة غير مناسبة — الجلسات للعرض فقط.
          </p>
        )}

        {formOpen && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-medium">{editingId ? "تعديل الجلسة" : "جلسة جديدة"}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>تاريخ الزيارة *</Label>
                <Input type="date" value={form.visitDate} onChange={(e) => setForm((f) => ({ ...f, visitDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>المعالج</Label>
                <Select value={form.practitionerId || "me"} onValueChange={(v) => setForm((f) => ({ ...f, practitionerId: v === "me" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="me">أنا (المستخدم الحالي)</SelectItem>
                    {list.filter((e) =>
                      // Only active staff of the medical administration and its departments
                      // (prosthetics, podiatry, physio) — plus whoever an edited session
                      // already names, so the select never loses its current value.
                      e.id === form.practitionerId || (
                        (!e.employmentStatus || e.employmentStatus === "ACTIVE")
                        && isClinicalDepartmentName(e.department?.nameAr)
                      )).map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.firstNameAr} {e.lastNameAr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ما لوحظ بالجلسة *</Label>
              <Textarea rows={3} value={form.findings} onChange={(e) => setForm((f) => ({ ...f, findings: e.target.value }))} placeholder="مثلاً: تحسّن بوضعية القدم، لا نقاط ضغط" />
            </div>
            <div className="space-y-1.5">
              <Label>الإجراء المتَّخذ</Label>
              <Textarea rows={2} value={form.actions} onChange={(e) => setForm((f) => ({ ...f, actions: e.target.value }))} placeholder="مثلاً: تعديل زاوية المفصل" />
            </div>
            <div className="flex gap-2">
              <Button onClick={submit} disabled={!form.visitDate || !form.findings.trim() || saveSession.isPending} className="gap-1.5">
                {saveSession.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                حفظ
              </Button>
              <Button variant="outline" onClick={() => setFormOpen(false)}>إلغاء</Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : sessions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">لا توجد جلسات متابعة بعد.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono font-medium">{fmtDate(s.visitDate)}</span>
                    {(s.practitionerName || s.practitionerId) && (
                      <span className="text-muted-foreground">— {s.practitionerName ?? (s.practitionerId ? byEmp[s.practitionerId] : null) ?? "معالج"}</span>
                    )}
                  </div>
                  {writable && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="تعديل" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" aria-label="حذف" onClick={() => setDeleteTarget(s)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="mt-1.5 text-sm whitespace-pre-line">{s.findings}</p>
                {s.actions && (
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">
                    <span className="font-medium text-foreground">الإجراء: </span>{s.actions}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="حذف الجلسة؟"
        variant="destructive"
        description={deleteTarget ? `جلسة ${fmtDate(deleteTarget.visitDate)} — لا يمكن التراجع.` : ""}
        onConfirm={async () => {
          if (deleteTarget) await removeSession.mutateAsync(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </Card>
  );
}
