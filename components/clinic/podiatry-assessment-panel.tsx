"use client";

// The reception's assessment, read and written in place: the same fields switch
// from marks to controls when "تعديل" is pressed, so nothing covers the sheet
// while it is being filled in. POST upserts, so the first save creates the form
// and later ones patch it.
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Pencil, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import {
  useCreatePodiatrySession, useUpdatePodiatrySession,
} from "@/lib/hooks/use-clinic-podiatry";
import { PodiatrySession } from "@/lib/api/clinic-podiatry";
import {
  AssessmentValue, PodiatryAssessmentFields, assessmentOf, assessmentToDto, emptyAssessment,
} from "./podiatry-assessment-fields";

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "");

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

  const t = useTranslations("clinic.podiatry.form.panel");

  const create = useCreatePodiatrySession();
  const update = useUpdatePodiatrySession();
  const saving = create.isPending || update.isPending;

  const startEditing = () => {
    setForm(assessmentOf(session));
    setEditing(true);
  };

  const handleSave = async () => {
    const dto = assessmentToDto(form);
    if (session) {
      await update.mutateAsync({ receptionId, sessionId: session.id, dto });
    } else {
      await create.mutateAsync({ receptionId, dto });
    }
    setEditing(false);
  };

  // Reading shows the stored form; editing shows the draft being typed.
  const shown = editing ? form : assessmentOf(session);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-base">{title}</CardTitle>
            {session && <span className="text-xs text-muted-foreground">{fmt(session.createdAt)}</span>}
            {/* Who typed the form in — not necessarily the clinician signing it. */}
            {!editing && session?.createdByName && (
              <span className="text-xs text-muted-foreground">{t("filledBy")}: {session.createdByName}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!editing && actions}
            {editing ? (
              <>
                <Button size="sm" variant="outline" className="gap-1.5" disabled={saving} onClick={() => setEditing(false)}>
                  <X className="h-3.5 w-3.5" />
                  {t("cancel")}
                </Button>
                <Button size="sm" className="gap-1.5" disabled={saving} onClick={handleSave}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {t("save")}
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
                  {session ? t("edit") : t("fill")}
                </Button>
              </ActionGuard>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!session && !editing ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t("notFilled")}</p>
        ) : (
          <PodiatryAssessmentFields value={shown} onChange={setForm} readOnly={!editing} />
        )}
      </CardContent>
    </Card>
  );
}
