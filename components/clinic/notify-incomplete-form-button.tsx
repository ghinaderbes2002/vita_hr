"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionGuard } from "@/components/permissions/action-guard";
import { apiClient } from "@/lib/api/client";
import { PERMISSIONS } from "@/lib/permissions/catalog";

const TARGETS = {
  physio: { path: "physio/cases", permission: PERMISSIONS.CLINIC_PHYSIO.NOTIFY_INCOMPLETE_FORM },
  prosthetics: { path: "prosthetics/cases", permission: PERMISSIONS.CLINIC_PROSTHETICS.NOTIFY_INCOMPLETE_FORM },
  podiatry: { path: "podiatry/receptions", permission: PERMISSIONS.CLINIC_PODIATRY.NOTIFY_INCOMPLETE_FORM },
} as const;

/** Alerts the department head that this patient's form is still incomplete. */
export function NotifyIncompleteFormButton({ type, id }: { type: keyof typeof TARGETS; id: string }) {
  const { path, permission } = TARGETS[type];
  const [confirmOpen, setConfirmOpen] = useState(false);

  const notify = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post(`/${path}/${id}/notify-incomplete-form`);
      return (data?.data ?? data) as { sent: boolean };
    },
    onSuccess: ({ sent }) => {
      if (sent) toast.success("تم إرسال التنبيه لرئيس القسم");
      else toast.error("لم يُرسل التنبيه");
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message || "تعذّر إرسال التنبيه"),
  });

  return (
    <ActionGuard permission={permission}>
      <Button variant="outline" size="sm" className="gap-2" disabled={notify.isPending} onClick={() => setConfirmOpen(true)}>
        {notify.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
        تنبيه بخصوص استمارة غير مكتملة
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="إرسال تنبيه؟"
        description="سيصل إشعار لرئيس القسم لتوجيه الموظف المستلم للحالة بإكمال الاستمارة خلال 24 ساعة."
        confirmText="إرسال"
        onConfirm={() => { setConfirmOpen(false); notify.mutate(); }}
      />
    </ActionGuard>
  );
}
