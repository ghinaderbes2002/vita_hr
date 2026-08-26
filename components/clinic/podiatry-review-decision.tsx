"use client";

// المراجعات و قرار الطبيب — a reception carries a list of reviews and one
// doctor decision. Everything is written in place, no dialogs except the delete
// confirmation. The decision also carries the button that pings the clinic
// doctors that something is waiting for them.
import { useState } from "react";
import { useTranslations } from "next-intl";
import { BellRing, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PodiatryReview } from "@/lib/api/clinic-podiatry";
import {
  useCreatePodiatryReview, useDeletePodiatryReview, useNotifyPodiatryDoctorDecision,
  usePodiatryDoctorDecision, usePodiatryReviews, useSavePodiatryDoctorDecision,
  useUpdatePodiatryReview,
} from "@/lib/hooks/use-clinic-podiatry";

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "");

/** Read-only stand-in for the textarea, matching the assessment tab. */
function Note({ value }: { value?: string | null }) {
  return (
    <div className={`min-h-16 whitespace-pre-wrap rounded-md border bg-muted/40 px-3 py-2 text-sm ${value ? "" : "text-muted-foreground"}`}>
      {value || "—"}
    </div>
  );
}

export function PodiatryReviewCard({ receptionId, canEdit }: { receptionId: string; canEdit: boolean }) {
  const tf = useTranslations("clinic.podiatry.form") as unknown as (k: string) => string;
  const tc = useTranslations("common") as unknown as (k: string) => string;
  const { data: reviews = [], isLoading } = usePodiatryReviews(receptionId);
  const create = useCreatePodiatryReview();
  const update = useUpdatePodiatryReview();
  const remove = useDeletePodiatryReview();

  // Only one row is open at a time: `null` id means the new-review row.
  const [editingId, setEditingId] = useState<string | null | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PodiatryReview | null>(null);
  const saving = create.isPending || update.isPending;

  const startNew = () => { setEditingId(null); setDraft(""); };
  const startEdit = (r: PodiatryReview) => { setEditingId(r.id); setDraft(r.notes ?? ""); };
  const cancel = () => { setEditingId(undefined); setDraft(""); };

  const save = async () => {
    const notes = draft.trim();
    if (!notes) return;
    if (editingId) await update.mutateAsync({ receptionId, reviewId: editingId, notes });
    else await create.mutateAsync({ receptionId, notes });
    cancel();
  };

  const editor = (
    <div className="space-y-2 rounded-lg border p-3">
      <Textarea
        rows={3}
        autoFocus
        className="resize-none text-sm"
        placeholder={tf("review.notesPlaceholder")}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="gap-1.5" disabled={saving || !draft.trim()} onClick={save}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {tc("save")}
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" disabled={saving} onClick={cancel}>
          <X className="h-3.5 w-3.5" />
          {tc("cancel")}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">
              {tf("review.title")}{reviews.length > 0 ? ` (${reviews.length})` : ""}
            </CardTitle>
            {canEdit && editingId === undefined && (
              <Button size="sm" className="gap-1.5" onClick={startNew}>
                <Plus className="h-3.5 w-3.5" />
                {tf("review.add")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="h-16 animate-pulse rounded-md bg-muted" />
          ) : (
            <>
              {editingId === null && editor}

              {reviews.length === 0 && editingId === undefined ? (
                <p className="text-sm text-muted-foreground text-center py-6">{tf("review.empty")}</p>
              ) : (
                reviews.map((r) =>
                  editingId === r.id ? (
                    <div key={r.id}>{editor}</div>
                  ) : (
                    <div key={r.id} className="space-y-1.5 rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                          <span>{fmt(r.createdAt)}</span>
                          {r.createdByName && <span className="font-medium text-foreground">{r.createdByName}</span>}
                        </div>
                        {canEdit && editingId === undefined && (
                          <div className="flex flex-wrap gap-1">
                            <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => startEdit(r)}>
                              <Pencil className="h-3 w-3" />
                              {tc("edit")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(r)}
                            >
                              <Trash2 className="h-3 w-3" />
                              {tc("delete")}
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{r.notes || "—"}</p>
                    </div>
                  ),
                )
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title={tf("review.deleteTitle")}
        description={tf("review.deleteDesc")}
        onConfirm={() => {
          if (deleteTarget) remove.mutate({ receptionId, reviewId: deleteTarget.id });
          setDeleteTarget(null);
        }}
      />
    </>
  );
}

export function PodiatryDoctorDecisionCard({ receptionId, canEdit }: { receptionId: string; canEdit: boolean }) {
  const tf = useTranslations("clinic.podiatry.form") as unknown as (k: string) => string;
  const { data: decision, isLoading } = usePodiatryDoctorDecision(receptionId);
  const save = useSavePodiatryDoctorDecision();
  const notify = useNotifyPodiatryDoctorDecision();
  const [draft, setDraft] = useState<string | null>(null);
  // The draft starts as null so a decision that arrives after the first render
  // is still picked up; typing takes over from then on.
  const value = draft ?? decision?.decision ?? "";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">{tf("review.decisionTitle")}</CardTitle>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={notify.isPending}
              onClick={() => notify.mutate(receptionId)}
            >
              {notify.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
              {tf("review.notifyDoctor")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="h-16 animate-pulse rounded-md bg-muted" />
        ) : canEdit ? (
          <>
            <Textarea
              rows={3}
              className="resize-none text-sm"
              placeholder={tf("review.decisionPlaceholder")}
              value={value}
              onChange={(e) => setDraft(e.target.value)}
            />
            <Button
              size="sm"
              className="gap-1.5"
              disabled={save.isPending || value === (decision?.decision ?? "")}
              onClick={() => save.mutate({ receptionId, decision: value })}
            >
              {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {tf("review.saveDecision")}
            </Button>
          </>
        ) : (
          <Note value={decision?.decision} />
        )}
      </CardContent>
    </Card>
  );
}
