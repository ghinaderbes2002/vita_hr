"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Plus, Pencil, Trash2, ChevronRight, Users, Calendar,
  Briefcase, MoreHorizontal, CheckCircle2, XCircle, PauseCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useInterviewPositions,
  useCreateInterviewPosition,
  useUpdateInterviewPosition,
  useDeleteInterviewPosition,
} from "@/lib/hooks/use-interview-positions";
import { InterviewPosition, PositionStatus, WorkType, WorkMode } from "@/lib/api/interview-positions";

const STATUS_ICONS: Record<PositionStatus, any> = {
  OPEN:      CheckCircle2,
  CLOSED:    XCircle,
  SUSPENDED: PauseCircle,
};

const STATUS_CLASSES: Record<PositionStatus, string> = {
  OPEN:      "bg-green-100 text-green-700 border-green-200",
  CLOSED:    "bg-gray-100 text-gray-600 border-gray-200",
  SUSPENDED: "bg-amber-100 text-amber-700 border-amber-200",
};

interface FormData {
  jobTitle: string;
  department: string;
  sectorName: string;
  workType: WorkType | "";
  workMode: WorkMode | "";
  committeeMembers: string;
  interviewDate: string;
  requiresLanguage: boolean;
  requiresComputer: boolean;
}

const EMPTY_FORM: FormData = {
  jobTitle: "", department: "", sectorName: "",
  workType: "", workMode: "", committeeMembers: "", interviewDate: "",
  requiresLanguage: true, requiresComputer: true,
};

