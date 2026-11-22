"use client";

// Manual edit of a prosthetics case number (PR-YYYY-NNNN). Its own endpoint and
// permission: PATCH /cases/:id ignores caseNumber, and editing the case does not
// imply renumbering it.

import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useUpdateProstheticsCaseNumber } from "@/lib/hooks/use-clinic-prosthetics";

/** PR- + a 4-digit year + - + the sequence. The API holds the final say. */
const CASE_NUMBER_RE = /^PR-\d{4}-\d{4,}$/;

export function ProstheticsCaseNumberEdit({ caseId, caseNumber }: { caseId: string; caseNumber: string }) {
  const { hasPermission, isAdmin } = usePermissions();
  const update = useUpdateProstheticsCaseNumber();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(caseNumber);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin() && !hasPermission(PERMISSIONS.CLINIC_PROSTHETICS.CASE_NUMBER_UPDATE)) return null;

  const next = value.trim().toUpperCase();
  const formatOk = CASE_NUMBER_RE.test(next);

  const openDialog = () => { setValue(caseNumber); setError(null); setOpen(true); };

  const submit = async () => {
    setError(null);
    try {
      await update.mutateAsync({ id: caseId, caseNumber: next });
      setOpen(false);
    } catch (e) {
      const d = (e as { response?: { data?: { message?: string; error?: { message?: string } } } })?.response?.data;
      setError(d?.error?.message || d?.message || "تعذّر تعديل رقم الحالة");
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        title="تعديل رقم الحالة"
        aria-label="تعديل رقم الحالة"
        onClick={openDialog}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!update.isPending) setOpen(o); }}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل رقم الحالة</DialogTitle>
            <DialogDescription>
              الصيغة: PR-السنة-التسلسل، مثل PR-2019-0045. السنة حرّة، ويُسجَّل الرقم القديم والجديد في سجل التدقيق.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>رقم الحالة</Label>
            <Input
              dir="ltr"
              className="font-mono"
              value={value}
              placeholder="PR-2026-0001"
              onChange={(e) => { setValue(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter" && formatOk && !update.isPending) submit(); }}
            />
            {!formatOk && next && (
              <p className="text-xs text-destructive">الصيغة غير صحيحة — يجب أن تكون مثل PR-2026-0088.</p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={update.isPending}>إلغاء</Button>
            <Button onClick={submit} disabled={!formatOk || update.isPending}>
              {update.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
