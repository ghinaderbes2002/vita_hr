"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useEmployeesBasicList, useEmployeesByDepartment } from "@/lib/hooks/use-employees";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { DOCTOR_EXAM_TARGET_LABEL, DOCTOR_EXAM_TARGETS, type DoctorExamTarget } from "@/lib/api/clinic-physio";

const PHYSIO_DEPT_ID = "8893e27d-3581-42b6-8111-0fb743ca2403";
/** Radix rejects an empty option value, so "leave unassigned" needs a sentinel. */
const UNASSIGNED = "__unassigned__";

const TARGET_PERMISSION = {
  physio: PERMISSIONS.CLINIC_PHYSIO.CASE_CREATE,
  prosthetics: PERMISSIONS.CLINIC_PROSTHETICS.CASE_CREATE,
  podiatry: PERMISSIONS.CLINIC_PODIATRY.RECEPTION_CREATE,
  orthotics: PERMISSIONS.CLINIC_ORTHOTICS.CREATE,
} as const satisfies Record<DoctorExamTarget, string>;

/** Whoever holds any of these has at least one department to convert to. */
export const CONVERT_EXAM_PERMISSIONS = Object.values(TARGET_PERMISSION);

/** Prosthetics, podiatry and orthotics are staffed from the same department. */
const PROSTHETICS_DEPT_NAMES = ["الأطراف الصناعية", "الاطراف الصناعية", "طب الأقدام", "طب الاقدام"];

type StaffRow = {
  id: string;
  firstNameAr?: string;
  lastNameAr?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  employmentStatus?: string;
  department?: { nameAr?: string } | null;
};

/**
 * Sends a doctor exam to one department, optionally handing it to a specialist.
 * An exam converts to one department only, so the choice is made deliberately.
 */
export function ConvertExamDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  patientGender,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `undefined` converts without assigning anyone, which the API allows. */
  onConfirm: (target: DoctorExamTarget, staffId?: string) => void;
  isPending?: boolean;
  /** Patients are treated by a therapist of their own gender. Unknown = no filter. */
  patientGender?: "MALE" | "FEMALE" | null;
}) {
  const { hasPermission, isAdmin } = usePermissions();
  const targets = DOCTOR_EXAM_TARGETS.filter((x) => isAdmin() || hasPermission(TARGET_PERMISSION[x]));
  const [target, setTarget] = useState<DoctorExamTarget>(targets[0] ?? "physio");
  const [selected, setSelected] = useState<string>(UNASSIGNED);

  const isPhysio = target === "physio";
  const { data: physioData, isLoading: physioLoading } = useEmployeesByDepartment(isPhysio ? PHYSIO_DEPT_ID : "");
  const { data: basicData, isLoading: basicLoading } = useEmployeesBasicList();
  const isLoading = isPhysio ? physioLoading : basicLoading;

  const active = useMemo(() => {
    const physioStaff = (Array.isArray(physioData) ? physioData : []) as StaffRow[];
    const basicStaff = (Array.isArray(basicData) ? basicData : []) as StaffRow[];
    const rows = isPhysio
      ? physioStaff
      : basicStaff.filter((e) => PROSTHETICS_DEPT_NAMES.some((n) => e.department?.nameAr?.includes(n)));
    return rows.filter((e) => (e.employmentStatus ? e.employmentStatus === "ACTIVE" : true));
  }, [isPhysio, physioData, basicData]);

  // Same-gender care applies to the physio list, the only one carrying gender. A
  // therapist with no gender on record is left out rather than shown.
  const genderFiltered = isPhysio && !!patientGender;
  const matching = genderFiltered ? active.filter((e) => e.gender === patientGender) : active;
  const hiddenByGender = active.length - matching.length;

  useEffect(() => {
    if (open) {
      setSelected(UNASSIGNED);
      setTarget(targets[0] ?? "physio");
    }
    // Only the dialog opening resets the pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  // A pick the current list no longer offers must not be sent silently.
  useEffect(() => {
    if (selected !== UNASSIGNED && !matching.some((e) => e.id === selected)) setSelected(UNASSIGNED);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, patientGender, matching.length]);

  const nameOf = (e: StaffRow) =>
    `${e.firstNameAr ?? e.firstName ?? ""} ${e.lastNameAr ?? e.lastName ?? ""}`.trim() || "—";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isPending) onOpenChange(o); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>تحويل المعاينة</DialogTitle>
          <DialogDescription>
            تُحوَّل المعاينة إلى قسم واحد فقط، ولا يمكن تغييره بعد التحويل.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>القسم</Label>
            <Select value={target} onValueChange={(v) => setTarget(v as DoctorExamTarget)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {targets.map((x) => (
                  <SelectItem key={x} value={x}>{DOCTOR_EXAM_TARGET_LABEL[x]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>المعالج المسؤول</Label>
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
              <p className="text-xs text-muted-foreground">لا يوجد معالج متاح — يمكنك التحويل بدون تعيين.</p>
            )}
            {!isLoading && matching.length > 0 && hiddenByGender > 0 && (
              <p className="text-xs text-muted-foreground">
                القائمة مقتصرة على المعالجين من نفس جنس المريض
                {patientGender === "FEMALE" ? " (أنثى)" : " (ذكر)"}.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            إلغاء
          </Button>
          <Button
            onClick={() => onConfirm(target, selected === UNASSIGNED ? undefined : selected)}
            disabled={isPending || targets.length === 0}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            تأكيد التحويل
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
