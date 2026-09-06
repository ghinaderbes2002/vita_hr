"use client";

import { Paperclip, ExternalLink, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { mailApi, type MailAttachment } from "@/lib/api/mail";

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

/** Long enough for the tab or the save dialog to have read the blob. */
const BLOB_TTL_MS = 60_000;

async function openAttachment(attachmentId: string, onError: () => void) {
  // The tab has to be opened inside the click itself — opening it after the
  // await below counts as a popup and browsers block it. It sits blank until
  // the bytes land.
  const tab = window.open("", "_blank");
  try {
    const blob = await mailApi.getAttachmentFile(attachmentId);
    const url = URL.createObjectURL(blob);
    if (tab) tab.location.href = url;
    else window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), BLOB_TTL_MS);
  } catch {
    tab?.close();
    onError();
  }
}

async function downloadAttachment(attachmentId: string, fileName: string, onError: () => void) {
  try {
    const blob = await mailApi.getAttachmentFile(attachmentId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), BLOB_TTL_MS);
  } catch {
    onError();
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
        <div key={a.id} className="flex flex-wrap gap-2 items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm truncate">{decodeFileName(a.fileName)}</span>
            <span className="text-xs text-muted-foreground shrink-0">{formatSize(a.fileSize)}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!/\.(xlsx?|csv|docx?)$/i.test(a.fileName) && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs h-7 px-2 rounded-md hover:bg-accent transition-colors"
                onClick={() => openAttachment(a.id, () => toast.error(t("attachmentError")))}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("open")}
              </button>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs h-7 px-2 rounded-md hover:bg-accent transition-colors"
              onClick={() => downloadAttachment(a.id, decodeFileName(a.fileName), () => toast.error(t("attachmentError")))}
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
