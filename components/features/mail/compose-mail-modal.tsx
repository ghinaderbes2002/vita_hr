"use client";

import { useState, useRef, useEffect } from "react";
import { Send, FileText, X, Paperclip, Loader2, Building2, Bold, Underline, Italic, AlertCircle } from "lucide-react";
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
import { useSendMail, useSaveDraft, useUploadAttachment, useForwardMail } from "@/lib/hooks/use-mail";
import { useDepartments } from "@/lib/hooks/use-departments";
import { toast } from "sonner";

interface ForwardAttachment {
  id: string;
  fileName: string;
  fileSize: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  replyToMessageId?: string;
  forwardMessageId?: string;
  defaultSubject?: string;
  defaultToIds?: string[];
  defaultCcIds?: string[];
  defaultBody?: string;
  forwardAttachments?: ForwardAttachment[];
}

export function ComposeMailModal({
  open,
  onClose,
  replyToMessageId,
  forwardMessageId,
  defaultSubject = "",
  defaultToIds = [],
  defaultCcIds = [],
  defaultBody = "",
  forwardAttachments = [],
}: Props) {
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
  const bodyRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState({ bold: false, underline: false, italic: false });

  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.innerHTML = defaultBody;
    } else if (!open && bodyRef.current) {
      bodyRef.current.innerHTML = "";
    }
  }, [open]);

  useEffect(() => {
    const updateFormats = () => {
      if (!bodyRef.current?.contains(document.activeElement)) return;
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        underline: document.queryCommandState("underline"),
        italic: document.queryCommandState("italic"),
      });
    };
    document.addEventListener("selectionchange", updateFormats);
    return () => document.removeEventListener("selectionchange", updateFormats);
  }, []);

  const applyFormat = (command: "bold" | "underline" | "italic") => {
    document.execCommand(command, false);
    setActiveFormats((prev) => ({ ...prev, [command]: !prev[command] }));
  };

  const sendMail = useSendMail();
  const saveDraft = useSaveDraft();
  const uploadAttachment = useUploadAttachment();
  const forwardMail = useForwardMail();

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
    if (toIds.length === 0 && departmentIds.length === 0) {
      toast.error("يجب إضافة مستلم أو قسم واحد على الأقل");
      return;
    }

    let message: any;

    if (forwardMessageId) {
      message = await forwardMail.mutateAsync({
        messageId: forwardMessageId,
        dto: {
          recipients: buildRecipients(),
          subject: subject || undefined,
          body: bodyRef.current?.innerHTML || undefined,
          ...(forwardAttachments.length > 0
            ? { attachmentIds: forwardAttachments.map((a) => a.id) }
            : {}),
        },
      });
    } else {
      message = await sendMail.mutateAsync({
        subject,
        body: bodyRef.current?.innerHTML || undefined,
        recipients: buildRecipients(),
        ...(departmentIds.length > 0 ? { departmentIds } : {}),
        parentMessageId: replyToMessageId,
        ...(isHighImportance ? { importance: "HIGH" } : {}),
      });
    }

    if (pendingFiles.length > 0 && message?.id) {
      await Promise.all(
        pendingFiles.map((file) =>
          uploadAttachment.mutateAsync({ messageId: message.id, file }),
        ),
      );
    }

    onClose();
  };

  const handleDraft = async () => {
    await saveDraft.mutateAsync({
      subject,
      body: bodyRef.current?.innerHTML || "",
      recipients: buildRecipients(),
    });
    onClose();
  };

  const t = useTranslations("mail");
  const isPending = sendMail.isPending || saveDraft.isPending || uploadAttachment.isPending || forwardMail.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            {forwardMessageId ? t("forwardMessageTitle") : replyToMessageId ? t("replyMessageTitle") : t("newMessageTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* To */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
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
                {!showDept && (
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
            />
          </div>

          {/* CC */}
          {showCc && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{t("ccLabel")}</Label>
                <button type="button" onClick={() => { setShowCc(false); setCcIds([]); }} className="text-xs text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <UserSearchSelect value={ccIds} onChange={setCcIds} placeholder={t("searchEmployee")} exclude={toIds} />
            </div>
          )}

          {/* BCC */}
          {showBcc && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{t("bccLabel")}</Label>
                <button type="button" onClick={() => { setShowBcc(false); setBccIds([]); }} className="text-xs text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <UserSearchSelect value={bccIds} onChange={setBccIds} placeholder={t("searchEmployee")} exclude={[...toIds, ...ccIds]} />
            </div>
          )}

          {/* Department */}
          {showDept && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
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
                      <Badge key={id} variant="secondary" className="gap-1 text-xs">
                        <Building2 className="h-3 w-3" />
                        {dept?.nameAr ?? id}
                        <button type="button" onClick={() => toggleDepartment(id)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-sm">{t("subjectLabel")}</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("bodyLabel")}</Label>
              {/* High Importance */}
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
            </div>
            {/* Formatting toolbar */}
            <div className="flex items-center gap-0.5 border rounded-t-md px-2 py-1 bg-muted/30 border-b-0">
              {([
                { command: "bold" as const, icon: Bold, title: t("bold") },
                { command: "underline" as const, icon: Underline, title: t("underline") },
                { command: "italic" as const, icon: Italic, title: t("italic") },
              ]).map(({ command, icon: Icon, title }) => (
                <button
                  key={command}
                  type="button"
                  title={title}
                  onMouseDown={(e) => { e.preventDefault(); applyFormat(command); }}
                  className={`p-1.5 rounded transition-colors ${activeFormats[command] ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
            <div
              ref={bodyRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[168px] rounded-t-none border border-t-0 px-3 py-2 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring overflow-y-auto"
              dir="auto"
            />
          </div>

          {/* Forwarded attachments (read-only) */}
          {forwardAttachments.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("originalAttachments")}</p>
              <div className="border rounded-md divide-y">
                {forwardAttachments.map((att) => (
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
                  <div key={file.name} className="flex items-center justify-between px-3 py-1.5 text-sm">
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
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose} disabled={isPending}>{t("cancel")}</Button>
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
  );
}
