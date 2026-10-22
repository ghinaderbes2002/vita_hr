"use client";

// Photos and PDFs on an orthotics reception. Same shape as the potential-client
// attachments: the file sits behind the token, so it is fetched as a blob and
// shown through an object URL, never an <img src> straight at the API.
import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import {
  clinicOrthoticsApi,
  isOrthoticsAttachmentType,
  ORTHOTICS_ATTACHMENT_MAX_BYTES,
  type OrthoticsAttachment,
} from "@/lib/api/clinic-orthotics";
import {
  useDeleteOrthoticsAttachment,
  useOrthoticsAttachments,
  useUploadOrthoticsAttachment,
} from "@/lib/hooks/use-clinic-orthotics";

/** Long enough for the new tab to have read the blob. */
const BLOB_TTL_MS = 60_000;

const ACCEPT = "image/*,.heic,.heif,.pdf,application/pdf";

const fmtSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/**
 * The bytes typed as what the record says they are, and only when that is a
 * type the server accepts. A blob opened in a tab runs on this app's origin,
 * so it must never be typed as anything a browser would execute (SVG included).
 */
function safeBlob(blob: Blob, mimeType: string): Blob {
  const ok = isOrthoticsAttachmentType(mimeType) && mimeType !== "image/svg+xml";
  return new Blob([blob], { type: ok ? mimeType : "application/octet-stream" });
}

/** HEIC from a phone often arrives with an empty type — judged by extension then. */
const isAcceptable = (f: File) =>
  isOrthoticsAttachmentType(f.type) || (!f.type && /\.(heic|heif)$/i.test(f.name));

function acceptableFiles(files: File[]): File[] {
  const wrongType = files.filter((f) => !isAcceptable(f));
  const tooLarge = files.filter((f) => isAcceptable(f) && f.size > ORTHOTICS_ATTACHMENT_MAX_BYTES);
  if (wrongType.length > 0) {
    toast.error(`نوع الملف غير مسموح (صور أو PDF فقط): ${wrongType.map((f) => f.name).join("، ")}`);
  }
  if (tooLarge.length > 0) {
    toast.error(`الملفات التالية أكبر من 15MB: ${tooLarge.map((f) => f.name).join("، ")}`);
  }
  return files.filter((f) => !wrongType.includes(f) && !tooLarge.includes(f));
}

function AttachmentCard({
  receptionId, att, canDelete, onDelete,
}: {
  receptionId: string;
  att: OrthoticsAttachment;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const isImage = att.mimeType?.startsWith("image/");
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [thumbFailed, setThumbFailed] = useState(false);
  const [opening, setOpening] = useState(false);

  // Images load straight away for the thumbnail; a PDF only when it is opened.
  useEffect(() => {
    if (!isImage) return;
    let url: string | undefined;
    clinicOrthoticsApi.downloadAttachment(receptionId, att.id)
      .then((blob) => { url = URL.createObjectURL(safeBlob(blob, att.mimeType)); setThumbUrl(url); })
      .catch(() => setThumbFailed(true));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [receptionId, att.id, att.mimeType, isImage]);

  const open = async () => {
    if (thumbUrl) { window.open(thumbUrl, "_blank"); return; }
    // The tab has to open inside the click itself; opened after the await it
    // counts as a popup and is blocked. It stays blank until the bytes land.
    const tab = window.open("", "_blank");
    setOpening(true);
    try {
      const blob = await clinicOrthoticsApi.downloadAttachment(receptionId, att.id);
      const url = URL.createObjectURL(safeBlob(blob, att.mimeType));
      if (tab) tab.location.href = url;
      else window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), BLOB_TTL_MS);
    } catch {
      tab?.close();
      toast.error("تعذّر فتح المرفق");
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-lg border transition-colors hover:border-primary">
      <button type="button" onClick={open} className="block w-full text-start" title={att.fileName}>
        {isImage && !thumbFailed ? (
          thumbUrl
            ? <img src={thumbUrl} alt={att.fileName} className="h-28 w-full bg-muted object-cover" />
            : <div className="flex h-28 w-full items-center justify-center bg-muted">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
        ) : (
          <div className="flex h-28 w-full flex-col items-center justify-center gap-1 bg-muted">
            {opening
              ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              : <FileText className="h-6 w-6 text-muted-foreground" />}
            <span className="font-mono text-xs font-semibold text-muted-foreground">
              {isImage ? "IMG" : "PDF"}
            </span>
          </div>
        )}
        <div className="border-t bg-background p-2">
          <p className="truncate text-xs font-medium" dir="auto">{att.fileName}</p>
          <p className="text-xs text-muted-foreground">
            {att.fileSize > 0 && fmtSize(att.fileSize)}
            {att.uploadedAt && <span className="ms-2">{new Date(att.uploadedAt).toLocaleDateString("en-GB")}</span>}
          </p>
        </div>
      </button>
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="حذف المرفق"
          className="absolute end-1 top-1 flex h-6 w-6 items-center justify-center rounded bg-destructive/80 opacity-0 transition-opacity hover:bg-destructive focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Trash2 className="h-3 w-3 text-white" />
        </button>
      )}
    </div>
  );
}

export function OrthoticsAttachments({ receptionId }: { receptionId: string }) {
  const { hasPermission, isAdmin } = usePermissions();
  const canView = isAdmin() || hasPermission(PERMISSIONS.CLINIC_ORTHOTICS.VIEW_ATTACHMENTS);
  const canUpload = isAdmin() || hasPermission(PERMISSIONS.CLINIC_ORTHOTICS.UPLOAD_ATTACHMENTS);

  const { data: attachments = [], isLoading } = useOrthoticsAttachments(receptionId, canView);
  const upload = useUploadOrthoticsAttachment(receptionId);
  const remove = useDeleteOrthoticsAttachment(receptionId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [toDelete, setToDelete] = useState<OrthoticsAttachment | null>(null);

  if (!canView && !canUpload) return null;

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = acceptableFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
    // One at a time, so each failure gets its own message and the rest still land.
    for (const file of files) {
      try { await upload.mutateAsync(file); } catch { /* toast shown by the hook */ }
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <Paperclip className="h-4 w-4" />
            المرفقات{canView && attachments.length > 0 ? ` (${attachments.length})` : ""}
          </CardTitle>
          {canUpload && (
            <>
              <input ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={handleFiles} />
              <Button
                type="button"
                size="sm"
                className="gap-1.5 bg-orange-500 text-white hover:bg-orange-600"
                disabled={upload.isPending}
                onClick={() => fileRef.current?.click()}
              >
                {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {upload.isPending ? "جارٍ الرفع..." : "رفع مرفق"}
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!canView ? (
          <p className="text-sm text-muted-foreground">ليس لديك صلاحية لعرض المرفقات.</p>
        ) : isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : attachments.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            لا توجد مرفقات. {canUpload && "يمكن رفع صور أو ملفات PDF حتى 15MB."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {attachments.map((att) => (
              <AttachmentCard
                key={att.id}
                receptionId={receptionId}
                att={att}
                canDelete={canUpload}
                onDelete={() => setToDelete(att)}
              />
            ))}
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => { if (!o) setToDelete(null); }}
        title="حذف المرفق"
        description={toDelete ? `سيتم حذف «${toDelete.fileName}» نهائياً.` : undefined}
        confirmText="حذف"
        variant="destructive"
        onConfirm={() => { if (toDelete) remove.mutate(toDelete.id); setToDelete(null); }}
      />
    </Card>
  );
}
