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
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { custodiesApi } from "@/lib/api/custodies";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Custody } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  custodies: Custody[];
  fromEmployeeName: string;
}

export function BulkTransferDialog({ open, onOpenChange, custodies, fromEmployeeName }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    newEmployeeId: "",
    returnedDate: today,
    handoverDate: today,
    notes: "",
  });
  const [isPending, setIsPending] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const queryClient = useQueryClient();
  const { data: empData } = useEmployeesBasicList();
  const employees: any[] = Array.isArray(empData)
    ? empData
    : (empData as any)?.data?.items ?? (empData as any)?.items ?? [];

  const currentEmployeeId = custodies[0]?.employeeId;
  const eligible = custodies.filter((c) => c.status === "WITH_EMPLOYEE");
  const otherEmployees = employees.filter((e) => e.id !== currentEmployeeId);

  const handleSubmit = async () => {
    if (!form.newEmployeeId || eligible.length === 0) return;
    setIsPending(true);
    setProgress({ done: 0, total: eligible.length });

    const dto = {
      newEmployeeId: form.newEmployeeId,
      returnedDate: form.returnedDate || undefined,
      handoverDate: form.handoverDate || undefined,
      notes: form.notes || undefined,
    };

    let successCount = 0;
    for (const c of eligible) {
      try {
        await custodiesApi.transfer(c.id, dto);
        successCount++;
        setProgress((p) => p ? { ...p, done: successCount } : null);
      } catch {
        // continue with next
      }
    }

    await queryClient.refetchQueries({ queryKey: ["custodies"] });
    setIsPending(false);
    setProgress(null);

    if (successCount === eligible.length) {
      toast.success(`تم نقل ${successCount} عهدة بنجاح`);
    } else {
      toast.warning(`تم نقل ${successCount} من ${eligible.length} عهدة`);
    }

    onOpenChange(false);
    setForm({ newEmployeeId: "", returnedDate: today, handoverDate: today, notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isPending) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>نقل جميع العهد لموظف آخر</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
            <p className="text-muted-foreground">من الموظف</p>
            <p className="font-medium">{fromEmployeeName}</p>
            <p className="text-muted-foreground text-xs mt-1">
              {eligible.length} عهدة نشطة سيتم نقلها
              {eligible.length < custodies.length && (
                <span className="mr-1">({custodies.length - eligible.length} مُرجَعة/تالفة، لن تُنقل)</span>
              )}
            </p>
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

          {progress && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>جاري النقل...</span>
                <span>{progress.done} / {progress.total}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.newEmployeeId || eligible.length === 0 || isPending}
          >
            {isPending
              ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />جاري النقل...</>
              : `نقل ${eligible.length} عهدة`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
