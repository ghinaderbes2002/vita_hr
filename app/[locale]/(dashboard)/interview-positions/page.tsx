"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

const STATUS_CONFIG: Record<PositionStatus, { label: string; icon: any; className: string }> = {
  OPEN:      { label: "مفتوح",    icon: CheckCircle2, className: "bg-green-100 text-green-700 border-green-200" },
  CLOSED:    { label: "مغلق",     icon: XCircle,      className: "bg-gray-100 text-gray-600 border-gray-200" },
  SUSPENDED: { label: "موقوف",   icon: PauseCircle,  className: "bg-amber-100 text-amber-700 border-amber-200" },
};

const WORK_TYPE_LABELS: Record<WorkType, string> = {
  FULL_TIME: "دوام كامل",
  PART_TIME: "دوام جزئي",
};

const WORK_MODE_LABELS: Record<WorkMode, string> = {
  ON_SITE: "حضوري",
  REMOTE:  "عن بُعد",
  HYBRID:  "هجين",
};

interface FormData {
  jobTitle: string;
  department: string;
  sectorName: string;
  workType: WorkType | "";
  workMode: WorkMode | "";
  committeeMembers: string;
  interviewDate: string;
}

const EMPTY_FORM: FormData = {
  jobTitle: "", department: "", sectorName: "",
  workType: "", workMode: "", committeeMembers: "", interviewDate: "",
};

export default function InterviewPositionsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<PositionStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<InterviewPosition | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  const { data, isLoading } = useInterviewPositions();
  const createPosition = useCreateInterviewPosition();
  const updatePosition = useUpdateInterviewPosition();
  const deletePosition = useDeleteInterviewPosition();

  const allPositions: InterviewPosition[] = (data as any)?.items || (data as any) || [];
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
    };
    if (selected) {
      updatePosition.mutate({ id: selected.id, data: payload }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createPosition.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  }

  const openCount = allPositions.filter((p) => p.status === "OPEN").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="الشواغر الوظيفية"
        description="إدارة الشواغر ولجان المقابلات والأسئلة التقنية"
        count={allPositions.length}
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            إضافة شاغر
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {(["OPEN", "CLOSED", "SUSPENDED"] as PositionStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          return (
            <Card
              key={s}
              className={`cursor-pointer transition-all ${statusFilter === s ? "ring-2 ring-primary" : ""}`}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            >
              <CardContent className="flex items-center gap-3 py-4">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{cfg.label}</p>
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
          title="لا توجد شواغر"
          description="أضف شاغراً وظيفياً جديداً للبدء"
          action={<Button onClick={openCreate} variant="outline" className="gap-2"><Plus className="h-4 w-4" />إضافة شاغر</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {positions.map((pos) => {
            const cfg = STATUS_CONFIG[pos.status];
            return (
              <Card key={pos.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-base leading-snug">{pos.jobTitle}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{pos.department}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge className={`text-xs border ${cfg.className}`}>{cfg.label}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/interview-positions/${pos.id}`)}>
                            عرض التفاصيل
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(pos)}>
                            <Pencil className="h-3.5 w-3.5 ml-2" />تعديل
                          </DropdownMenuItem>
                          {pos.status === "OPEN" && (
                            <DropdownMenuItem onClick={() => updatePosition.mutate({ id: pos.id, data: { status: "CLOSED" } })}>
                              إغلاق الشاغر
                            </DropdownMenuItem>
                          )}
                          {pos.status !== "OPEN" && (
                            <DropdownMenuItem onClick={() => updatePosition.mutate({ id: pos.id, data: { status: "OPEN" } })}>
                              إعادة فتح
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => { setSelected(pos); setDeleteOpen(true); }}
                          >
                            <Trash2 className="h-3.5 w-3.5 ml-2" />حذف
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
                      <span>{WORK_TYPE_LABELS[pos.workType]}</span>
                      {pos.workMode && <span>· {WORK_MODE_LABELS[pos.workMode]}</span>}
                    </div>
                  )}
                  {pos.interviewDate && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(pos.interviewDate).toLocaleDateString("ar-EG")}</span>
                    </div>
                  )}
                  {pos.committeeMembers?.length ? (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{pos.committeeMembers.slice(0, 2).join("، ")}{pos.committeeMembers.length > 2 ? ` +${pos.committeeMembers.length - 2}` : ""}</span>
                    </div>
                  ) : null}
                  {pos.technicalQuestions?.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {pos.technicalQuestions.length} سؤال تقني
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-1.5 mt-1 text-xs justify-between"
                    onClick={() => router.push(`/interview-positions/${pos.id}`)}
                  >
                    عرض التقييمات والمرشحين
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selected ? "تعديل الشاغر" : "إضافة شاغر وظيفي"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>المسمى الوظيفي *</Label>
                <Input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} placeholder="مطور برمجيات" />
              </div>
              <div className="space-y-1.5">
                <Label>القسم *</Label>
                <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="تقنية المعلومات" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>القطاع</Label>
              <Input value={form.sectorName} onChange={(e) => setForm({ ...form, sectorName: e.target.value })} placeholder="إداري" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>نوع الدوام</Label>
                <Select value={form.workType || "none"} onValueChange={(v) => setForm({ ...form, workType: v === "none" ? "" : v as WorkType })}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="FULL_TIME">دوام كامل</SelectItem>
                    <SelectItem value="PART_TIME">دوام جزئي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>طريقة العمل</Label>
                <Select value={form.workMode || "none"} onValueChange={(v) => setForm({ ...form, workMode: v === "none" ? "" : v as WorkMode })}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="ON_SITE">حضوري</SelectItem>
                    <SelectItem value="REMOTE">عن بُعد</SelectItem>
                    <SelectItem value="HYBRID">هجين</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>تاريخ المقابلة</Label>
              <Input type="date" value={form.interviewDate} onChange={(e) => setForm({ ...form, interviewDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>أعضاء لجنة المقابلة</Label>
              <Input
                value={form.committeeMembers}
                onChange={(e) => setForm({ ...form, committeeMembers: e.target.value })}
                placeholder="أحمد محمد، سارة خالد (مفصولين بفاصلة عربية)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.jobTitle.trim() || !form.department.trim() || createPosition.isPending || updatePosition.isPending}
            >
              {selected ? "حفظ" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="حذف الشاغر"
        description={`هل أنت متأكد من حذف شاغر "${selected?.jobTitle}"؟`}
        onConfirm={() => selected && deletePosition.mutate(selected.id, { onSuccess: () => setDeleteOpen(false) })}
        variant="destructive"
      />
    </div>
  );
}
