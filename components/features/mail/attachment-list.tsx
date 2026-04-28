"use client";

import { useRef, useState } from "react";
import { Paperclip, Eye, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadAttachment } from "@/lib/hooks/use-mail";
import type { MailAttachment } from "@/lib/api/mail";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function openFile(attachmentId: string) {
  const res = await apiClient.get(`/mail/attachments/${attachmentId}/file`, {
    responseType: "blob",
    headers: { "Cache-Control": "no-cache" },
  });
  const url = URL.createObjectURL(res.data);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

interface ListProps {
  attachments: MailAttachment[];
}

export function AttachmentList({ attachments }: ListProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  if (attachments.length === 0) return null;

  const handleOpen = async (a: MailAttachment) => {
    setDownloading(a.id);
    try {
      await openFile(a.id);
    } catch {
      toast.error("فشل فتح الملف");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="border rounded-md divide-y mt-4">
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/30">
        <Paperclip className="h-4 w-4" />
        المرفقات ({attachments.length})
      </div>
      {attachments.map((a) => (
        <div key={a.id} className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm truncate">{a.fileName}</span>
            <span className="text-xs text-muted-foreground shrink-0">{formatSize(a.fileSize)}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-xs shrink-0"
            disabled={downloading === a.id}
            onClick={() => handleOpen(a)}
          >
            {downloading === a.id
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Eye className="h-3.5 w-3.5" />}
            فتح
          </Button>
        </div>
      ))}
    </div>
  );
}

interface UploadProps {
  messageId: string;
}

export function AttachmentUpload({ messageId }: UploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAttachment();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    upload.mutate({ messageId, file });
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
        onChange={handleChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => inputRef.current?.click()}
        disabled={upload.isPending}
      >
        {upload.isPending
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <Upload className="h-3.5 w-3.5" />}
        {upload.isPending ? "جاري الرفع..." : "إرفاق ملف"}
      </Button>
    </div>
  );
}
