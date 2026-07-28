"use client";

import { useState } from "react";
import { useUpdateEmployee } from "@/lib/hooks/use-employees";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CommissionsEditor, CommissionRow, toCommissionRows, toCommissionPayload, commissionRowsInvalid,
} from "./commissions-editor";
import type { EmployeeCommission } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  currentCommissions?: EmployeeCommission[] | null;
}

export function EmployeeCommissionsDialog({ open, onOpenChange, employeeId, currentCommissions }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>العمولات</DialogTitle>
          <DialogDescription>
            مجموع العمولات يُضاف تلقائياً لصافي الراتب الشهري. الشرح للعرض هنا فقط ولا يظهر في ملف الإكسل.
          </DialogDescription>
        </DialogHeader>
        {/* Radix unmounts the content while closed, so the rows are seeded from
            the current commissions on every open — no reset effect needed. */}
        <CommissionsForm
          employeeId={employeeId}
          currentCommissions={currentCommissions}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CommissionsForm({
  employeeId,
  currentCommissions,
  onDone,
}: {
  employeeId: string;
  currentCommissions?: EmployeeCommission[] | null;
  onDone: () => void;
}) {
  const updateEmployee = useUpdateEmployee();
  const [rows, setRows] = useState<CommissionRow[]>(() => toCommissionRows(currentCommissions));

  const invalid = commissionRowsInvalid(rows);

  async function handleSubmit() {
    await updateEmployee.mutateAsync({
      id: employeeId,
      data: { commissions: toCommissionPayload(rows) },
    });
    onDone();
  }

  return (
    <>
      <div className="py-1">
        <CommissionsEditor rows={rows} onRowsChange={setRows} />
        {invalid && (
          <p className="mt-2 text-xs text-destructive">كل عمولة تحتاج مبلغاً رقمياً موجباً.</p>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>إلغاء</Button>
        <Button onClick={handleSubmit} disabled={invalid || updateEmployee.isPending}>
          {updateEmployee.isPending ? "جارٍ الحفظ..." : "حفظ"}
        </Button>
      </DialogFooter>
    </>
  );
}
