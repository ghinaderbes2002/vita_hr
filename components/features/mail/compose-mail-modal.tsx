"use client";

import { useState, useRef } from "react";
import { Send, FileText, X, Paperclip, Loader2, Building2, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { sanitizeHtml } from "@/lib/utils/sanitize-html";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserSearchSelect } from "./user-search-select";
import { decodeFileName } from "./attachment-list";
import { useSendMail, useSaveDraft, useUploadAttachment, useForwardMail, useReplyAllMail } from "@/lib/hooks/use-mail";
import { useDepartments } from "@/lib/hooks/use-departments";
import { useEmployeesByDepartment } from "@/lib/hooks/use-employees";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// The rich editor (TipTap) is only loaded when a message is being written.
const RichMailEditor = dynamic(() => import("./editor/rich-mail-editor").then((m) => m.RichMailEditor), {
  ssr: false,
  loading: () => <div className="h-60 animate-pulse rounded-md border bg-muted/20" />,
});

function DeptChip({ id, name, onRemove }: { id: string; name: string; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const { data: employees = [], isLoading } = useEmployeesByDepartment(open ? id : "");

  return (
    <Popover open={open}>
      <div onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
        <PopoverTrigger asChild>
          <Badge variant="secondary" className="gap-1 text-xs cursor-default select-none">
            <Building2 className="h-3 w-3" />
            {name}
            <button
              type="button"
              onClick={onRemove}
              className="hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-2" side="top" onOpenAutoFocus={(e) => e.preventDefault()}>
          {isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-1">جارٍ التحميل...</p>
          ) : employees.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-1">لا يوجد موظفون</p>
          ) : (
            <ul className="space-y-0.5 max-h-48 overflow-y-auto">
              {(employees as any[]).map((emp) => (
                <li key={emp.id} className="text-xs py-0.5">
                  {emp.firstNameAr} {emp.lastNameAr}
                </li>
              ))}
            </ul>
          )}
        </PopoverContent>
      </div>
    </Popover>
  );
}

interface ForwardAttachment {
  id: string;
  fileName: string;
  fileSize: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  replyToMessageId?: string;
  replyAllMessageId?: string;
  forwardMessageId?: string;
  quotedBody?: string;
  defaultSubject?: string;
  defaultToIds?: string[];
  defaultCcIds?: string[];
  defaultBody?: string;
  forwardAttachments?: ForwardAttachment[];
  /** Shown in the forward preview; defaults to forwardAttachments. Display only. */
  forwardPreviewAttachments?: ForwardAttachment[];
}

