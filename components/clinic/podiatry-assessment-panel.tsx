"use client";

// The reception's assessment, read and written in place: the same fields switch
// from marks to controls when "تعديل" is pressed, so nothing covers the sheet
// while it is being filled in. POST upserts, so the first save creates the form
// and later ones patch it.
import { useState } from "react";
import { Loader2, PenLine, Pencil, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SignaturePadDialog } from "./signature-pad-dialog";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import {
  useCreatePodiatrySession, useUpdatePodiatrySession,
} from "@/lib/hooks/use-clinic-podiatry";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { PodiatrySession } from "@/lib/api/clinic-podiatry";
import {
  AssessmentValue, PodiatryAssessmentFields, assessmentOf, assessmentToDto, emptyAssessment,
} from "./podiatry-assessment-fields";

/** The slice of an employee row this panel needs, across both list shapes. */
interface StaffRow {
  id: string;
  firstNameAr?: string;
  lastNameAr?: string;
  employmentStatus?: string;
  department?: { nameAr?: string } | null;
}
type StaffEnvelope = { data?: { items?: StaffRow[] }; items?: StaffRow[] };

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "");

function Val({ value }: { value?: string | null }) {
  return (
    <div className={`rounded-md border bg-muted/40 px-3 py-2 text-sm ${value ? "" : "text-muted-foreground"}`}>
      {value || "—"}
    </div>
  );
}

export function PodiatryAssessmentPanel({
  receptionId, session, title, actions,
}: {
  receptionId: string;
  /** The reception's saved assessment, or null while it is still unfilled. */
  session: PodiatrySession | null;
  title: string;
  /** Rendered next to the edit button — the PDF export, for example. */
  actions?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<AssessmentValue>(emptyAssessment);
  const [clinicianName, setClinicianName] = useState("");
  const [clinicianSignature, setClinicianSignature] = useState("");
  const [padOpen, setPadOpen] = useState(false);

  const create = useCreatePodiatrySession();
  const update = useUpdatePodiatrySession();
  const saving = create.isPending || update.isPending;

  // "اسم الأخصائي" is chosen from the clinical departments' staff (Medical
  // Administration, Physiotherapy, Prosthetics, Podiatry).
  const { data: staffData } = useEmployeesBasicList();
  const staff = staffData as StaffRow[] | StaffEnvelope | undefined;
  const staffList: StaffRow[] = Array.isArray(staff) ? staff : staff?.data?.items ?? staff?.items ?? [];
  const CLINICAL_DEPTS = ["الإدارة الطبية", "الادارة الطبية", "العلاج الفيزيائي", "الأطراف الصناعية", "الاطراف الصناعية", "طب الأقدام", "طب الاقدام"];
  const medicalStaff = staffList.filter((e) =>
    e.employmentStatus === "ACTIVE" &&
    CLINICAL_DEPTS.some((d) => e.department?.nameAr?.includes(d))
  );

  const startEditing = () => {
    setForm(assessmentOf(session));
    setClinicianName(session?.clinicianName ?? "");
    setClinicianSignature(session?.clinicianSignature ?? "");
    setEditing(true);
  };

  const handleSave = async () => {
    const dto = {
      ...assessmentToDto(form),
      clinicianName: clinicianName || undefined,
      clinicianSignature: clinicianSignature || undefined,
    };
    if (session) {
      await update.mutateAsync({ receptionId, sessionId: session.id, dto });
    } else {
      await create.mutateAsync({ receptionId, dto });
    }
    setEditing(false);
  };

  // Reading shows the stored form; editing shows the draft being typed.
  const shown = editing ? form : assessmentOf(session);
  const shownName = editing ? clinicianName : session?.clinicianName ?? "";
  const shownSignature = editing ? clinicianSignature : session?.clinicianSignature ?? "";
  const signatureIsImage = shownSignature.startsWith("data:") || shownSignature.startsWith("http");

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-base">{title}</CardTitle>
              {session && <span className="text-xs text-muted-foreground">{fmt(session.createdAt)}</span>}
              {!editing && session?.clinicianName && (
                <span className="text-sm font-medium">{session.clinicianName}</span>
              )}
              {/* Who typed the form in — not necessarily the clinician signing it. */}
              {!editing && session?.createdByName && (
                <span className="text-xs text-muted-foreground">عبّأ النموذج: {session.createdByName}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!editing && actions}
              {editing ? (
                <>
                  <Button size="sm" variant="outline" className="gap-1.5" disabled={saving} onClick={() => setEditing(false)}>
                    <X className="h-3.5 w-3.5" />
                    إلغاء
                  </Button>
                  <Button size="sm" className="gap-1.5" disabled={saving} onClick={handleSave}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    حفظ
                  </Button>
                </>
              ) : (
                <ActionGuard
                  permission={session
                    ? PERMISSIONS.CLINIC_PODIATRY.SESSION_EDIT
                    : PERMISSIONS.CLINIC_PODIATRY.SESSION_CREATE}
                >
                  <Button size="sm" className="gap-1.5" onClick={startEditing}>
                    {session ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {session ? "تعديل" : "تعبئة النموذج"}
                  </Button>
                </ActionGuard>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!session && !editing ? (
            <p className="text-sm text-muted-foreground text-center py-6">لم يُعبّأ النموذج بعد</p>
          ) : (
            <div className="space-y-4">
              <PodiatryAssessmentFields value={shown} onChange={setForm} readOnly={!editing} />

              <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">اسم الأخصائي</Label>
                  {editing ? (
                    <Select value={clinicianName || undefined} onValueChange={setClinicianName}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="اختر الأخصائي..." /></SelectTrigger>
                      <SelectContent>
                        {medicalStaff.map((e) => {
                          const name = `${e.firstNameAr ?? ""} ${e.lastNameAr ?? ""}`.trim();
                          return <SelectItem key={e.id} value={name}>{name}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Val value={shownName} />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">التوقيع</Label>
                  {shownSignature && signatureIsImage ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={shownSignature} alt="التوقيع" className="h-16 w-full object-contain border rounded bg-white" />
                      {editing && (
                        <button
                          type="button"
                          onClick={() => setClinicianSignature("")}
                          className="absolute top-1 left-1 rounded bg-white/80 px-1 text-xs text-destructive"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ) : editing ? (
                    <Button type="button" variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => setPadOpen(true)}>
                      <PenLine className="h-3.5 w-3.5" />
                      رسم التوقيع
                    </Button>
                  ) : (
                    <Val value={shownSignature} />
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <SignaturePadDialog
        open={padOpen}
        onOpenChange={setPadOpen}
        title="توقيع الأخصائي"
        signerName={clinicianName || undefined}
        onSign={async (base64) => setClinicianSignature(base64)}
      />
    </>
  );
}