export default function InterviewPositionsPage() {
  const router = useRouter();
  const t = useTranslations("interviewPositions");
  const tCommon = useTranslations("common");

  const [statusFilter, setStatusFilter] = useState<PositionStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<InterviewPosition | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  const { data, isLoading } = useInterviewPositions();
  const createPosition = useCreateInterviewPosition();
  const updatePosition = useUpdateInterviewPosition();
  const deletePosition = useDeleteInterviewPosition();

  const rawPositions: InterviewPosition[] = (data as any)?.items || (data as any) || [];
  const allPositions: InterviewPosition[] = rawPositions.map((p) => ({
    ...p,
    committeeMembers: Array.isArray(p.committeeMembers)
      ? p.committeeMembers
      : p.committeeMembers
      ? String(p.committeeMembers).split(",").map((s) => s.trim()).filter(Boolean)
      : [],
  }));
  const positions = statusFilter === "all"
    ? allPositions
    : allPositions.filter((p) => p.status === statusFilter);

  function openCreate() {
    setSelected(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(pos: InterviewPosition) {
    setSelected(pos);
    setForm({
      jobTitle: pos.jobTitle,
      department: pos.department,
      sectorName: pos.sectorName || "",
      workType: pos.workType || "",
      workMode: pos.workMode || "",
      committeeMembers: pos.committeeMembers?.join("، ") || "",
      interviewDate: pos.interviewDate ? pos.interviewDate.split("T")[0] : "",
      requiresLanguage: pos.requiresLanguage ?? true,
      requiresComputer: pos.requiresComputer ?? true,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.jobTitle.trim() || !form.department.trim()) return;
    const payload = {
      jobTitle: form.jobTitle,
      department: form.department,
      sectorName: form.sectorName || undefined,
      workType: (form.workType as WorkType) || undefined,
      workMode: (form.workMode as WorkMode) || undefined,
      committeeMembers: form.committeeMembers
        ? form.committeeMembers.split("،").map((s) => s.trim()).filter(Boolean)
        : undefined,
      interviewDate: form.interviewDate || undefined,
      requiresLanguage: form.requiresLanguage,
      requiresComputer: form.requiresComputer,
    };
    if (selected) {
      updatePosition.mutate({ id: selected.id, data: payload }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createPosition.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        count={allPositions.length}
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("addPosition")}
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {(["OPEN", "CLOSED", "SUSPENDED"] as PositionStatus[]).map((s) => {
          const Icon = STATUS_ICONS[s];
          return (
            <Card
              key={s}
              className={`cursor-pointer transition-all ${statusFilter === s ? "ring-2 ring-primary" : ""}`}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            >
              <CardContent className="flex items-center gap-3 py-4">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t(`status.${s}`)}</p>
                  <p className="text-2xl font-bold">{allPositions.filter((p) => p.status === s).length}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-52" />)}
        </div>
      ) : positions.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-10 w-10" />}
          title={t("empty.title")}
          description={t("empty.description")}
          action={
            <Button onClick={openCreate} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />{t("addPosition")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {positions.map((pos) => (
            <Card key={pos.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-base leading-snug">{pos.jobTitle}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{pos.department}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge className={`text-xs border ${STATUS_CLASSES[pos.status]}`}>
                      {t(`status.${pos.status}`)}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/interview-positions/${pos.id}`)}>
                          {t("card.viewDetails")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(pos)}>
                          <Pencil className="h-3.5 w-3.5 ml-2" />{t("card.edit")}
                        </DropdownMenuItem>
                        {pos.status === "OPEN" && (
                          <DropdownMenuItem onClick={() => updatePosition.mutate({ id: pos.id, data: { status: "CLOSED" } })}>
                            {t("card.close")}
                          </DropdownMenuItem>
                        )}
                        {pos.status !== "OPEN" && (
                          <DropdownMenuItem onClick={() => updatePosition.mutate({ id: pos.id, data: { status: "OPEN" } })}>
                            {t("card.reopen")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => { setSelected(pos); setDeleteOpen(true); }}
                        >
                          <Trash2 className="h-3.5 w-3.5 ml-2" />{t("card.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {pos.workType && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5" />
                    <span>{t(`workType.${pos.workType}`)}</span>
                    {pos.workMode && <span>· {t(`workMode.${pos.workMode}`)}</span>}
                  </div>
                )}
                {pos.interviewDate && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(pos.interviewDate).toLocaleDateString()}</span>
                  </div>
                )}
                {pos.committeeMembers?.length ? (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>
                      {pos.committeeMembers.slice(0, 2).join("، ")}
                      {pos.committeeMembers.length > 2 ? ` +${pos.committeeMembers.length - 2}` : ""}
                    </span>
                  </div>
                ) : null}
                {pos.technicalQuestions?.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("card.technicalQuestions", { count: pos.technicalQuestions.length })}
                  </p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-1.5 mt-1 text-xs justify-between"
                  onClick={() => router.push(`/interview-positions/${pos.id}`)}
                >
                  {t("card.viewCandidates")}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selected ? t("dialog.editTitle") : t("dialog.addTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("form.jobTitle")} *</Label>
                <Input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} placeholder={t("form.jobTitlePlaceholder")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("form.department")} *</Label>
                <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder={t("form.departmentPlaceholder")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("form.sector")}</Label>
              <Input value={form.sectorName} onChange={(e) => setForm({ ...form, sectorName: e.target.value })} placeholder={t("form.sectorPlaceholder")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t("form.workType")}</Label>
                <Select value={form.workType || "none"} onValueChange={(v) => setForm({ ...form, workType: v === "none" ? "" : v as WorkType })}>
                  <SelectTrigger><SelectValue placeholder={tCommon("select")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="FULL_TIME">{t("workType.FULL_TIME")}</SelectItem>
                    <SelectItem value="PART_TIME">{t("workType.PART_TIME")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("form.workMode")}</Label>
                <Select value={form.workMode || "none"} onValueChange={(v) => setForm({ ...form, workMode: v === "none" ? "" : v as WorkMode })}>
                  <SelectTrigger><SelectValue placeholder={tCommon("select")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="ON_SITE">{t("workMode.ON_SITE")}</SelectItem>
                    <SelectItem value="REMOTE">{t("workMode.REMOTE")}</SelectItem>
                    <SelectItem value="HYBRID">{t("workMode.HYBRID")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("form.interviewDate")}</Label>
              <Input type="date" value={form.interviewDate} onChange={(e) => setForm({ ...form, interviewDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("form.committeeMembers")}</Label>
              <Input
                value={form.committeeMembers}
                onChange={(e) => setForm({ ...form, committeeMembers: e.target.value })}
                placeholder={t("form.committeeMembersPlaceholder")}
              />
            </div>
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="requiresLanguage"
                  checked={form.requiresLanguage}
                  onCheckedChange={(v) => setForm({ ...form, requiresLanguage: !!v })}
                />
                <Label htmlFor="requiresLanguage" className="font-normal cursor-pointer">
                  {t("form.requiresLanguage")}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="requiresComputer"
                  checked={form.requiresComputer}
                  onCheckedChange={(v) => setForm({ ...form, requiresComputer: !!v })}
                />
                <Label htmlFor="requiresComputer" className="font-normal cursor-pointer">
                  {t("form.requiresComputer")}
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{tCommon("cancel")}</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.jobTitle.trim() || !form.department.trim() || createPosition.isPending || updatePosition.isPending}
            >
              {selected ? t("dialog.save") : t("dialog.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("delete.title")}
        description={t("delete.description", { title: selected?.jobTitle ?? "" })}
        onConfirm={() => selected && deletePosition.mutate(selected.id, { onSuccess: () => setDeleteOpen(false) })}
        variant="destructive"
      />
    </div>
  );
}