export function ComposeMailModal({
  open,
  onClose,
  replyToMessageId,
  replyAllMessageId,
  forwardMessageId,
  quotedBody = "",
  defaultSubject = "",
  defaultToIds = [],
  defaultCcIds = [],
  defaultBody = "",
  forwardAttachments = [],
  forwardPreviewAttachments,
}: Props) {
  const previewAttachments = forwardPreviewAttachments ?? forwardAttachments;
  const [subject, setSubject] = useState(defaultSubject);
  const [toIds, setToIds] = useState<string[]>(defaultToIds);
  const [ccIds, setCcIds] = useState<string[]>(defaultCcIds);
  const [bccIds, setBccIds] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(defaultCcIds.length > 0);
  const [showBcc, setShowBcc] = useState(false);
  const [showDept, setShowDept] = useState(false);
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isHighImportance, setIsHighImportance] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Body HTML from the rich editor ("" while empty). The editor remounts on
  // every open (editorKey), so it always starts from the right content.
  const initialBody = forwardMessageId ? "" : defaultBody;
  const [bodyHtml, setBodyHtml] = useState(initialBody);
  const [editorKey, setEditorKey] = useState(0);
  // Closing by hand (X / cancel) asks first, so a half-written message isn't lost
  // to a stray click. Sending or saving a draft closes without asking.
  const [confirmClose, setConfirmClose] = useState(false);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setBodyHtml(initialBody);
      setEditorKey((k) => k + 1);
    }
  }

  // مع وجود مرفقات، النجاح يُعلن مرة واحدة بعد اكتمال الرفع لا قبله
  const hasPendingFiles = pendingFiles.length > 0;
  const sendMail = useSendMail(hasPendingFiles);
  const saveDraft = useSaveDraft();
  const uploadAttachment = useUploadAttachment(true);
  const forwardMail = useForwardMail();
  const replyAllMail = useReplyAllMail();

  const { data: deptData } = useDepartments({ limit: 200 });
  const departments: any[] = (deptData as any)?.data?.items || (deptData as any)?.data || [];

  const buildRecipients = () => [
    ...toIds.map((employeeId) => ({ employeeId, type: "TO" as const })),
    ...ccIds.map((employeeId) => ({ employeeId, type: "CC" as const })),
    ...bccIds.map((employeeId) => ({ employeeId, type: "BCC" as const })),
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const oversized = files.filter((f) => f.size > 25 * 1024 * 1024);
    if (oversized.length > 0) {
      toast.error(`الملفات التالية تتجاوز 25MB: ${oversized.map((f) => f.name).join(", ")}`);
      return;
    }
    setPendingFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...files.filter((f) => !names.has(f.name))];
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (name: string) =>
    setPendingFiles((prev) => prev.filter((f) => f.name !== name));

  const toggleDepartment = (id: string) => {
    setDepartmentIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!subject.trim()) { toast.error("الموضوع مطلوب"); return; }
    if (toIds.length === 0 && ccIds.length === 0 && bccIds.length === 0 && departmentIds.length === 0) {
      toast.error("يجب إضافة مستلم أو قسم واحد على الأقل");
      return;
    }

    try {
      // الرفع أولاً: المرفقات تُرفع مستقلة وتُربط بالرسالة عبر attachmentIds.
      // لو فشل الرفع لا تُرسل الرسالة أصلاً، فلا تصل ناقصة المرفقات.
      let uploadedIds: string[] = [];
      if (pendingFiles.length > 0) {
        try {
          const uploaded = await Promise.all(
            pendingFiles.map((file) => uploadAttachment.mutateAsync(file)),
          );
          uploadedIds = uploaded.map((a) => a.id);
        } catch {
          toast.error("فشل رفع المرفقات — لم تُرسل الرسالة. حاولي مرة أخرى.");
          return;
        }
      }

      if (replyAllMessageId) {
        await replyAllMail.mutateAsync({
          messageId: replyAllMessageId,
          dto: {
            subject,
            body: bodyHtml || undefined,
            recipients: buildRecipients(),
            ...(isHighImportance ? { importance: "HIGH" } : {}),
            ...(uploadedIds.length > 0 ? { attachmentIds: uploadedIds } : {}),
          },
        });
      } else if (forwardMessageId) {
        await forwardMail.mutateAsync({
          messageId: forwardMessageId,
          dto: {
            recipients: buildRecipients(),
            subject: subject || undefined,
            body: bodyHtml || undefined,
            ...((() => {
              const ids = [...forwardAttachments.map((a) => a.id), ...uploadedIds];
              return ids.length > 0 ? { attachmentIds: ids } : {};
            })()),
          },
        });
      } else {
        await sendMail.mutateAsync({
          subject,
          body: bodyHtml || undefined,
          recipients: buildRecipients(),
          ...(departmentIds.length > 0 ? { departmentIds } : {}),
          parentMessageId: replyToMessageId,
          ...(isHighImportance ? { importance: "HIGH" } : {}),
          ...(uploadedIds.length > 0 ? { attachmentIds: uploadedIds } : {}),
        });
      }

      if (uploadedIds.length > 0) {
        toast.success("تم إرسال الرسالة مع المرفقات بنجاح");
      }

      onClose();
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      const details: { employeeId: string }[] = err?.response?.data?.error?.details ?? [];
      if (code === "RECIPIENTS_NOT_RESOLVED") {
        const ids = details.map((d) => d.employeeId.slice(-8)).join(", ");
        toast.error(`بعض المستلمين لا يملكون حسابات مستخدمين في النظام${ids ? ` (${ids})` : ""}. يرجى التواصل مع المسؤول لربط الحسابات.`);
      } else {
        toast.error(err?.response?.data?.error?.message ?? err?.message ?? "حدث خطأ أثناء الإرسال");
      }
    }
  };

  const handleDraft = async () => {
    await saveDraft.mutateAsync({
      subject,
      body: bodyHtml,
      recipients: buildRecipients(),
    });
    onClose();
  };

  const t = useTranslations("mail");
  const isPending = sendMail.isPending || saveDraft.isPending || uploadAttachment.isPending || forwardMail.isPending || replyAllMail.isPending;

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isPending) setConfirmClose(true); }}>
      <DialogContent
        className="sm:max-w-3xl max-h-[90dvh] flex flex-col overflow-hidden"
        // Only the X (or cancel) closes it — not a click outside or Esc.
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            {forwardMessageId ? t("forwardMessageTitle") : replyAllMessageId ? t("replyAllMessageTitle") : replyToMessageId ? t("replyMessageTitle") : t("newMessageTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1 overflow-y-auto flex-1 px-1">
          {/* Recipients — editable in all modes (reply-all preserves TO/CC, still editable) */}
          {(
            <>
              {/* To */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <Label className="text-sm">{t("toLabel")}</Label>
                  <div className="flex gap-2">
                    {!showCc && (
                      <button type="button" onClick={() => setShowCc(true)} className="text-xs text-primary hover:underline">
                        {t("addCc")}
                      </button>
                    )}
                    {!showBcc && (
                      <button type="button" onClick={() => setShowBcc(true)} className="text-xs text-primary hover:underline">
                        {t("addBcc")}
                      </button>
                    )}
                    {!showDept && !replyAllMessageId && (
                      <button type="button" onClick={() => setShowDept(true)} className="text-xs text-primary hover:underline">
                        {t("sendToDept")}
                      </button>
                    )}
                  </div>
                </div>
                <UserSearchSelect
                  value={toIds}
                  onChange={setToIds}
                  placeholder={t("searchEmployee")}
                  requireLinkedUser
                />
              </div>

              {/* CC */}
              {showCc && (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <Label className="text-sm">{t("ccLabel")}</Label>
                    <button type="button" onClick={() => { setShowCc(false); setCcIds([]); }} className="text-xs text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <UserSearchSelect value={ccIds} onChange={setCcIds} placeholder={t("searchEmployee")} exclude={toIds} requireLinkedUser />
                </div>
              )}

              {/* BCC */}
              {showBcc && (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <Label className="text-sm">{t("bccLabel")}</Label>
                    <button type="button" onClick={() => { setShowBcc(false); setBccIds([]); }} className="text-xs text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <UserSearchSelect value={bccIds} onChange={setBccIds} placeholder={t("searchEmployee")} exclude={[...toIds, ...ccIds]} requireLinkedUser />
                </div>
              )}

              {/* Department */}
              {showDept && (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <Label className="text-sm flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {t("sendToDeptLabel")}
                    </Label>
                    <button type="button" onClick={() => { setShowDept(false); setDepartmentIds([]); }} className="text-xs text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Select onValueChange={toggleDepartment}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={t("chooseDept")} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.nameAr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {departmentIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {departmentIds.map((id) => {
                        const dept = departments.find((d: any) => d.id === id);
                        return (
                          <DeptChip
                            key={id}
                            id={id}
                            name={dept?.nameAr ?? id}
                            onRemove={() => toggleDepartment(id)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-sm">{t("subjectLabel")}</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              readOnly={!!forwardMessageId}
              className={forwardMessageId ? "bg-muted/40 cursor-default select-none" : ""}
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <Label className="text-sm">{t("bodyLabel")}</Label>
              {!forwardMessageId && (
                <button
                  type="button"
                  onClick={() => setIsHighImportance((v) => !v)}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${
                    isHighImportance
                      ? "bg-red-50 border-red-300 text-red-700 font-semibold"
                      : "border-muted-foreground/20 text-muted-foreground hover:border-red-300 hover:text-red-600"
                  }`}
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  {t("highImportance")}
                </button>
              )}
            </div>
            {forwardMessageId ? (
              <>
                {/* Editable area for user's added message */}
                <RichMailEditor
                  key={editorKey}
                  initialContent=""
                  onChange={setBodyHtml}
                  onSubmit={() => { if (!isPending) handleSend(); }}
                  minHeight={80}
                />
                {/* Forwarded message (read-only) */}
                <div
                  className="max-h-48 overflow-y-auto rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
                  dir="auto"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(/<[a-z][\s\S]*>/i.test(defaultBody) ? defaultBody : defaultBody.replace(/\n/g, "<br>")) }}
                />
              </>
            ) : (
              <>
                <RichMailEditor
                  key={editorKey}
                  initialContent={initialBody}
                  onChange={setBodyHtml}
                  onSubmit={() => { if (!isPending) handleSend(); }}
                />
              </>
            )}
          </div>

          {/* Quoted original message (reply / reply-all only) */}
          {(replyToMessageId || replyAllMessageId) && quotedBody && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground border-r-2 border-primary pr-2">الرسالة الأصلية</p>
              <div
                className="max-h-48 overflow-y-auto rounded-md border-r-2 border-muted bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
                dir="auto"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(quotedBody) }}
              />
            </div>
          )}

          {/* Forwarded attachments (read-only) */}
          {previewAttachments.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("originalAttachments")}</p>
              <div className="border rounded-md divide-y">
                {previewAttachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground">
                    <Paperclip className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{decodeFileName(att.fileName)}</span>
                    <span className="text-xs shrink-0">
                      {att.fileSize < 1024 * 1024
                        ? `${(att.fileSize / 1024).toFixed(1)} KB`
                        : `${(att.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.odt,.xls,.xlsx,.csv,.ods,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            {pendingFiles.length > 0 && (
              <div className="border rounded-md divide-y">
                {pendingFiles.map((file) => (
                  <div key={file.name} className="flex flex-wrap gap-2 items-center justify-between px-3 py-1.5 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {file.size < 1024 * 1024
                          ? `${(file.size / 1024).toFixed(1)} KB`
                          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                      </span>
                    </div>
                    <button type="button" onClick={() => removeFile(file.name)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setConfirmClose(true)} disabled={isPending}>{t("cancel")}</Button>
              <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => fileInputRef.current?.click()} disabled={isPending}>
                <Paperclip className="h-4 w-4" />
                {t("attach")}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleDraft} disabled={isPending}>
                <FileText className="h-4 w-4 ml-1.5" />
                {t("saveDraft")}
              </Button>
              <Button onClick={handleSend} disabled={isPending}>
                {uploadAttachment.isPending
                  ? <Loader2 className="h-4 w-4 ml-1.5 animate-spin" />
                  : <Send className="h-4 w-4 ml-1.5" />}
                {uploadAttachment.isPending ? t("uploadingAttachments") : t("send")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>إغلاق الرسالة؟</AlertDialogTitle>
          <AlertDialogDescription>
            سيتم فقدان ما كتبته في هذه الرسالة. يمكنك حفظها كمسودة بدلاً من ذلك.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>متابعة الكتابة</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => { setConfirmClose(false); onClose(); }}
          >
            إغلاق
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
