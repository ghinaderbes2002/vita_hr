"use client";

import { useState } from "react";
import { Plus, Trash2, ClipboardList, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useOnboardingTemplates, useCreateOnboardingTemplate, useDeleteOnboardingTemplate,
} from "@/lib/hooks/use-onboarding";
import { WorkflowType, TaskAssignee } from "@/lib/api/onboarding";

const ASSIGNEE_LABELS: Record<TaskAssignee, string> = {
  HR: "الموارد البشرية",
  IT: "تقنية المعلومات",
  MANAGER: "المدير المباشر",
  EMPLOYEE: "الموظف",
  OTHER: "أخرى",
};

const ASSIGNEE_COLORS: Record<TaskAssignee, string> = {
  HR: "bg-purple-100 text-purple-700",
  IT: "bg-blue-100 text-blue-700",
  MANAGER: "bg-amber-100 text-amber-700",
  EMPLOYEE: "bg-green-100 text-green-700",
  OTHER: "bg-gray-100 text-gray-600",
};

type TaskDraft = { titleAr: string; assignedTo: TaskAssignee; daysFromStart: number; order: number };

export default function OnboardingTemplatesPage() {
  const [tab, setTab] = useState<WorkflowType>("ONBOARDING");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({ nameAr: "", nameEn: "", description: "", isDefault: false });
  const [tasks, setTasks] = useState<TaskDraft[]>([
    { titleAr: "", assignedTo: "HR", daysFromStart: 1, order: 0 },
  ]);

  const { data: templates, isLoading } = useOnboardingTemplates(tab);
  const createTemplate = useCreateOnboardingTemplate();
  const deleteTemplate = useDeleteOnboardingTemplate();

  const templateList: any[] = (templates as any) || [];

  function addTask() {
    setTasks([...tasks, { titleAr: "", assignedTo: "HR", daysFromStart: 1, order: tasks.length }]);
  }

  function removeTask(i: number) {
    setTasks(tasks.filter((_, idx) => idx !== i).map((t, idx) => ({ ...t, order: idx })));
  }

  function updateTask(i: number, key: keyof TaskDraft, value: any) {
    setTasks(tasks.map((t, idx) => idx === i ? { ...t, [key]: value } : t));
  }

  function handleCreate() {
    if (!form.nameAr.trim()) return;
    const validTasks = tasks.filter(t => t.titleAr.trim()).map(t => ({ ...t, titleEn: "" }));
    createTemplate.mutate(
      { nameAr: form.nameAr, nameEn: form.nameEn || "", type: tab, description: form.description || undefined, isDefault: form.isDefault, tasks: validTasks },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setForm({ nameAr: "", nameEn: "", description: "", isDefault: false });
          setTasks([{ titleAr: "", assignedTo: "HR", daysFromStart: 1, order: 0 }]);
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">قوالب الإلحاق والإنهاء</h1>
          <p className="text-muted-foreground text-sm mt-0.5">إدارة قوالب مهام استقبال وإنهاء الموظفين</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          قالب جديد
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border p-1 w-fit">
        {(["ONBOARDING", "OFFBOARDING"] as WorkflowType[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t === "ONBOARDING" ? "استقبال موظف" : "إنهاء خدمة"}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : templateList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <ClipboardList className="h-12 w-12 opacity-30" />
          <p>لا توجد قوالب — أنشئ قالباً للبدء</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templateList.map((tmpl: any) => (
            <Card key={tmpl.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base leading-snug">{tmpl.nameAr}</CardTitle>
                    {tmpl.nameEn && <p className="text-xs text-muted-foreground mt-0.5">{tmpl.nameEn}</p>}
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                    onClick={() => { setSelectedId(tmpl.id); setDeleteOpen(true); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {tmpl.isDefault && <Badge className="text-xs w-fit bg-amber-100 text-amber-700 border-amber-200">افتراضي</Badge>}
              </CardHeader>
              <CardContent>
                {tmpl.description && <p className="text-xs text-muted-foreground mb-3">{tmpl.description}</p>}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ClipboardList className="h-4 w-4" />
                  <span>{tmpl.tasks?.length || 0} مهمة</span>
                </div>
                {tmpl.tasks?.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {tmpl.tasks.slice(0, 3).map((task: any, i: number) => (
                      <div key={task.id || i} className="flex items-center justify-between gap-2">
                        <p className="text-xs truncate flex-1">{task.titleAr}</p>
                        <Badge className={`text-[10px] shrink-0 ${ASSIGNEE_COLORS[task.assignedTo as TaskAssignee] || "bg-gray-100 text-gray-600"}`}>
                          {ASSIGNEE_LABELS[task.assignedTo as TaskAssignee] || task.assignedTo}
                        </Badge>
                      </div>
                    ))}
                    {tmpl.tasks.length > 3 && (
                      <p className="text-xs text-muted-foreground">+{tmpl.tasks.length - 3} مهام أخرى</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إنشاء قالب جديد — {tab === "ONBOARDING" ? "استقبال" : "إنهاء خدمة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>اسم القالب (عربي) *</Label>
                <Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder="قالب استقبال موظف جديد" />
              </div>
              <div className="space-y-1.5">
                <Label>اسم القالب (إنجليزي)</Label>
                <Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} placeholder="New Employee Onboarding" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>الوصف</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>

            {/* Tasks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>المهام ({tasks.length})</Label>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addTask}>
                  <Plus className="h-3 w-3" />إضافة مهمة
                </Button>
              </div>
              {tasks.map((task, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">مهمة {i + 1}</span>
                    {tasks.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeTask(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">عنوان المهمة *</Label>
                      <Input
                        className="h-8 text-sm"
                        value={task.titleAr}
                        onChange={(e) => updateTask(i, "titleAr", e.target.value)}
                        placeholder="تسليم جهاز اللابتوب"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">المسؤول</Label>
                      <Select value={task.assignedTo} onValueChange={(v) => updateTask(i, "assignedTo", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(ASSIGNEE_LABELS).map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">بعد كم يوم من البداية</Label>
                      <Input
                        type="number" min={0} className="h-8 text-sm"
                        value={task.daysFromStart}
                        onChange={(e) => updateTask(i, "daysFromStart", Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={!form.nameAr.trim() || createTemplate.isPending}>
              إنشاء القالب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="حذف القالب"
        description="هل أنت متأكد من حذف هذا القالب؟"
        onConfirm={() => deleteTemplate.mutate(selectedId, { onSuccess: () => setDeleteOpen(false) })}
        variant="destructive"
      />
    </div>
  );
}
