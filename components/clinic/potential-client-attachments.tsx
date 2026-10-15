"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ActionGuard } from "@/components/permissions/action-guard";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import {
  clinicPotentialClientsApi,
  PotentialClientAttachment,
  POTENTIAL_CLIENT_ATTACHMENT_MAX_BYTES,
  POTENTIAL_CLIENT_ATTACHMENT_TYPES,
} from "@/lib/api/clinic-potential-clients";
import {
  useDeletePotentialClientAttachment,
  usePotentialClientAttachments,
  useUploadPotentialClientAttachment,
} from "@/lib/hooks/use-clinic-potential-clients";

/** Long enough for the new tab to have read the blob. */
const BLOB_TTL_MS = 60_000;

const fmtSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/**
 * The bytes typed as what the record says they are, and only when that is a
 * type the server accepts. A blob opened in a tab runs on this app's origin,
 * so it must never be typed as anything a browser would execute.
 */
function safeBlob(blob: Blob, mimeType: string): Blob {
  const type = POTENTIAL_CLIENT_ATTACHMENT_TYPES.includes(mimeType) ? mimeType : "application/octet-stream";
  return new Blob([blob], { type });
}

function AttachmentCard({
  clientId, att, onDelete,
}: {
  clientId: string;
  att: PotentialClientAttachment;
  onDelete: () => void;
}) {
  const isImage = att.mimeType?.startsWith("image/");
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  // Images load straight away for the thumbnail; a PDF only when it is opened.
  useEffect(() => {
    if (!isImage) return;
    let url: string | undefined;
    clinicPotentialClientsApi.downloadAttachment(clientId, att.id)
      .then((blob) => { url = URL.createObjectURL(safeBlob(blob, att.mimeType)); setThumbUrl(url); })
      .catch(() => {});
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [clientId, att.id, att.mimeType, isImage]);

  const open = async () => {
    if (thumbUrl) { window.open(thumbUrl, "_blank"); return; }
    // The tab has to open inside the click itself; opened after the await it
    // counts as a popup and is blocked. It stays blank until the bytes land.
    const tab = window.open("", "_blank");
    setOpening(true);
    try {
      const blob = await clinicPotentialClientsApi.downloadAttachment(clientId, att.id);
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
    <div className="group relative rounded-lg border overflow-hidden hover:border-primary transition-colors">
      <button type="button" onClick={open} className="block w-full text-right" title={att.fileName}>
        {isImage ? (
          thumbUrl
            ? <img src={thumbUrl} alt={att.fileName} className="w-full h-24 object-cover bg-muted" />
            : <div className="w-full h-24 bg-muted flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
        ) : (
          <div className="w-full h-24 bg-muted flex flex-col items-center justify-center gap-1">
            {opening
              ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              : <FileText className="h-6 w-6 text-muted-foreground" />}
            <span className="text-xs font-mono font-semibold text-muted-foreground">PDF</span>
          </div>
        )}
        <div className="p-2 border-t bg-background">
          <p className="text-xs font-medium truncate" dir="auto">{att.fileName}</p>
          {att.fileSize > 0 && <p className="text-xs text-muted-foreground">{fmtSize(att.fileSize)}</p>}
        </div>
      </button>
      <ActionGuard permission={PERMISSIONS.CLINIC_POTENTIAL_CLIENTS.UPLOAD_ATTACHMENTS}>
        <button
          type="button"
          onClick={onDelete}
          aria-label="حذف المرفق"
          className="absolute top-1 left-1 h-6 w-6 rounded bg-destructive/80 hover:bg-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
        >
          <Trash2 className="h-3 w-3 text-white" />
        </button>
      </ActionGuard>
    </div>
  );
}

/** Keeps the files the server would accept; tells the user about the rest. */
function acceptableFiles(files: File[]): File[] {
  const wrongType = files.filter((f) => !POTENTIAL_CLIENT_ATTACHMENT_TYPES.includes(f.type));
  const tooLarge = files.filter(
    (f) => POTENTIAL_CLIENT_ATTACHMENT_TYPES.includes(f.type) && f.size > POTENTIAL_CLIENT_ATTACHMENT_MAX_BYTES,
  );
  if (wrongType.length > 0) {
    toast.error(`نوع الملف غير مسموح (JPG أو PNG أو PDF فقط): ${wrongType.map((f) => f.name).join("، ")}`);
  }
  if (tooLarge.length > 0) {
    toast.error(`الملفات التالية أكبر من 10MB: ${tooLarge.map((f) => f.name).join("، ")}`);
  }
  return files.filter((f) => !wrongType.includes(f) && !tooLarge.includes(f));
}

const ACCEPT = ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf";

/**
 * Files chosen while adding a client. Nothing is uploaded here — the record
 * has no id yet — so the caller uploads them once the client is saved.
 */
export function PendingAttachmentsPicker({
  files, onChange, disabled,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const { hasPermission, isAdmin } = usePermissions();
  const fileRef = useRef<HTMLInputElement>(null);
  if (!isAdmin() && !hasPermission(PERMISSIONS.CLINIC_POTENTIAL_CLIENTS.UPLOAD_ATTACHMENTS)) return null;

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = acceptableFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
    const names = new Set(files.map((f) => f.name));
    onChange([...files, ...picked.filter((f) => !names.has(f.name))]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Paperclip className="h-3.5 w-3.5" />
          المرفقات{files.length > 0 ? ` (${files.length})` : ""}
        </p>
        <input ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={handleFiles} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 h-8"
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
          إضافة مرفق
        </Button>
      </div>
      {files.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
          صور أو ملفات PDF حتى 10MB. تُرفع بعد حفظ العميل.
        </p>
      ) : (
        <ul className="space-y-1">
          {files.map((f) => (
            <li key={f.name} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs">
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate" dir="auto">{f.name}</span>
              <span className="text-muted-foreground shrink-0">{fmtSize(f.size)}</span>
              <button
                type="button"
                aria-label={`إزالة ${f.name}`}
                disabled={disabled}
                onClick={() => onChange(files.filter((x) => x !== f))}
                className="text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Photos and PDFs on one potential client's record. */
export function PotentialClientAttachments({ clientId }: { clientId: string }) {
  const { hasPermission, isAdmin } = usePermissions();
  const canView = isAdmin() || hasPermission(PERMISSIONS.CLINIC_POTENTIAL_CLIENTS.VIEW_ATTACHMENTS);
  const canUpload = isAdmin() || hasPermission(PERMISSIONS.CLINIC_POTENTIAL_CLIENTS.UPLOAD_ATTACHMENTS);

  const { data: attachments = [], isLoading } = usePotentialClientAttachments(clientId, canView);
  const upload = useUploadPotentialClientAttachment(clientId);
  const remove = useDeletePotentialClientAttachment(clientId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [toDelete, setToDelete] = useState<PotentialClientAttachment | null>(null);

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
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Paperclip className="h-3.5 w-3.5" />
          المرفقات{canView && attachments.length > 0 ? ` (${attachments.length})` : ""}
        </p>
        {canUpload && (
          <>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={handleFiles}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 h-8"
              disabled={upload.isPending}
              onClick={() => fileRef.current?.click()}
            >
              {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {upload.isPending ? "جارٍ الرفع..." : "رفع مرفق"}
            </Button>
          </>
        )}
      </div>

      {!canView ? (
        <p className="text-xs text-muted-foreground">ليس لديك صلاحية لعرض المرفقات.</p>
      ) : isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : attachments.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
          لا توجد مرفقات. {canUpload && "يمكن رفع صور أو ملفات PDF حتى 10MB."}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {attachments.map((att) => (
            <AttachmentCard key={att.id} clientId={clientId} att={att} onDelete={() => setToDelete(att)} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => { if (!o) setToDelete(null); }}
        title="حذف المرفق"
        description={toDelete ? `سيتم حذف «${toDelete.fileName}» نهائياً.` : undefined}
        confirmText="حذف"
        variant="destructive"
        onConfirm={() => { if (toDelete) remove.mutate(toDelete.id); setToDelete(null); }}
      />
    </div>
  );
}
