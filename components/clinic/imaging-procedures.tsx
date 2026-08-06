"use client";

// Imaging procedures live in the patient's document file (type IMAGING_PROCEDURE),
// not on the case, so the same set shows up wherever the patient is opened. This
// section reads that list and uploads/deletes straight against it.
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Loader2, Eye, Trash2, FileText, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DOCUMENT_ACCEPT, PatientDocument } from "@/lib/api/clinic-patients";
import {
  usePatientDocuments,
  useUploadPatientDocument,
  useDownloadPatientDocument,
  useDeletePatientDocument,
} from "@/lib/hooks/use-clinic-patients";

export function ImagingProcedures({ patientId, canEdit }: { patientId: string; canEdit: boolean }) {
  const t = useTranslations("clinic.physio.case");
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);

  const { data: documents = [], isLoading } = usePatientDocuments(patientId);
  const uploadDoc = useUploadPatientDocument();
  const downloadDoc = useDownloadPatientDocument();
  const deleteDoc = useDeletePatientDocument();

  const procedures = (documents as PatientDocument[]).filter((d) => d.type === "IMAGING_PROCEDURE");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t("medicalHistory.imagingProcedures")}</Label>
        {canEdit && (
          <label
            className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-sm transition-colors hover:bg-muted ${
              uploadDoc.isPending ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {uploadDoc.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {uploadDoc.isPending ? t("uploading") : t("medicalHistory.uploadImage")}
            <input
              type="file"
              accept={DOCUMENT_ACCEPT.IMAGING_PROCEDURE}
              className="hidden"
              disabled={uploadDoc.isPending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadDoc.mutate({ patientId, file, type: "IMAGING_PROCEDURE" });
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">…</p>
      ) : procedures.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("medicalHistory.noImaging")}</p>
      ) : (
        <div className="space-y-2">
          {procedures.map((doc) => {
            const isVideo = doc.mimeType?.startsWith("video/");
            return (
              <div key={doc.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  {isVideo ? <Film className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {doc.fileName || t("medicalHistory.imagingProcedures")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(doc.uploadedAt ?? doc.createdAt).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <button
                  type="button"
                  title={t("viewFile")}
                  className="text-primary hover:opacity-80 disabled:opacity-40"
                  disabled={downloadDoc.isPending}
                  onClick={() => downloadDoc.mutate({ patientId, docId: doc.id })}
                >
                  <Eye className="h-4 w-4" />
                </button>
                {canEdit && (
                  <button
                    type="button"
                    title={t("deleteFile")}
                    className="text-destructive hover:opacity-80"
                    onClick={() => setDeleteDocId(doc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteDocId}
        onOpenChange={(o) => { if (!o) setDeleteDocId(null); }}
        title={t("deleteFile")}
        description={t("medicalHistory.deleteImagingConfirm")}
        confirmText={t("deleteFile")}
        variant="destructive"
        onConfirm={() => {
          if (deleteDocId) deleteDoc.mutate({ patientId, docId: deleteDocId });
          setDeleteDocId(null);
        }}
      />
    </div>
  );
}
