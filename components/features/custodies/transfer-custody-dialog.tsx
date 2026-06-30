"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useTransferCustody } from "@/lib/hooks/use-custodies";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { Custody } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  custody: Custody;
}

export function TransferCustodyDialog({ open, onOpenChange, custody }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    newEmployeeId: "",
    returnedDate: today,
    handoverDate: today,
    notes: "",
  });

  const transfer = useTransferCustody();
  const { data: empData } = useEmployeesBasicList();
  const employees: any[] = Array.isArray(empData)
    ? empData
    : (empData as any)?.data?.items ?? (empData as any)?.items ?? [];

  const otherEmployees = employees.filter((e) => e.id !== custody.employeeId);

  const handleSubmit = async () => {
    if (!form.newEmployeeId) return;
    await transfer.mutateAsync({
      id: custody.id,
      data: {
        newEmployeeId: form.newEmployeeId,
        returnedDate: form.returnedDate || undefined,
        handoverDate: form.handoverDate || undefined,
        notes: form.notes || undefined,
      },
    });
    onOpenChange(false);
    setForm({ newEmployeeId: "", returnedDate: today, handoverDate: today, notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>نقل العهدة لموظف آخر</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="text-muted-foreground">العهدة</p>
            <p className="font-medium">{custody.name}</p>
            {custody.employee && (
              <p className="text-muted-foreground mt-0.5">
                الموظف الحالي: {custody.employee.firstNameAr} {custody.employee.lastNameAr}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>الموظف الجديد <span className="text-destructive">*</span></Label>
            <Select
              value={form.newEmployeeId}
              onValueChange={(v) => setForm((f) => ({ ...f, newEmployeeId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الموظف..." />
              </SelectTrigger>
              <SelectContent>
                {otherEmployees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.firstNameAr} {e.lastNameAr}
                    {e.employeeNumber ? ` — ${e.employeeNumber}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>تاريخ الاستلام من القديم</Label>
              <Input
                type="date"
                value={form.returnedDate}
                onChange={(e) => setForm((f) => ({ ...f, returnedDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>تاريخ التسليم للجديد</Label>
              <Input
                type="date"
                value={form.handoverDate}
                onChange={(e) => setForm((f) => ({ ...f, handoverDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>ملاحظات</Label>
            <Textarea
              rows={2}
              placeholder="سبب النقل أو أي ملاحظة..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.newEmployeeId || transfer.isPending}
          >
            {transfer.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            نقل العهدة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
