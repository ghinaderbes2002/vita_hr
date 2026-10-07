"use client";

import { Pencil } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ActionGuard } from "@/components/permissions/action-guard";
import { POTENTIAL_CLIENT_ARRIVAL_METHODS } from "@/components/clinic/potential-client-dialog";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { PotentialClient } from "@/lib/api/clinic-potential-clients";

const fmtDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "—";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}

/** Read-only view of one potential client — the table truncates the notes. */
export function PotentialClientDetailsDialog({
  client,
  onOpenChange,
  onEdit,
}: {
  /** The record to show; null keeps the dialog closed. */
  client: PotentialClient | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (client: PotentialClient) => void;
}) {
  const arrival = client?.arrivalMethod
    ? POTENTIAL_CLIENT_ARRIVAL_METHODS.find((m) => m.value === client.arrivalMethod)?.label ?? client.arrivalMethod
    : "—";
  const edited = !!client?.updatedAt && client.updatedAt !== client.createdAt;

  return (
    <Dialog open={!!client} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تفاصيل العميل المحتمل</DialogTitle>
        </DialogHeader>

        {client && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <Field label="الاسم">{client.patientName}</Field>
              <Field label="الجنس">{client.gender === "FEMALE" ? "أنثى" : "ذكر"}</Field>
              <Field label="العمر">{client.age ?? "—"}</Field>
              <Field label="خدمة مهتم بها">{client.interestedService || "—"}</Field>
              <Field label="رقم التواصل">
                <span className="font-mono" dir="ltr">{client.contactNumber}</span>
              </Field>
              <Field label="طريقة الوصول">{arrival}</Field>
              <Field label="تاريخ التسجيل">{fmtDateTime(client.registrationDate ?? client.createdAt)}</Field>
              {edited && <Field label="آخر تعديل">{fmtDateTime(client.updatedAt)}</Field>}
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">ملاحظات</p>
              <p className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap wrap-break-word">
                {client.notes || "—"}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إغلاق</Button>
          <ActionGuard permission={PERMISSIONS.CLINIC_POTENTIAL_CLIENTS.EDIT}>
            <Button className="gap-2" onClick={() => client && onEdit(client)}>
              <Pencil className="h-4 w-4" />
              تعديل
            </Button>
          </ActionGuard>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
