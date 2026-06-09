"use client";

import { useState, useRef } from "react";
import { ArrowRight, Archive, Trash2, Reply, ReplyAll, ChevronDown, ChevronRight, MessageSquare, FolderOpen, Forward, Pencil, History, AlertCircle, Bold, Underline, Italic } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useMailMessage, useMailThread, useArchiveFolders, useDeleteMail, useMoveMail, useEditMail } from "@/lib/hooks/use-mail";
import { useAuthStore } from "@/lib/stores/auth-store";
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
  const editMail   = useEditMail();
  const { user }   = useAuthStore();
  const [replyOpen, setReplyOpen]       = useState(false);
  const [replyAll, setReplyAll]         = useState(false);
  const [forwardOpen, setForwardOpen]   = useState(false);
  const [expandedIds, setExpandedIds]   = useState<Set<string>>(new Set());
  const [editOpen, setEditOpen]         = useState(false);
  const [editSubject, setEditSubject]   = useState("");
  const [editBody, setEditBody]         = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen]   = useState(false);
  const [activeHistory, setActiveHistory] = useState<any[]>([]);
  const editBodyRef = useRef<HTMLTextAreaElement>(null);
  const t = useTranslations("mail");

  const applyEditFormat = (tag: "b" | "u" | "i") => {
    const ta = editBodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = editBody.slice(start, end);
    if (!selected) return;
    const wrapped = `<${tag}>${selected}</${tag}>`;
    const newBody = editBody.slice(0, start) + wrapped + editBody.slice(end);
    setEditBody(newBody);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + tag.length + 2, start + tag.length + 2 + selected.length);
    }, 0);
  };

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
  const isSender = message.senderId === user?.id
    || (senderInfo as any)?.employeeId === user?.employeeId
    || message.senderId === user?.employeeId;
  const editHistory = (data as any).editHistory ?? (message as any).editHistory ?? [];
  const senderName = senderInfo
    ? `${senderInfo.firstNameAr} ${senderInfo.lastNameAr}`
    : null;

  const renderBody = (body: string) => {
    // Body is stored as HTML from the rich-text editor — render directly.
    // For plain-text bodies (no tags), convert newlines to <br>.
    const isHtml = /<[a-z][\s\S]*>/i.test(body);
    return { __html: isHtml ? body : body.replace(/\n/g, "<br>") };
  };

  const stripTags = (text: string) => text.replace(/<[^>]*>/g, "");

  const defaultSubject = `${t("rePrefix")}${message.subject}`;
  const getRecipientEmpId = (r: any) =>
    r.employeeInfo?.employeeId ?? r.recipient?.id ?? r.recipientId;

  const defaultToIds = replyAll
    ? toRecipients.map(getRecipientEmpId).filter(Boolean)
    : isSender
      ? toRecipients.map(getRecipientEmpId).filter(Boolean)
      : [(senderInfo as any)?.employeeId].filter(Boolean);

  const defaultCcIds = replyAll
    ? ccRecipients.map(getRecipientEmpId).filter(Boolean)
    : [];

  const getDisplayName = (r: any) => {
    const info = r.employeeInfo ?? r.recipient ?? r.recipientInfo;
    if (!info) return null;
    return `${info.firstNameAr ?? ""} ${info.lastNameAr ?? ""}`.trim() || null;
  };
  const replyAllDisplayNames: string[] = isSender
    ? [
        ...toRecipients.map(getDisplayName),
        ...ccRecipients.map(getDisplayName),
      ].filter((n): n is string => !!n)
    : [
        senderName,
        ...ccRecipients.map(getDisplayName),
      ].filter((n): n is string => !!n);

  const replyAllRecipients: { employeeId: string; type: "TO" | "CC" }[] = isSender
    ? [
        ...toRecipients.map((r: any) => ({ employeeId: getRecipientEmpId(r), type: "TO" as const })),
        ...ccRecipients.map((r: any) => ({ employeeId: getRecipientEmpId(r), type: "CC" as const })),
      ].filter((r) => !!r.employeeId)
    : [
        ...((senderInfo as any)?.employeeId ? [{ employeeId: (senderInfo as any).employeeId, type: "TO" as const }] : []),
        ...ccRecipients.map((r: any) => ({ employeeId: getRecipientEmpId(r), type: "CC" as const })).filter((r) => !!r.employeeId),
      ];

  const forwardSenderLine = senderName
    ? `${t("forwardFrom")}: ${senderName}`
    : "";
  const forwardDateLine = message.createdAt
    ? `${t("forwardDate")}: ${format(new Date(message.createdAt), "PPP", { locale: ar })}`
    : "";
  const forwardDefaultBody = [
    "",
    "",
    t("forwardedHeader"),
    forwardSenderLine,
    `${t("forwardSubject")}: ${message.subject}`,
    forwardDateLine,
    "",
    stripTags(message.body ?? ""),
  ]
    .filter((l, i) => i < 3 || l !== "")
    .join("\n");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/20">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowRight className="h-4 w-4" />
          {t("back")}
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => { setReplyAll(false); setReplyOpen(true); }}
        >
          <Reply className="h-4 w-4" />
          {t("reply")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => { setReplyAll(true); setReplyOpen(true); }}
        >
          <ReplyAll className="h-4 w-4" />
          {t("replyAll")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => setForwardOpen(true)}
        >
          <Forward className="h-4 w-4" />
          {t("forward")}
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5" disabled={moveMail.isPending}>
              <Archive className="h-4 w-4" />
              {t("archiveAction")}
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
              {t("generalArchive")}
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
            {t("delete")}
          </Button>
        )}
        {isSender && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setEditingMessageId(messageId);
              setEditSubject(message.subject);
              setEditBody(message.body);
              setEditOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
            {t("edit")}
          </Button>
        )}
      </div>

      {/* Message content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {/* Subject */}
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-semibold">{message.subject}</h2>
          {message.importance === "HIGH" && (
            <Badge className="bg-red-100 text-red-700 border-red-300 text-xs gap-1">
              <AlertCircle className="h-3 w-3" />
              {t("highImportance")}
            </Badge>
          )}
        </div>

        {/* Meta */}
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-10 shrink-0">{t("from")}</span>
            <span className="font-medium">
              {senderName ?? <EmployeeName userId={message.senderId} />}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground w-10 shrink-0 pt-0.5">{t("to")}</span>
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
              <span className="text-muted-foreground w-10 shrink-0 pt-0.5">{t("cc")}</span>
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
            <span className="text-muted-foreground w-10 shrink-0">{t("time")}</span>
            <span className="text-muted-foreground">
              {format(new Date(message.createdAt), "PPPp", { locale: ar })}
            </span>
          </div>
        </div>

        <Separator />

        {/* Body */}
        <div className="text-sm leading-relaxed wrap-break-word" dangerouslySetInnerHTML={renderBody(message.body)} />

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <AttachmentList attachments={message.attachments} />
        )}

        {/* Edit history */}
        {editHistory.length > 0 && (
          <div className="text-xs text-muted-foreground border-t pt-3 mt-2">
            {editHistory.length === 1 ? (
              <p className="flex items-center gap-1.5">
                <Pencil className="h-3 w-3" />
                {t("editedBy", { name: editHistory[0].editedByName, date: format(new Date(editHistory[0].editedAt), "dd/MM/yyyy HH:mm", { locale: ar }) })}
              </p>
            ) : (
              <div>
                <button
                  type="button"
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  onClick={() => { setActiveHistory(editHistory); setHistoryOpen(true); }}
                >
                  <History className="h-3 w-3" />
                  {t("editHistory", { count: editHistory.length })}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Thread */}
        {thread.length > 1 && (
          <div className="mt-4">
            <Separator className="mb-4" />
            <div className="flex items-center gap-1.5 mb-3 text-xs text-muted-foreground font-medium">
              <MessageSquare className="h-3.5 w-3.5" />
              {t("thread", { count: thread.length })}
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
                  const isThreadSender = m.senderId === user?.id
                    || m.senderId === user?.employeeId;
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
                              {stripTags(m.body).slice(0, 100)}{m.body.length > 100 ? "..." : ""}
                            </p>
                          )}
                        </div>
                        {expanded
                          ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
                          : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />}
                      </button>
                      {expanded && (
                        <div className="px-5 py-4 border-t bg-muted/5 text-sm leading-relaxed">
                          <div className="wrap-break-word" dangerouslySetInnerHTML={renderBody(m.body)} />
                          {m.attachments && m.attachments.length > 0 && (
                            <div className="mt-3">
                              <AttachmentList attachments={m.attachments} />
                            </div>
                          )}
                          {((m as any).editHistory ?? []).length > 0 && (
                            <div className="text-xs text-muted-foreground border-t pt-3 mt-2">
                              {(m as any).editHistory.length === 1 ? (
                                <p className="flex items-center gap-1.5">
                                  <Pencil className="h-3 w-3" />
                                  {t("editedBy", { name: (m as any).editHistory[0].editedByName, date: format(new Date((m as any).editHistory[0].editedAt), "dd/MM/yyyy HH:mm", { locale: ar }) })}
                                </p>
                              ) : (
                                <button
                                  type="button"
                                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveHistory((m as any).editHistory);
                                    setHistoryOpen(true);
                                  }}
                                >
                                  <History className="h-3 w-3" />
                                  {t("editHistory", { count: (m as any).editHistory.length })}
                                </button>
                              )}
                            </div>
                          )}
                          {isThreadSender && (
                            <div className="mt-3 pt-2 border-t">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1.5 h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingMessageId(m.id);
                                  setEditSubject(m.subject ?? "");
                                  setEditBody(m.body);
                                  setEditOpen(true);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                                {t("editMyReply")}
                              </Button>
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

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              {t("editMessageTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("subject")}</Label>
              <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("body")}</Label>
              <div className="flex items-center gap-0.5 border rounded-t-md px-2 py-1 bg-muted/30 border-b-0">
                {([
                  { tag: "b" as const, icon: Bold, title: t("bold") },
                  { tag: "u" as const, icon: Underline, title: t("underline") },
                  { tag: "i" as const, icon: Italic, title: t("italic") },
                ]).map(({ tag, icon: Icon, title }) => (
                  <button
                    key={tag}
                    type="button"
                    title={title}
                    onClick={() => applyEditFormat(tag)}
                    className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
              <Textarea
                ref={editBodyRef}
                rows={6}
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="rounded-t-none border-t-0 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{t("cancel")}</Button>
            <Button
              disabled={(!editSubject.trim() && !editBody.trim()) || editMail.isPending}
              onClick={() => {
                const dto: any = {};
                if (editSubject !== message.subject) dto.subject = editSubject;
                if (editBody !== message.body) dto.body = editBody;
                if (!Object.keys(dto).length) { setEditOpen(false); return; }
                editMail.mutate({ id: editingMessageId ?? messageId, dto }, { onSuccess: () => setEditOpen(false) });
              }}
            >
              {editMail.isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit history dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4" />
              {t("editHistory", { count: activeHistory.length })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-80 overflow-y-auto">
            {activeHistory.map((h: any, i: number) => (
              <div key={i} className="rounded-lg border p-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{h.editedByName}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(h.editedAt), "dd/MM/yyyy HH:mm", { locale: ar })}
                  </span>
                </div>
                {h.previousSubject && (
                  <p className="text-xs text-muted-foreground">{t("previousSubject")} {h.previousSubject}</p>
                )}
                {h.previousBody && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{t("previousBody")} {h.previousBody}</p>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>{t("close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply modal */}
      {replyOpen && (
        <ComposeMailModal
          open={replyOpen}
          onClose={() => setReplyOpen(false)}
          {...(replyAll
            ? { replyAllMessageId: messageId, replyAllDisplayNames, replyAllRecipients }
            : { replyToMessageId: messageId, defaultToIds, defaultCcIds }
          )}
          defaultSubject={defaultSubject}
          quotedBody={message.body ?? ""}
        />
      )}

      {/* Forward modal */}
      {forwardOpen && (
        <ComposeMailModal
          open={forwardOpen}
          onClose={() => setForwardOpen(false)}
          forwardMessageId={messageId}
          defaultSubject={t("fwdPrefix") + message.subject}
          defaultBody={forwardDefaultBody}
          forwardAttachments={message.attachments ?? []}
        />
      )}

    </div>
  );
}
