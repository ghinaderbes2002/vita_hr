"use client";

import { useState } from "react";
import { ArrowRight, Archive, Trash2, Reply, ReplyAll } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useMailMessage, useDeleteMail, useMoveMail } from "@/lib/hooks/use-mail";
import { AttachmentList } from "./attachment-list";
import { ComposeMailModal } from "./compose-mail-modal";
import { EmployeeName } from "./employee-name";

interface Props {
  messageId: string;
  onBack: () => void;
}

export function MailDetail({ messageId, onBack }: Props) {
  const { data, isLoading } = useMailMessage(messageId);
  const deleteMail = useDeleteMail();
  const moveMail   = useMoveMail();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyAll, setReplyAll]   = useState(false);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
        <Separator />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!data) return null;

  const message = "message" in data ? data.message : data;
  // استثني نسخة المرسل في SENT — نريد المستقبلين الفعليين فقط
  const toRecipients = message.recipients?.filter(
    (r) => r.type === "TO" && r.folder !== "SENT"
  ) ?? [];
  const ccRecipients = message.recipients?.filter(
    (r) => r.type === "CC" && r.folder !== "SENT"
  ) ?? [];

  const senderName = message.sender
    ? `${message.sender.firstNameAr} ${message.sender.lastNameAr}`
    : null;

  const defaultSubject = `رد: ${message.subject}`;
  const defaultToIds = replyAll
    ? toRecipients.map((r) => r.recipientId)
    : [message.senderId];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/20">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowRight className="h-4 w-4" />
          رجوع
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => { setReplyAll(false); setReplyOpen(true); }}
        >
          <Reply className="h-4 w-4" />
          رد
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => { setReplyAll(true); setReplyOpen(true); }}
        >
          <ReplyAll className="h-4 w-4" />
          رد على الكل
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={async () => {
            await moveMail.mutateAsync({ messageIds: [messageId], folder: "ARCHIVE" });
            onBack();
          }}
        >
          <Archive className="h-4 w-4" />
          أرشفة
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-red-600 hover:text-red-700"
          onClick={async () => {
            await deleteMail.mutateAsync(messageId);
            onBack();
          }}
        >
          <Trash2 className="h-4 w-4" />
          حذف
        </Button>
      </div>

      {/* Message content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {/* Subject */}
        <h2 className="text-lg font-semibold">{message.subject}</h2>

        {/* Meta */}
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-10 shrink-0">من:</span>
            <span className="font-medium">
              {senderName ?? <EmployeeName userId={message.senderId} />}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground w-10 shrink-0 pt-0.5">إلى:</span>
            <div className="flex flex-wrap gap-1">
              {toRecipients.length > 0
                ? toRecipients.map((r) => (
                    <Badge key={r.id} variant="secondary" className="text-xs">
                      {r.recipient
                        ? `${r.recipient.firstNameAr} ${r.recipient.lastNameAr}`
                        : <EmployeeName userId={r.recipientId} />}
                    </Badge>
                  ))
                : <span className="text-muted-foreground">—</span>}
            </div>
          </div>
          {ccRecipients.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground w-10 shrink-0 pt-0.5">نسخة:</span>
              <div className="flex flex-wrap gap-1">
                {ccRecipients.map((r) => (
                  <Badge key={r.id} variant="outline" className="text-xs">
                    {r.recipient
                      ? `${r.recipient.firstNameAr} ${r.recipient.lastNameAr}`
                      : <EmployeeName userId={r.recipientId} />}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-10 shrink-0">وقت:</span>
            <span className="text-muted-foreground">
              {format(new Date(message.createdAt), "PPPp", { locale: ar })}
            </span>
          </div>
        </div>

        <Separator />

        {/* Body */}
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.body}</div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <AttachmentList attachments={message.attachments} />
        )}
      </div>

      {/* Reply modal */}
      {replyOpen && (
        <ComposeMailModal
          open={replyOpen}
          onClose={() => setReplyOpen(false)}
          replyToMessageId={messageId}
          defaultSubject={defaultSubject}
          defaultToIds={defaultToIds}
        />
      )}
    </div>
  );
}
