"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface RequestActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "approve" | "reject" | "cancel";
  onConfirm: (notes: string) => Promise<void>;
  isLoading?: boolean;
}

export function RequestActionDialog({
  open,
  onOpenChange,
  action,
  onConfirm,
  isLoading,
}: RequestActionDialogProps) {
  const t = useTranslations();
  const [notes, setNotes] = useState("");

  const handleConfirm = async () => {
    await onConfirm(notes);
    setNotes("");
  };

  const isRejectOrCancel = action === "reject" || action === "cancel";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(`requests.actions.${action}`)}</DialogTitle>
          <DialogDescription>
            {t(`requests.actions.${action}Description`)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>
            {t("requests.fields.notes")}
            {!isRejectOrCancel && ` (${t("common.optional")})`}
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={t("requests.fields.notes")}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant={isRejectOrCancel ? "destructive" : "default"}
            disabled={isLoading || (isRejectOrCancel && !notes.trim())}
            onClick={handleConfirm}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {t(`requests.actions.${action}`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
