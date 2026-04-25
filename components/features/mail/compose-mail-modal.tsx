"use client";

import { useState } from "react";
import { Send, FileText, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserSearchSelect } from "./user-search-select";
import { useSendMail, useSaveDraft } from "@/lib/hooks/use-mail";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  replyToMessageId?: string;
  defaultSubject?: string;
  defaultToIds?: string[];
}

export function ComposeMailModal({
  open,
  onClose,
  replyToMessageId,
  defaultSubject = "",
  defaultToIds = [],
}: Props) {
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");
  const [toIds, setToIds] = useState<string[]>(defaultToIds);
  const [ccIds, setCcIds] = useState<string[]>([]);
  const [bccIds, setBccIds] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  const sendMail = useSendMail();
  const saveDraft = useSaveDraft();

  const buildRecipients = () => [
    ...toIds.map((userId) => ({ userId, type: "TO" as const })),
    ...ccIds.map((userId) => ({ userId, type: "CC" as const })),
    ...bccIds.map((userId) => ({ userId, type: "BCC" as const })),
  ];

  const handleSend = async () => {
    if (!subject.trim()) { toast.error("الموضوع مطلوب"); return; }
    if (!body.trim()) { toast.error("نص الرسالة مطلوب"); return; }
    if (toIds.length === 0) { toast.error("يجب إضافة مستلم واحد على الأقل"); return; }

    await sendMail.mutateAsync({
      subject,
      body,
      recipients: buildRecipients(),
      parentMessageId: replyToMessageId,
    });
    onClose();
  };

  const handleDraft = async () => {
    await saveDraft.mutateAsync({
      subject,
      body,
      recipients: buildRecipients(),
    });
    onClose();
  };

  const isPending = sendMail.isPending || saveDraft.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            {replyToMessageId ? "رد على رسالة" : "رسالة جديدة"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* To */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm">إلى *</Label>
              <div className="flex gap-2">
                {!showCc && (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    + نسخة (CC)
                  </button>
                )}
                {!showBcc && (
                  <button
                    type="button"
                    onClick={() => setShowBcc(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    + نسخة مخفية (BCC)
                  </button>
                )}
              </div>
            </div>
            <UserSearchSelect
              value={toIds}
              onChange={setToIds}
              placeholder="ابحث عن موظف وأضفه..."
            />
          </div>

          {/* CC */}
          {showCc && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm">نسخة (CC)</Label>
                <button
                  type="button"
                  onClick={() => { setShowCc(false); setCcIds([]); }}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <UserSearchSelect
                value={ccIds}
                onChange={setCcIds}
                placeholder="أضف مستلمين للنسخة..."
                exclude={toIds}
              />
            </div>
          )}

          {/* BCC */}
          {showBcc && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm">نسخة مخفية (BCC)</Label>
                <button
                  type="button"
                  onClick={() => { setShowBcc(false); setBccIds([]); }}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <UserSearchSelect
                value={bccIds}
                onChange={setBccIds}
                placeholder="أضف مستلمين مخفيين..."
                exclude={[...toIds, ...ccIds]}
              />
            </div>
          )}

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-sm">الموضوع *</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="موضوع الرسالة..."
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label className="text-sm">نص الرسالة *</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="اكتب رسالتك هنا..."
              rows={7}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              إلغاء
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleDraft}
                disabled={isPending}
              >
                <FileText className="h-4 w-4 ml-1.5" />
                حفظ مسودة
              </Button>
              <Button onClick={handleSend} disabled={isPending}>
                <Send className="h-4 w-4 ml-1.5" />
                إرسال
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
