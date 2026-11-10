"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { useAssignPhysioCase } from "@/lib/hooks/use-clinic-physio";
import { PHYSIO_DEPT_ID } from "@/components/clinic/convert-exam-dialog";

type StaffRow = {
  id: string;
  firstNameAr?: string;
  lastNameAr?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  employmentStatus?: string;
  department?: { id?: string } | null;
};

const nameOf = (e: StaffRow) =>
  `${e.firstNameAr ?? e.firstName ?? ""} ${e.lastNameAr ?? e.lastName ?? ""}`.trim() || "—";

/**
 * The physio head hands a case to one of the department's therapists. A case
 * converted from a doctor exam waits here unassigned; the same dialog reassigns.
 */
export function AssignTherapistDialog({
  caseId, open, onOpenChange, currentTherapistId, patientGender,
}: {
  caseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTherapistId?: string | null;
  /** Patients are treated by a therapist of their own gender. Unknown = no filter. */
  patientGender?: "MALE" | "FEMALE" | null;
}) {
  const [selected, setSelected] = useState("");
  const assign = useAssignPhysioCase();
  // The light list every screen already caches, narrowed to the physio department.
  // The per-department endpoint carries whole profiles and takes too long here.
  const { data, isLoading } = useEmployeesBasicList();

  const { therapists, genderKnown } = useMemo(() => {
    const rows = ((Array.isArray(data) ? data : []) as StaffRow[])
      .filter((e) => e.department?.id === PHYSIO_DEPT_ID)
      .filter((e) => (e.employmentStatus ? e.employmentStatus === "ACTIVE" : true));
    // Same-gender care only when the list says who is who; it is not filtered on a guess.
    const known = rows.some((e) => !!e.gender);
    return {
      therapists: patientGender && known ? rows.filter((e) => e.gender === patientGender) : rows,
      genderKnown: known,
    };
  }, [data, patientGender]);

  // The pick is cleared on the way out, so the dialog always opens empty.
  const close = () => { setSelected(""); onOpenChange(false); };

  const submit = async () => {
    if (!caseId || !selected) return;
    try {
      await assign.mutateAsync({ id: caseId, physiotherapistId: selected });
      close();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !assign.isPending) close(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{currentTherapistId ? "إعادة تعيين المعالج" : "تعيين معالج"}</DialogTitle>
          <DialogDescription>يصل إشعار للمعالج، وتظهر الحالة في قائمته.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label>المعالج</Label>
          <Select value={selected} onValueChange={setSelected} disabled={isLoading}>
            <SelectTrigger><SelectValue placeholder={isLoading ? "جاري التحميل..." : "اختر المعالج..."} /></SelectTrigger>
            <SelectContent>
              {therapists.map((e) => (
                <SelectItem key={e.id} value={e.id} disabled={e.id === currentTherapistId}>
                  {nameOf(e)}{e.id === currentTherapistId ? " (الحالي)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isLoading && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              جاري تحميل قائمة المعالجين...
            </p>
          )}
          {!isLoading && therapists.length === 0 && (
            <p className="text-xs text-muted-foreground">لا يوجد معالج متاح في القسم.</p>
          )}
          {!isLoading && therapists.length > 0 && patientGender && genderKnown && (
            <p className="text-xs text-muted-foreground">
              القائمة مقتصرة على المعالجين من نفس جنس المريض{patientGender === "FEMALE" ? " (أنثى)" : " (ذكر)"}.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={assign.isPending}>إلغاء</Button>
          <Button onClick={submit} disabled={!selected || assign.isPending}>
            {assign.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            تعيين
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
