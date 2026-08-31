"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useEmployeesByDepartment } from "@/lib/hooks/use-employees";

const PHYSIO_DEPT_ID = "8893e27d-3581-42b6-8111-0fb743ca2403";
/** Radix rejects an empty option value, so "leave unassigned" needs a sentinel. */
const UNASSIGNED = "__unassigned__";

/**
 * Turns a doctor exam into a PT case, optionally handing it to a therapist.
 *
 * The therapist is assigned on the new case as it is created and is notified,
 * so this is a decision worth making deliberately rather than a side effect of
 * pressing the convert button.
 */
export function ConvertToPhysioDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  patientGender,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `undefined` converts without assigning anyone, which the API allows. */
  onConfirm: (physiotherapistId?: string) => void;
  isPending?: boolean;
  /** Patients are treated by a therapist of their own gender. Unknown = no filter. */
  patientGender?: "MALE" | "FEMALE" | null;
}) {
  const [selected, setSelected] = useState<string>(UNASSIGNED);
  const { data, isLoading } = useEmployeesByDepartment(PHYSIO_DEPT_ID);
  const therapists: any[] = Array.isArray(data) ? data : [];
  const active = therapists.filter((e) =>
    e?.employmentStatus ? e.employmentStatus === "ACTIVE" : true,
  );
  // Same-gender care: only therapists matching the patient are offered. A
  // therapist whose record carries no gender is left out rather than shown —
  // offering the wrong one would break the rule, while missing one is visible
  // and fixable from the employee record.
  const matching = patientGender
    ? active.filter((e) => e?.gender === patientGender)
    : active;
  const hiddenByGender = active.length - matching.length;

  // Don't carry the previous pick into the next conversion.
  useEffect(() => {
    if (open) setSelected(UNASSIGNED);
  }, [open, patientGender]);

  const nameOf = (e: any) =>
    `${e.firstNameAr ?? e.firstName ?? ""} ${e.lastNameAr ?? e.lastName ?? ""}`.trim() || "—";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isPending) onOpenChange(o); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>التحويل إلى العلاج الفيزيائي</DialogTitle>
          <DialogDescription>
            اختر المعالج الفيزيائي المسؤول عن الحالة الجديدة. سيصله إشعار برقم الحالة ونوعها.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <Label>المعالج الفيزيائي</Label>
          <Select value={selected} onValueChange={setSelected} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? "جاري التحميل..." : "اختر المعالج..."} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>بدون تعيين</SelectItem>
              {matching.map((e) => (
                <SelectItem key={e.id} value={e.id}>{nameOf(e)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isLoading && matching.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {patientGender && active.length > 0
                ? `لا يوجد معالج ${patientGender === "FEMALE" ? "أنثى" : "ذكر"} متاح — يمكنك التحويل بدون تعيين.`
                : "لا يوجد معالجون فيزيائيون متاحون — يمكنك التحويل بدون تعيين."}
            </p>
          )}
          {!isLoading && matching.length > 0 && hiddenByGender > 0 && (
            <p className="text-xs text-muted-foreground">
              القائمة مقتصرة على المعالجين من نفس جنس المريض
              {patientGender === "FEMALE" ? " (أنثى)" : " (ذكر)"}.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            إلغاء
          </Button>
          <Button
            onClick={() => onConfirm(selected === UNASSIGNED ? undefined : selected)}
            disabled={isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            تأكيد التحويل
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
