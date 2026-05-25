"use client";

import { useState } from "react";
import { ArrowRight, Archive, Trash2, Reply, ReplyAll, ChevronDown, ChevronRight, MessageSquare, FolderOpen, Forward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useMailMessage, useMailThread, useArchiveFolders, useDeleteMail, useMoveMail } from "@/lib/hooks/use-mail";
import { AttachmentList } from "./attachment-list";
import { ComposeMailModal } from "./compose-mail-modal";
import { EmployeeName } from "./employee-name";

interface Props {
  messageId: string;
  onBack: () => void;
  folder?: string;
}

export function MailDetail({ messageId, onBack, folder }: Props) {
  const { data, isLoading } = useMailMessage(messageId);
  const { data: thread = [] } = useMailThread(messageId);
  const { data: archiveFolders = [] } = useArchiveFolders();
  const deleteMail = useDeleteMail();
  const moveMail   = useMoveMail();
  const [replyOpen, setReplyOpen]       = useState(false);
  const [replyAll, setReplyAll]         = useState(false);
  const [forwardOpen, setForwardOpen]   = useState(false);
  const [expandedIds, setExpandedIds]   = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

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

  const senderInfo = message.senderInfo ?? message.sender;
  const senderName = senderInfo
    ? `${senderInfo.firstNameAr} ${senderInfo.lastNameAr}`
    : null;

  const defaultSubject = `رد: ${message.subject}`;
  const defaultToIds = replyAll
    ? toRecipients.map((r) => (r as any).employeeInfo?.employeeId ?? r.recipientId)
    : [(senderInfo as any)?.employeeId ?? message.senderId];

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
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => setForwardOpen(true)}
        >
          <Forward className="h-4 w-4" />
          تحويل
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5" disabled={moveMail.isPending}>
              <Archive className="h-4 w-4" />
              أرشفة
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-40">
            <DropdownMenuItem
              onClick={async () => {
                await moveMail.mutateAsync({ messageIds: [messageId], folder: "ARCHIVE" });
                onBack();
              }}
            >
              <Archive className="h-4 w-4 ml-2" />
              الأرشيف العام
            </DropdownMenuItem>
            {archiveFolders.length > 0 && (
              <>
                <DropdownMenuSeparator />
                {archiveFolders.map((af) => (
                  <DropdownMenuItem
                    key={af.id}
                    onClick={async () => {
                      await moveMail.mutateAsync({
                        messageIds: [messageId],
                        folder: "ARCHIVE",
                        archiveFolderId: af.id,
                      });
                      onBack();
                    }}
                  >
                    <FolderOpen className="h-4 w-4 ml-2" />
                    {af.name}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {folder !== "TRASH" && (
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
        )}
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
                ? toRecipients.map((r) => {
                    const info = r.employeeInfo ?? r.recipient;
                    return (
                      <Badge key={r.id} variant="secondary" className="text-xs">
                        {info
                          ? `${info.firstNameAr} ${info.lastNameAr}`
                          : <EmployeeName userId={r.recipientId} />}
                      </Badge>
                    );
                  })
                : <span className="text-muted-foreground">—</span>}
            </div>
          </div>
          {ccRecipients.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground w-10 shrink-0 pt-0.5">نسخة:</span>
              <div className="flex flex-wrap gap-1">
                {ccRecipients.map((r) => {
                  const info = r.employeeInfo ?? r.recipient;
                  return (
                    <Badge key={r.id} variant="outline" className="text-xs">
                      {info
                        ? `${info.firstNameAr} ${info.lastNameAr}`
                        : <EmployeeName userId={r.recipientId} />}
                    </Badge>
                  );
                })}
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

        {/* Thread */}
        {thread.length > 1 && (
          <div className="mt-4">
            <Separator className="mb-4" />
            <div className="flex items-center gap-1.5 mb-3 text-xs text-muted-foreground font-medium">
              <MessageSquare className="h-3.5 w-3.5" />
              المحادثة ({thread.length} رسائل)
            </div>
            <div className="space-y-3">
              {thread
                .filter((m) => m.id !== messageId)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((m) => {
                  const expanded = expandedIds.has(m.id);
                  const senderN = m.sender
                    ? `${m.sender.firstNameAr} ${m.sender.lastNameAr}`
                    : null;
                  return (
                    <div key={m.id} className="rounded-lg border bg-card shadow-sm overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleExpand(m.id)}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-right"
                      >
                        {/* Avatar */}
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-semibold text-primary">
                            {(senderN ?? "?")[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-sm font-semibold truncate">
                              {senderN ?? <EmployeeName userId={m.senderId} />}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                              {format(new Date(m.createdAt), "d MMM · HH:mm", { locale: ar })}
                            </span>
                          </div>
                          {!expanded && (
                            <p className="text-xs text-muted-foreground truncate">
                              {m.body.slice(0, 100)}{m.body.length > 100 ? "..." : ""}
                            </p>
                          )}
                        </div>
                        {expanded
                          ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
                          : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />}
                      </button>
                      {expanded && (
                        <div className="px-5 py-4 border-t bg-muted/5 text-sm leading-relaxed whitespace-pre-wrap">
                          {m.body}
                          {m.attachments && m.attachments.length > 0 && (
                            <div className="mt-3">
                              <AttachmentList attachments={m.attachments} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
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

      {/* Forward modal */}
      {forwardOpen && (
        <ComposeMailModal
          open={forwardOpen}
          onClose={() => setForwardOpen(false)}
          forwardMessageId={messageId}
          defaultSubject={`Fwd: ${message.subject}`}
        />
      )}

    </div>
  );
}
