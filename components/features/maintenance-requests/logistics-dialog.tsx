"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useProcessLogistics } from "@/lib/hooks/use-maintenance-requests";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { RepairOption } from "@/lib/api/maintenance-requests";

const REPAIR_OPTIONS: RepairOption[] = ["INTERNAL", "INTERNAL_PARTS", "EXTERNAL_WORKSHOP"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string | null;
}

export function LogisticsDialog({ open, onOpenChange, requestId }: Props) {
  const t = useTranslations();
  const [repairOption, setRepairOption] = useState<RepairOption>("INTERNAL");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState("");
  const [situationDescription, setSituationDescription] = useState("");

  const processLogistics = useProcessLogistics();
  const { data: empData } = useEmployeesBasicList();
  const employees: any[] = (empData as any)?.data?.items || (empData as any)?.data || (empData as any) || [];

  const handleConfirm = async () => {
    if (!requestId || !assignedEmployeeId) return;
    await processLogistics.mutateAsync({
      id: requestId,
      data: {
        repairOption,
        assignedEmployeeId,
        situationDescription: situationDescription || undefined,
      },
    });
    reset();
    onOpenChange(false);
  };

  const reset = () => {
    setRepairOption("INTERNAL");
    setAssignedEmployeeId("");
    setSituationDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("maintenance.actions.processTitle")}</DialogTitle>
          <DialogDescription>{t("maintenance.actions.processDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("maintenance.fields.repairOption")}</Label>
            <Select value={repairOption} onValueChange={(v) => setRepairOption(v as RepairOption)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPAIR_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {t(`maintenance.repairOptions.${opt}` as any)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("maintenance.fields.assignedEmployee")} *</Label>
            <Select value={assignedEmployeeId} onValueChange={setAssignedEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstNameAr} {emp.lastNameAr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("maintenance.fields.situationDescription")}</Label>
            <Textarea
              rows={3}
              value={situationDescription}
              onChange={(e) => setSituationDescription(e.target.value)}
              placeholder={t("maintenance.fields.situationDescriptionPlaceholder")}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={processLogistics.isPending || !assignedEmployeeId}
          >
            {processLogistics.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {t("maintenance.actions.process")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
