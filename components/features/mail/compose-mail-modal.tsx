"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, FileText, X, Paperclip, Loader2, Building2, Upload, ArrowDown, ArrowUp, Check } from "lucide-react";
import dynamic from "next/dynamic";
import { sanitizeHtml } from "@/lib/utils/sanitize-html";
import { mentionsAttachment } from "@/lib/utils/mail-text";
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
import {
  useSendMail, useUploadAttachment, useForwardMail, useReplyAllMail,
  useMailDraft, useSendDraft, useDeleteDraft,
} from "@/lib/hooks/use-mail";
import {
  mailApi, mailErrorCode, mailErrorMessage,
  type MailAttachment, type MailImportance, type MailReplyType, type SaveDraftDto,
} from "@/lib/api/mail";
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

/** Same list as the file picker's accept — dropped files are held to it too. */
const ALLOWED_EXT = ["jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx", "odt", "xls", "xlsx", "csv", "ods", "txt"];
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const extOf = (name: string) => (name.split(".").pop() ?? "").toLowerCase();

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
  /** Reopens a saved draft to keep writing and send it. */
  draftId?: string;
}

/** Autosave waits this long after the last change. */
const AUTOSAVE_MS = 3000;
const IMPORTANCE_OPTIONS: { value: MailImportance; label: string }[] = [
  { value: "LOW", label: "منخفضة" },
  { value: "NORMAL", label: "عادية" },
  { value: "HIGH", label: "عالية" },
];

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
  draftId,
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
  const [importance, setImportance] = useState<MailImportance>("NORMAL");
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Body HTML from the rich editor ("" while empty). The editor remounts
  // (editorKey) whenever its starting content changes: on open, or once a
  // reopened draft has loaded.
  const initialBody = forwardMessageId ? "" : defaultBody;
  const [bodyHtml, setBodyHtml] = useState(initialBody);
  const [editorInitial, setEditorInitial] = useState(initialBody);
  const [editorKey, setEditorKey] = useState(0);
  // Closing by hand (X / cancel) asks first. Sending or saving a draft closes without asking.
  const [confirmClose, setConfirmClose] = useState(false);
  // Asked when the text mentions an attachment but none is attached.
  const [confirmNoAttachment, setConfirmNoAttachment] = useState(false);
  const [dragging, setDragging] = useState(false);

  // ── Draft ──
  // The draft this message is saved to (autosave PATCHes it; never a second copy).
  const draftIdRef = useRef<string | null>(null);
  // Saves run one after another, so the first POST's id is known before any PATCH.
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());
  // What was last saved (or loaded) — autosave only runs when this changes.
  const savedSnapshot = useRef("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [autosaveFailed, setAutosaveFailed] = useState(false);
  // Attachments already on a reopened draft (shown; new files are added on top).
  const [draftAttachments, setDraftAttachments] = useState<MailAttachment[]>([]);
  // What a reopened draft answers — kept so sending it stays in the thread.
  const [draftParent, setDraftParent] = useState<{ parentMessageId?: string; replyType?: MailReplyType }>({});
  const { data: loadedDraft, isLoading: draftLoading } = useMailDraft(open ? draftId : null);
  const [hydratedDraft, setHydratedDraft] = useState<string | null>(null);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      // A fresh start every time — nothing carries over from the last message.
      setSubject(defaultSubject);
      setToIds(defaultToIds);
      setCcIds(defaultCcIds);
      setBccIds([]);
      setShowCc(defaultCcIds.length > 0);
      setShowBcc(false);
      setShowDept(false);
      setDepartmentIds([]);
      setPendingFiles([]);
      setImportance("NORMAL");
      setBodyHtml(initialBody);
      setEditorInitial(initialBody);
      setEditorKey((k) => k + 1);
      setDraftAttachments([]);
      setDraftParent({});
      setSavedAt(null);
      setAutosaveFailed(false);
      setHydratedDraft(null);
      draftIdRef.current = null;
      savedSnapshot.current = "";
    }
  }

  // A reopened draft fills the form once it has loaded.
  if (open && draftId && loadedDraft && hydratedDraft !== loadedDraft.id) {
    const d = loadedDraft;
    const idOf = (r: any): string => r.employeeId ?? r.employeeInfo?.employeeId ?? r.recipient?.id ?? r.recipientId;
    const of = (type: string) => (d.recipients ?? []).filter((r) => r.type === type).map(idOf).filter(Boolean);
    const to = of("TO"), cc = of("CC"), bcc = of("BCC");
    setHydratedDraft(d.id);
    setSubject(d.subject ?? "");
    setToIds(to);
    setCcIds(cc);
    setBccIds(bcc);
    setShowCc(cc.length > 0);
    setShowBcc(bcc.length > 0);
    setDepartmentIds(d.departmentIds ?? []);
    setShowDept((d.departmentIds ?? []).length > 0);
    setImportance(d.importance ?? "NORMAL");
    setBodyHtml(d.body ?? "");
    setEditorInitial(d.body ?? "");
    setEditorKey((k) => k + 1);
    setDraftAttachments(d.attachments ?? []);
    setDraftParent({ parentMessageId: d.parentMessageId ?? undefined, replyType: d.replyType ?? undefined });
    setSavedAt(new Date(d.updatedAt));
    draftIdRef.current = d.id;
  }
  const waitingForDraft = !!draftId && (draftLoading || hydratedDraft !== draftId);

  // مع وجود مرفقات، النجاح يُعلن مرة واحدة بعد اكتمال الرفع لا قبله
  const hasPendingFiles = pendingFiles.length > 0;
  const sendMail = useSendMail(hasPendingFiles);
  const sendDraft = useSendDraft(hasPendingFiles);
  const deleteDraft = useDeleteDraft();
  const qc = useQueryClient();
  const [savingDraft, setSavingDraft] = useState(false);
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

  // What the draft answers: set when replying/forwarding, or kept from a reopened draft.
  const parentInfo: { parentMessageId?: string; replyType?: MailReplyType } =
    replyAllMessageId ? { parentMessageId: replyAllMessageId, replyType: "REPLY_ALL" }
      : forwardMessageId ? { parentMessageId: forwardMessageId, replyType: "FORWARD" }
        : replyToMessageId ? { parentMessageId: replyToMessageId, replyType: "REPLY" }
          : draftParent;

  // Fields are always sent in full (recipients: [] included), since a PATCH
  // keeps any field that's left out.
  const draftPayload = (): SaveDraftDto => ({
    subject,
    body: bodyHtml,
    recipients: buildRecipients(),
    departmentIds,
    importance,
    ...(parentInfo.parentMessageId ? parentInfo : {}),
  });
  const snapshotOf = (dto: SaveDraftDto) => JSON.stringify(dto);
  const hasContent = !!(subject.trim() || bodyHtml || toIds.length || ccIds.length || bccIds.length || departmentIds.length);

  /** Saves to the one draft of this message: creates it the first time, PATCHes after. */
  const persistDraft = (extra: Partial<SaveDraftDto> = {}) => {
    const dto = { ...draftPayload(), ...extra };
    const run = async () => {
      if (draftIdRef.current) {
        await mailApi.updateDraft(draftIdRef.current, dto);
      } else {
        const created = await mailApi.saveDraft(dto);
        draftIdRef.current = created.id;
      }
      savedSnapshot.current = snapshotOf(draftPayload());
      setSavedAt(new Date());
      setAutosaveFailed(false);
      qc.invalidateQueries({ queryKey: ["mail", "drafts"] });
    };
    const next = saveChain.current.then(run, run);
    saveChain.current = next.catch(() => {});
    return next;
  };

  // Autosave: a few seconds after the last change, while the window is open.
  const sendingRef = useRef(false);
  const currentSnapshot = snapshotOf(draftPayload());
  useEffect(() => {
    if (!open || waitingForDraft || sendingRef.current) return;
    if (currentSnapshot === savedSnapshot.current) return;
    if (!hasContent && !draftIdRef.current) return;
    const id = setTimeout(() => {
      if (sendingRef.current) return;
      persistDraft().catch(() => setAutosaveFailed(true));
    }, AUTOSAVE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, waitingForDraft, currentSnapshot]);

  // Loaded drafts count as already saved.
  useEffect(() => {
    if (hydratedDraft) savedSnapshot.current = currentSnapshot;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydratedDraft]);

  /** After sending by another route, the autosaved draft is dropped. */
  const dropDraft = async () => {
    await saveChain.current;
    const id = draftIdRef.current;
    draftIdRef.current = null;
    if (id) await deleteDraft.mutateAsync(id).catch(() => {});
  };

  // From the picker or dropped on the window: unsupported types and files
  // over 25MB are refused by name, the rest join the list (no duplicates).
  const addFiles = (files: File[]) => {
    const badType = files.filter((f) => !ALLOWED_EXT.includes(extOf(f.name)));
    const oversized = files.filter((f) => f.size > MAX_FILE_BYTES);
    if (badType.length > 0) toast.error(`نوع ملف غير مدعوم: ${badType.map((f) => f.name).join(", ")}`);
    if (oversized.length > 0) toast.error(`الملفات التالية تتجاوز 25MB: ${oversized.map((f) => f.name).join(", ")}`);
    const ok = files.filter((f) => !badType.includes(f) && !oversized.includes(f));
    if (ok.length === 0) return;
    setPendingFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...ok.filter((f) => !names.has(f.name))];
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      if (!hasFiles(e) || isPending) return;
      e.preventDefault();
      if (!dragging) setDragging(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      // Only when leaving the window itself, not moving between its children.
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      setDragging(false);
      // An image dropped on the text is placed inline by the editor itself.
      if (e.defaultPrevented || !hasFiles(e) || isPending) return;
      e.preventDefault();
      addFiles(Array.from(e.dataTransfer.files));
    },
  };

  const removeFile = (name: string) =>
    setPendingFiles((prev) => prev.filter((f) => f.name !== name));

  const toggleDepartment = (id: string) => {
    setDepartmentIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleSend = async (skipAttachmentCheck = false) => {
    if (!subject.trim()) { toast.error("الموضوع مطلوب"); return; }
    if (toIds.length === 0 && ccIds.length === 0 && bccIds.length === 0 && departmentIds.length === 0) {
      toast.error("يجب إضافة مستلم أو قسم واحد على الأقل");
      return;
    }
    // Like Outlook: "مرفق" in the text with nothing attached asks first.
    const attachedSomething = pendingFiles.length > 0 || forwardAttachments.length > 0 || draftAttachments.length > 0;
    if (!skipAttachmentCheck && !attachedSomething && mentionsAttachment(subject, bodyHtml)) {
      setConfirmNoAttachment(true);
      return;
    }

    sendingRef.current = true;
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
          sendingRef.current = false;
          return;
        }
      }

      // A saved draft (autosaved, or reopened from drafts) is sent as itself, so
      // it turns into the sent message — no leftover copy in drafts. Replies
      // opened from a message keep their own endpoints. The draft route needs a
      // "To" recipient, so department-only mail keeps the direct route too.
      await saveChain.current;
      const viaDraft = !!draftIdRef.current && !replyAllMessageId && !forwardMessageId && !replyToMessageId && toIds.length > 0;
      if (viaDraft) {
        await persistDraft(uploadedIds.length > 0 ? { attachmentIds: uploadedIds } : {});
        await sendDraft.mutateAsync(draftIdRef.current!);
        draftIdRef.current = null;
        if (uploadedIds.length > 0) toast.success("تم إرسال الرسالة مع المرفقات بنجاح");
        onClose();
        return;
      }
      const carriedIds = [...draftAttachments.map((a) => a.id), ...uploadedIds];

      if (replyAllMessageId) {
        await replyAllMail.mutateAsync({
          messageId: replyAllMessageId,
          dto: {
            subject,
            body: bodyHtml || undefined,
            recipients: buildRecipients(),
            importance,
            ...(carriedIds.length > 0 ? { attachmentIds: carriedIds } : {}),
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
              const ids = [...forwardAttachments.map((a) => a.id), ...carriedIds];
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
          parentMessageId: replyToMessageId ?? draftParent.parentMessageId,
          importance,
          ...(carriedIds.length > 0 ? { attachmentIds: carriedIds } : {}),
        });
      }

      if (uploadedIds.length > 0) {
        toast.success("تم إرسال الرسالة مع المرفقات بنجاح");
      }

      await dropDraft();
      onClose();
    } catch (err: any) {
      sendingRef.current = false;
      const code = mailErrorCode(err);
      const details: { employeeId: string }[] = err?.response?.data?.error?.details ?? [];
      if (code === "RECIPIENTS_NOT_RESOLVED") {
        const ids = details.map((d) => d.employeeId.slice(-8)).join(", ");
        toast.error(`بعض المستلمين لا يملكون حسابات مستخدمين في النظام${ids ? ` (${ids})` : ""}. يرجى التواصل مع المسؤول لربط الحسابات.`);
      } else if (!err?.response) {
        toast.error(err?.message ?? "حدث خطأ أثناء الإرسال");
      }
    }
  };

  const handleDraft = async () => {
    setSavingDraft(true);
    try {
      let uploadedIds: string[] = [];
      if (pendingFiles.length > 0) {
        const uploaded = await Promise.all(pendingFiles.map((file) => uploadAttachment.mutateAsync(file)));
        uploadedIds = uploaded.map((a) => a.id);
      }
      await persistDraft(uploadedIds.length > 0 ? { attachmentIds: uploadedIds } : {});
      toast.success("تم حفظ المسودة");
      onClose();
    } catch (err) {
      toast.error(mailErrorMessage(err, "فشل حفظ المسودة"));
    } finally {
      setSavingDraft(false);
    }
  };

  /** Close from the confirm dialog: keeps what was written as a draft. */
  const closeKeepingDraft = async () => {
    setConfirmClose(false);
    if (hasContent && currentSnapshot !== savedSnapshot.current) {
      try {
        await persistDraft();
      } catch (err) {
        toast.error(mailErrorMessage(err, "تعذّر حفظ المسودة"));
        return;
      }
    }
    if (draftIdRef.current) toast.success("حُفظت الرسالة في المسودات");
    onClose();
  };

  const discardDraft = async () => {
    setConfirmClose(false);
    await dropDraft();
    onClose();
  };

  const t = useTranslations("mail");
  const isPending = sendMail.isPending || sendDraft.isPending || savingDraft || uploadAttachment.isPending || forwardMail.isPending || replyAllMail.isPending;

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isPending) setConfirmClose(true); }}>
      <DialogContent
        className="sm:max-w-3xl max-h-[90dvh] flex flex-col overflow-hidden"
        // Only the X (or cancel) closes it — not a click outside or Esc.
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        {...dropHandlers}
      >
        {dragging && (
          <div className="pointer-events-none absolute inset-2 z-50 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary bg-background/90 text-primary">
            <Upload className="h-8 w-8" />
            <p className="text-sm font-medium">أفلتي الملفات هنا لإرفاقها</p>
            <p className="text-xs text-muted-foreground">حتى 25MB للملف — صور، PDF، Word، Excel، نص</p>
          </div>
        )}
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
                <div className="flex items-center gap-1 text-xs" title="الأهمية">
                  <span className="text-muted-foreground">الأهمية:</span>
                  <div className="flex rounded-md border p-0.5">
                    {IMPORTANCE_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setImportance(o.value)}
                        className={`flex items-center gap-1 rounded px-2 py-0.5 transition-colors ${
                          importance === o.value
                            ? o.value === "HIGH"
                              ? "bg-red-50 text-red-700 font-semibold"
                              : o.value === "LOW"
                                ? "bg-sky-50 text-sky-700 font-semibold"
                                : "bg-accent text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {o.value === "HIGH" && <ArrowUp className="h-3 w-3" />}
                        {o.value === "LOW" && <ArrowDown className="h-3 w-3" />}
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
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
                {waitingForDraft ? (
                  <div className="flex h-60 items-center justify-center rounded-md border text-sm text-muted-foreground">
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" /> جارٍ تحميل المسودة...
                  </div>
                ) : (
                <RichMailEditor
                  key={editorKey}
                  initialContent={editorInitial}
                  onChange={setBodyHtml}
                  onSubmit={() => { if (!isPending) handleSend(); }}
                />
                )}
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
            {draftAttachments.length > 0 && (
              <div className="border rounded-md divide-y">
                {draftAttachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{decodeFileName(att.fileName)}</span>
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                      {extOf(att.fileName) || "?"}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {att.fileSize < 1024 * 1024
                        ? `${(att.fileSize / 1024).toFixed(1)} KB`
                        : `${(att.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                        {extOf(file.name) || "?"}
                      </span>
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
              {autosaveFailed ? (
                <span className="text-xs text-destructive">تعذّر الحفظ التلقائي</span>
              ) : savedAt ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Check className="h-3 w-3" />
                  حُفظت مسودة {savedAt.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                </span>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleDraft} disabled={isPending || waitingForDraft}>
                <FileText className="h-4 w-4 ml-1.5" />
                {t("saveDraft")}
              </Button>
              <Button onClick={() => handleSend()} disabled={isPending || waitingForDraft}>
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
            {hasContent || draftIdRef.current
              ? "ستبقى الرسالة في المسودات ويمكنك إكمالها لاحقاً، أو احذفيها إن لم تعودي بحاجتها."
              : "لم تكتبي شيئاً بعد."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel>متابعة الكتابة</AlertDialogCancel>
          {(hasContent || draftIdRef.current) && (
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={discardDraft}>
              حذف المسودة
            </Button>
          )}
          <AlertDialogAction onClick={(e) => { e.preventDefault(); closeKeepingDraft(); }}>
            إغلاق
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={confirmNoAttachment} onOpenChange={setConfirmNoAttachment}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>نسيتِ المرفق؟</AlertDialogTitle>
          <AlertDialogDescription>
            ذكرتِ مرفقاً في الرسالة لكن لم يُرفق أي ملف.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => fileInputRef.current?.click()}>إرفاق ملف</AlertDialogCancel>
          <AlertDialogAction onClick={() => { setConfirmNoAttachment(false); handleSend(true); }}>
            إرسال بدون مرفق
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
