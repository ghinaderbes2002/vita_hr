"use client";

import { useRef } from "react";
import { Paperclip, Upload, Loader2, ExternalLink, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useUploadAttachment } from "@/lib/hooks/use-mail";
import type { MailAttachment } from "@/lib/api/mail";
import { useAuthStore } from "@/lib/stores/auth-store";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function decodeFileName(name: string): string {
  // Try URL-encoding fix first
  if (name.includes("%")) {
    try {
      const urlDecoded = decodeURIComponent(name);
      if (urlDecoded !== name) return urlDecoded;
    } catch {
      // not URL encoded
    }
  }

  // Fix UTF-8 mojibake: bytes were stored/transmitted as Latin-1 but are actually UTF-8
  // Check if string looks like mojibake (Latin-extended chars, no real Arabic Unicode)
  if (/[À-ÿ]/.test(name) && !/[؀-ۿ]/.test(name)) {
    try {
      const bytes = new Uint8Array(name.length);
      for (let i = 0; i < name.length; i++) bytes[i] = name.charCodeAt(i) & 0xFF;
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (decoded !== name) return decoded;
    } catch {
      // not valid UTF-8 bytes, keep original
    }
  }

  return name;
}

function fileUrl(attachmentId: string): string {
  const token = useAuthStore.getState().accessToken || "";
  const base = `/api/mail-file/${attachmentId}`;
  return token ? `${base}?t=${encodeURIComponent(token)}` : base;
}

async function downloadFile(url: string, fileName: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch {
    window.open(url, "_blank");
  }
}

interface ListProps {
  attachments: MailAttachment[];
}

export function AttachmentList({ attachments }: ListProps) {
  const t = useTranslations("mail");
  if (attachments.length === 0) return null;

  return (
    <div className="border rounded-md divide-y mt-4">
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/30">
        <Paperclip className="h-4 w-4" />
        {t("attachments", { count: attachments.length })}
      </div>
      {attachments.map((a) => (
        <div key={a.id} className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm truncate">{decodeFileName(a.fileName)}</span>
            <span className="text-xs text-muted-foreground shrink-0">{formatSize(a.fileSize)}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!/\.(xlsx?|csv|docx?)$/i.test(a.fileName) && (
              <a
                href={fileUrl(a.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs h-7 px-2 rounded-md hover:bg-accent transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("open")}
              </a>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs h-7 px-2 rounded-md hover:bg-accent transition-colors"
              onClick={() => downloadFile(fileUrl(a.id), decodeFileName(a.fileName))}
            >
              <Download className="h-3.5 w-3.5" />
              {t("download")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

interface UploadProps {
  messageId: string;
}

export function AttachmentUpload({ messageId }: UploadProps) {
  const t = useTranslations("mail");
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
        {upload.isPending ? t("uploading") : t("attachFile")}
      </Button>
    </div>
  );
}
