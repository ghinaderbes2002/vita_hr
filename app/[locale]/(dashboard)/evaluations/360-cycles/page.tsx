"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BarChart3, CheckCheck, Edit, MoreHorizontal, PlayCircle, Plus, StopCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageGuard } from "@/components/permissions/page-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CycleStatusBadge } from "@/components/appraisal/appraisal-ui";
import {
  useAppraisalCycles,
  useCloseAppraisalCycle,
  useCreateAppraisalCycle,
  useFinalizeAppraisalCycle,
  useOpenAppraisalCycle,
  useUpdateAppraisalCycle,
} from "@/lib/hooks/use-appraisal";
import { AppraisalCycle } from "@/lib/api/appraisal";
import { PERMISSIONS } from "@/lib/permissions/catalog";

type PendingAction = { kind: "open" | "close" | "finalize"; cycle: AppraisalCycle } | null;

const EMPTY_FORM = { code: "", nameAr: "", startDate: "", endDate: "" };

export default function AppraisalCyclesPage() {
  return (
    <PageGuard permission={PERMISSIONS.APPRAISAL.MANAGE}>
      <AppraisalCyclesContent />
    </PageGuard>
  );
}

function AppraisalCyclesContent() {
  const t = useTranslations("appraisal");
  const router = useRouter();
  const { data: cycles = [], isLoading } = useAppraisalCycles();
  const createCycle = useCreateAppraisalCycle();
  const updateCycle = useUpdateAppraisalCycle();
  const openCycle = useOpenAppraisalCycle();
  const closeCycle = useCloseAppraisalCycle();
  const finalizeCycle = useFinalizeAppraisalCycle();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AppraisalCycle | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pending, setPending] = useState<PendingAction>(null);
  /** التأكيد الثاني للاعتماد النهائي — حوار مستقل لأن الأول يُغلق نفسه عند الضغط. */
  const [finalizeTarget, setFinalizeTarget] = useState<AppraisalCycle | null>(null);

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const startEdit = (cycle: AppraisalCycle) => {
    setEditing(cycle);
    setForm({
      code: cycle.code,
      nameAr: cycle.nameAr,
      startDate: cycle.startDate.slice(0, 10),
      endDate: cycle.endDate.slice(0, 10),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await updateCycle.mutateAsync({
          id: editing.id,
          data: { nameAr: form.nameAr.trim(), startDate: form.startDate, endDate: form.endDate },
        });
      } else {
        await createCycle.mutateAsync({
          code: form.code.trim(),
          nameAr: form.nameAr.trim(),
          startDate: form.startDate,
          endDate: form.endDate,
        });
      }
      setDialogOpen(false);
    } catch {
      // الخطأ معروض من الـ hook
    }
  };

  const runPending = () => {
    if (!pending) return;
    const { kind, cycle } = pending;
    setPending(null);
    if (kind === "open") openCycle.mutate(cycle.id);
    if (kind === "close") closeCycle.mutate(cycle.id);
    // تأكيد مزدوج: الاعتماد لا رجعة فيه
    if (kind === "finalize") setFinalizeTarget(cycle);
  };

  const formValid =
    form.nameAr.trim() && form.startDate && form.endDate && (editing || form.code.trim()) && form.startDate <= form.endDate;

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("cycles.title")}
        description={t("cycles.description")}
        actions={
          <Button onClick={startCreate}>
            <Plus className="me-2 h-4 w-4" />
            {t("cycles.create")}
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("cycles.code")}</TableHead>
                <TableHead>{t("cycles.name")}</TableHead>
                <TableHead>{t("cycles.period")}</TableHead>
                <TableHead>{t("cycles.status")}</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : cycles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    {t("cycles.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                cycles.map((cycle) => (
                  <TableRow
                    key={cycle.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/evaluations/360-cycles/${cycle.id}`)}
                  >
                    <TableCell className="font-mono text-sm">{cycle.code}</TableCell>
                    <TableCell className="font-medium">{cycle.nameAr}</TableCell>
                    <TableCell dir="ltr" className="text-sm text-muted-foreground rtl:text-right">
                      {cycle.startDate.slice(0, 10)} → {cycle.endDate.slice(0, 10)}
                    </TableCell>
                    <TableCell>
                      <CycleStatusBadge status={cycle.status} />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/evaluations/360-cycles/${cycle.id}`)}>
                            <BarChart3 className="me-2 h-4 w-4" />
                            {t("cycles.actions.details")}
                          </DropdownMenuItem>
                          {cycle.status === "DRAFT" && (
                            <DropdownMenuItem onClick={() => startEdit(cycle)}>
                              <Edit className="me-2 h-4 w-4" />
                              {t("cycles.actions.edit")}
                            </DropdownMenuItem>
                          )}
                          {(cycle.status === "DRAFT" || cycle.status === "CLOSED") && (
                            <DropdownMenuItem onClick={() => setPending({ kind: "open", cycle })}>
                              <PlayCircle className="me-2 h-4 w-4" />
                              {cycle.status === "CLOSED" ? t("cycles.actions.reopen") : t("cycles.actions.open")}
                            </DropdownMenuItem>
                          )}
                          {cycle.status === "OPEN" && (
                            <DropdownMenuItem onClick={() => setPending({ kind: "close", cycle })}>
                              <StopCircle className="me-2 h-4 w-4" />
                              {t("cycles.actions.close")}
                            </DropdownMenuItem>
                          )}
                          {cycle.status === "CLOSED" && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setPending({ kind: "finalize", cycle })}
                            >
                              <CheckCheck className="me-2 h-4 w-4" />
                              {t("cycles.actions.finalize")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t("cycles.editTitle") : t("cycles.createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("cycles.code")}</Label>
              <Input
                dir="ltr"
                value={form.code}
                disabled={!!editing}
                placeholder="H1-2027"
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("cycles.name")}</Label>
              <Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("cycles.startDate")}</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t("cycles.endDate")}</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button disabled={!formValid || createCycle.isPending || updateCycle.isPending} onClick={handleSave}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending ? t(`cycles.confirm.${pending.kind}.title`, { name: pending.cycle.nameAr }) : ""}
        description={pending ? t(`cycles.confirm.${pending.kind}.description`) : undefined}
        variant={pending?.kind === "finalize" ? "destructive" : "default"}
        onConfirm={runPending}
      />

      <ConfirmDialog
        open={!!finalizeTarget}
        onOpenChange={(open) => !open && setFinalizeTarget(null)}
        title={finalizeTarget ? t("cycles.confirm.finalize2.title", { name: finalizeTarget.nameAr }) : ""}
        description={t("cycles.confirm.finalize2.description")}
        confirmText={t("cycles.actions.finalize")}
        variant="destructive"
        onConfirm={() => {
          if (finalizeTarget) finalizeCycle.mutate(finalizeTarget.id);
          setFinalizeTarget(null);
        }}
      />
    </div>
  );
}
