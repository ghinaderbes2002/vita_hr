"use client";

import { useState } from "react";
import { AlertTriangle, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReferralSourceCombobox, type ReferralSourcePick } from "@/components/clinic/referral-source-combobox";
import { useLinkPreview, useLinkUnlinked } from "@/lib/hooks/use-clinic-referrals";
import type { ReferralSourceType } from "@/lib/api/clinic-referrals";

/**
 * Links patients whose referrer was typed freehand (`name`) to a contact, in
 * two steps: the server lists who would be linked, the user unticks anyone
 * doubtful, then only the ticked ones are linked. Without `source` the user
 * first picks an existing contact (a spelling variant of a known doctor).
 */
export function LinkReferralPatientsDialog({
  open, onOpenChange, name, source, type = "DOCTOR",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The free name as it appears on the patients. */
  name: string;
  /** The contact to link them to — omitted to let the user pick one. */
  source?: { id: string; name: string } | null;
  type?: ReferralSourceType;
}) {
  const [picked, setPicked] = useState<ReferralSourcePick>({ referralSourceId: null, referralDetails: "" });
  const target = source ?? (picked.referralSourceId ? { id: picked.referralSourceId, name: picked.referralDetails } : null);

  const { data: preview, isLoading, isError, refetch, isFetching } = useLinkPreview(target?.id, name, open);
  const link = useLinkUnlinked();

  // Everyone starts ticked; a fresh preview resets the ticks.
  const [unticked, setUnticked] = useState<Set<string>>(new Set());
  const [seenPreview, setSeenPreview] = useState(preview);
  if (preview !== seenPreview) {
    setSeenPreview(preview);
    setUnticked(new Set());
  }
  // A clean start each time the dialog opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPicked({ referralSourceId: null, referralDetails: "" });
      setUnticked(new Set());
    }
  }

  const patients = preview?.patients ?? [];
  const chosen = patients.filter((p) => !unticked.has(p.id));
  const toggle = (id: string) =>
    setUnticked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const confirm = async () => {
    if (!target || chosen.length === 0) return;
    const res = await link.mutateAsync({ sourceId: target.id, name, patientIds: chosen.map((p) => p.id) });
    if (res.skipped > 0) {
      // Someone changed these records meanwhile — they were left untouched.
      toast.warning(`رُبط ${res.linked} من ${res.requested}. تغيّرت بعض السجلات أثناء الاختيار — أعيدي المعاينة.`);
      refetch();
      return;
    }
    toast.success(`رُبط ${res.linked} ${res.linked === 1 ? "مريض" : "مرضى"} بـ ${res.sourceName}`);
    onOpenChange(false);
  };

  const fmt = (iso?: string) => (iso ? iso.slice(0, 10) : "—");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!link.isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            ربط المرضى بجهة الاتصال
          </DialogTitle>
          <DialogDescription>
            {source
              ? <>المرضى المسجّلون باسم «{name}» كتابةً حرة. راجعي القائمة وأزيلي إشارة من لا يخصّ هذه الجهة قبل التأكيد.</>
              : <>هل «{name}» هو نفسه طبيب موجود عندنا في جهات الاتصال لكن اسمه مكتوب بشكل مختلف؟</>}
          </DialogDescription>
        </DialogHeader>

        {!source && (
          <div className="space-y-1.5">
            <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
              <p>• إذا كان موجوداً: ابحثي عنه واختاريه، وستظهر أسماء المرضى الذين سيُربطون به.</p>
              <p>• إذا لم يكن موجوداً: أغلقي هذه النافذة واختاري «إضافة كجهة اتصال».</p>
            </div>
            <Label>اختاري الطبيب من جهات الاتصال</Label>
            <ReferralSourceCombobox type={type} value={picked} onChange={setPicked} placeholder="اختاري جهة اتصال موجودة..." />
            {picked.referralDetails && !picked.referralSourceId && (
              <p className="text-xs text-destructive">اختاري جهة من القائمة — الربط لا يكون باسم حر.</p>
            )}
          </div>
        )}

        {!target ? null : isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
        ) : isError ? (
          <p className="py-6 text-center text-sm text-destructive">تعذّر تحميل المعاينة</p>
        ) : patients.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">لا يوجد مرضى غير مربوطين بهذا الاسم.</p>
        ) : (
          <>
            <p className="text-sm">
              سيُربط <strong className="tabular-nums">{chosen.length}</strong> من {preview?.count ?? patients.length} بـ
              {" "}<strong>{preview?.sourceName ?? target.name}</strong>
              {isFetching && <Loader2 className="ms-2 inline h-3.5 w-3.5 animate-spin" />}
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={unticked.size === 0 ? true : chosen.length === 0 ? false : "indeterminate"}
                      onCheckedChange={(v) => setUnticked(v ? new Set() : new Set(patients.map((p) => p.id)))}
                      aria-label="تحديد الكل"
                    />
                  </TableHead>
                  <TableHead>المريض</TableHead>
                  <TableHead>رقم الملف</TableHead>
                  <TableHead>الاسم كما كُتب</TableHead>
                  <TableHead>التسجيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((p) => {
                  const on = !unticked.has(p.id);
                  return (
                    <TableRow key={p.id} className={on ? "" : "opacity-50"}>
                      <TableCell>
                        <Checkbox checked={on} onCheckedChange={() => toggle(p.id)} aria-label={p.patientName} />
                      </TableCell>
                      <TableCell className="font-medium">{p.patientName}</TableCell>
                      <TableCell className="font-mono text-xs">{p.patientNumber ?? "—"}</TableCell>
                      <TableCell>
                        <span className={p.referralDetails.trim() !== name.trim() ? "text-amber-700" : ""}>
                          {p.referralDetails}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{fmt(p.registeredAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {patients.some((p) => p.referralDetails.trim() !== name.trim()) && (
              <p className="flex items-center gap-1.5 text-xs text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                الأسماء الملوّنة مكتوبة بصيغة مختلفة — تأكّدي أنها للشخص نفسه.
              </p>
            )}
          </>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={link.isPending}>
            {patients.length === 0 ? "إغلاق" : "لاحقاً"}
          </Button>
          {target && patients.length > 0 && (
            <Button onClick={confirm} disabled={chosen.length === 0 || link.isPending} className="gap-1.5">
              {link.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              تأكيد الربط ({chosen.length})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
