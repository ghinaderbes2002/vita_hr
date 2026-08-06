"use client";

// Follow-ups: the visits logged after the treatment sessions are over. Same
// fields as a session, kept as its own list on the case.
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Save, Trash2, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PhysioFollowUp } from "@/lib/api/clinic-physio";
import {
  usePhysioFollowUps,
  useAddPhysioFollowUp,
  useUpdatePhysioFollowUp,
  useDeletePhysioFollowUp,
} from "@/lib/hooks/use-clinic-physio";

type FormState = {
  sessionDate: string;
  sessionTime: string;
  notes: string;
  supervisorOpinion: string;
  doctorDecision: string;
};

const emptyForm = (): FormState => ({
  sessionDate: new Date().toISOString().slice(0, 10),
  sessionTime: "",
  notes: "",
  supervisorOpinion: "",
  doctorDecision: "",
});

const formOf = (f: PhysioFollowUp): FormState => ({
  sessionDate: f.sessionDate?.slice(0, 10) ?? "",
  sessionTime: f.sessionTime ?? "",
  notes: f.notes ?? "",
  supervisorOpinion: f.supervisorOpinion ?? "",
  doctorDecision: f.doctorDecision ?? "",
});

// Empty strings are dropped so a cleared field isn't sent as "".
const dtoOf = (f: FormState) => ({
  sessionDate: f.sessionDate,
  sessionTime: f.sessionTime || undefined,
  notes: f.notes || undefined,
  supervisorOpinion: f.supervisorOpinion || undefined,
  doctorDecision: f.doctorDecision || undefined,
});

function Fields({ value, onChange, t }: { value: FormState; onChange: (v: FormState) => void; t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label className="text-xs">{t("followUps.date")}</Label>
        <Input type="date" value={value.sessionDate} onChange={(e) => onChange({ ...value, sessionDate: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">{t("followUps.time")}</Label>
        <Input type="time" value={value.sessionTime} onChange={(e) => onChange({ ...value, sessionTime: e.target.value })} />
      </div>
      <div className="space-y-1 col-span-2">
        <Label className="text-xs">{t("followUps.notes")}</Label>
        <Textarea rows={2} value={value.notes} placeholder={t("followUps.notesPlaceholder")}
          onChange={(e) => onChange({ ...value, notes: e.target.value })} />
      </div>
      <div className="space-y-1 col-span-2">
        <Label className="text-xs">{t("followUps.supervisorOpinion")}</Label>
        <Textarea rows={2} value={value.supervisorOpinion} placeholder={t("followUps.supervisorOpinionPlaceholder")}
          onChange={(e) => onChange({ ...value, supervisorOpinion: e.target.value })} />
      </div>
      <div className="space-y-1 col-span-2">
        <Label className="text-xs">{t("followUps.doctorDecision")}</Label>
        <Textarea rows={2} value={value.doctorDecision} placeholder={t("followUps.doctorDecisionPlaceholder")}
          onChange={(e) => onChange({ ...value, doctorDecision: e.target.value })} />
      </div>
    </div>
  );
}

export function PhysioFollowUps({ caseId, canEdit }: { caseId: string; canEdit: boolean }) {
  const t = useTranslations("clinic.physio.case");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<{ id: string; form: FormState } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: followUps = [], isLoading } = usePhysioFollowUps(caseId);
  const addFollowUp = useAddPhysioFollowUp();
  const updateFollowUp = useUpdatePhysioFollowUp();
  const deleteFollowUp = useDeletePhysioFollowUp();

  const handleAdd = async () => {
    if (!form.sessionDate) return;
    await addFollowUp.mutateAsync({ id: caseId, dto: dtoOf(form) });
    setForm(emptyForm());
  };

  const handleUpdate = async () => {
    if (!editing) return;
    await updateFollowUp.mutateAsync({ id: caseId, followUpId: editing.id, dto: dtoOf(editing.form) });
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-sm font-semibold">{t("followUps.addTitle")}</p>
          <Fields value={form} onChange={setForm} t={t} />
          <Button onClick={handleAdd} disabled={!form.sessionDate || addFollowUp.isPending} className="w-full gap-2">
            {addFollowUp.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t("followUps.add")}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-semibold">{t("followUps.listTitle")}</p>
        {isLoading ? (
          <Skeleton className="h-24 w-full rounded-lg" />
        ) : followUps.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("followUps.empty")}</p>
        ) : (
          followUps.map((f) => (
            <div key={f.id} className="rounded-lg border p-3 space-y-2">
              {editing?.id === f.id ? (
                <div className="space-y-3">
                  <Fields value={editing.form} onChange={(v) => setEditing({ id: f.id, form: v })} t={t} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleUpdate} disabled={updateFollowUp.isPending} className="gap-1">
                      {updateFollowUp.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      {t("followUps.save")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)}>{t("followUps.cancel")}</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {f.sessionDate ? new Date(f.sessionDate).toLocaleDateString("en-GB") : "—"}
                      </span>
                      {f.sessionTime && <span className="text-xs text-muted-foreground">{f.sessionTime}</span>}
                    </div>
                    {canEdit && (
                      <div className="flex gap-1 shrink-0">
                        <button type="button" title={t("followUps.edit")} className="p-1 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditing({ id: f.id, form: formOf(f) })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" className="p-1 text-destructive hover:opacity-70" onClick={() => setDeleteId(f.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {f.notes && <p className="text-xs text-muted-foreground">{f.notes}</p>}
                  {(f.supervisorOpinion || f.doctorDecision) && (
                    <div className="grid grid-cols-2 gap-3 border-t pt-2">
                      {f.supervisorOpinion && (
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-medium text-muted-foreground">{t("followUps.supervisorOpinion")}</p>
                          <p className="text-xs">{f.supervisorOpinion}</p>
                        </div>
                      )}
                      {f.doctorDecision && (
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-medium text-muted-foreground">{t("followUps.doctorDecision")}</p>
                          <p className="text-xs">{f.doctorDecision}</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        title={t("followUps.deleteTitle")}
        description={t("followUps.deleteDescription")}
        confirmText={t("followUps.delete")}
        variant="destructive"
        onConfirm={() => {
          if (deleteId) deleteFollowUp.mutate({ id: caseId, followUpId: deleteId });
          setDeleteId(null);
        }}
      />
    </div>
  );
}
