"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ClipboardCheck, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  useProbationEvaluations,
  usePendingMyAction,
  useCreateProbationEvaluation,
  useProbationCriteria,
} from "@/lib/hooks/use-probation-evaluations";
import { useEmployees } from "@/lib/hooks/use-employees";
import { useAuthStore } from "@/lib/stores/auth-store";
import { ProbationStatus, ProbationScore, CreateProbationEvaluationData } from "@/lib/api/probation-evaluations";

const STATUS_CONFIG: Record<ProbationStatus, { label: string; className: string }> = {
  DRAFT:                           { label: "مسودة",                className: "bg-gray-100 text-gray-600" },
  PENDING_SENIOR_MANAGER:          { label: "بانتظار المدير الأعلى", className: "bg-blue-100 text-blue-700" },
  PENDING_HR:                      { label: "بانتظار HR",           className: "bg-purple-100 text-purple-700" },
  PENDING_CEO:                     { label: "بانتظار المدير التنفيذي", className: "bg-amber-100 text-amber-700" },
  PENDING_EMPLOYEE_ACKNOWLEDGMENT: { label: "بانتظار إقرار الموظف", className: "bg-cyan-100 text-cyan-700" },
  COMPLETED:                       { label: "مكتمل",                className: "bg-green-100 text-green-700" },
  REJECTED_BY_SENIOR:              { label: "مرفوض من المدير",       className: "bg-red-100 text-red-700" },
  REJECTED_BY_HR:                  { label: "مرفوض من HR",           className: "bg-red-100 text-red-700" },
  REJECTED_BY_CEO:                 { label: "مرفوض من المدير التنفيذي", className: "bg-red-100 text-red-700" },
};

const SCORE_OPTIONS: { value: ProbationScore; label: string }[] = [
  { value: "UNACCEPTABLE", label: "غير مقبول" },
  { value: "ACCEPTABLE",   label: "مقبول" },
  { value: "GOOD",         label: "جيد" },
  { value: "VERY_GOOD",    label: "جيد جداً" },
  { value: "EXCELLENT",    label: "ممتاز" },
];

export default function ProbationEvaluationsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<"all" | "pending">("pending");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<{
    employeeId: string;
    hireDate: string;
    probationEndDate: string;
    evaluationDate: string;
    seniorManagerId: string;
    workAreasNote: string;
    scores: Record<string, ProbationScore>;
  }>({
    employeeId: "", hireDate: "", probationEndDate: "",
    evaluationDate: new Date().toISOString().split("T")[0],
    seniorManagerId: "", workAreasNote: "", scores: {},
  });

  const { data: allEvals, isLoading: allLoading } = useProbationEvaluations();
  const { data: pendingEvals, isLoading: pendingLoading } = usePendingMyAction();
  const { data: criteria } = useProbationCriteria();
  const { data: employeesData } = useEmployees({ limit: 100 });
  const createEval = useCreateProbationEvaluation();

  const evals: any[] = (tab === "all" ? (allEvals as any) : (pendingEvals as any)) || [];
  const isLoading = tab === "all" ? allLoading : pendingLoading;
  const criteriaList: any[] = (criteria as any) || [];
  const employees: any[] = (employeesData as any)?.data?.items || [];

  function handleCreate() {
    if (!form.employeeId || !form.hireDate || !form.probationEndDate) return;
    const payload: CreateProbationEvaluationData = {
      employeeId: form.employeeId,
      hireDate: form.hireDate,
      probationEndDate: form.probationEndDate,
      evaluationDate: form.evaluationDate || undefined,
      evaluatorId: user?.id || "",
      seniorManagerId: form.seniorManagerId || undefined,
      workAreasNote: form.workAreasNote || undefined,
      scores: criteriaList
        .filter((c) => form.scores[c.id])
        .map((c) => ({ criteriaId: c.id, score: form.scores[c.id] })),
    };
    createEval.mutate(payload, { onSuccess: () => setCreateOpen(false) });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="تقييمات فترة التجربة"
        description="متابعة تقييمات الموظفين الجدد خلال فترة التجربة"
        count={evals.length}
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            تقييم جديد
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: "pending", label: "بانتظار إجراءي", icon: Clock },
          { key: "all", label: "جميع التقييمات", icon: ClipboardCheck },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : evals.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck className="h-10 w-10" />}
              title={tab === "pending" ? "لا توجد تقييمات بانتظار إجراءك" : "لا توجد تقييمات"}
              description={tab === "pending" ? "ستظهر هنا التقييمات التي تحتاج منك إجراءً" : "أنشئ تقييم فترة تجربة جديد"}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموظف</TableHead>
                  <TableHead>انتهاء التجربة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التقييم النهائي</TableHead>
                  <TableHead>التوصية</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evals.map((ev) => {
                  const scfg = STATUS_CONFIG[ev.status as ProbationStatus];
                  return (
                    <TableRow key={ev.id} className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/probation-evaluations/${ev.id}`)}>
                      <TableCell className="font-medium">
                        {ev.employee
                          ? `${ev.employee.firstNameAr} ${ev.employee.lastNameAr}`
                          : ev.employeeId}
                      </TableCell>
                      <TableCell>
                        {ev.probationEndDate
                          ? new Date(ev.probationEndDate).toLocaleDateString("ar-EG")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${scfg.className}`}>{scfg.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {ev.overallRating
                          ? SCORE_OPTIONS.find((s) => s.value === ev.overallRating)?.label || ev.overallRating
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {ev.finalRecommendation ? (
                          <span className="text-xs">
                            {{ CONFIRM_POSITION: "تثبيت", EXTEND_PROBATION: "تمديد", TRANSFER_POSITION: "نقل", TERMINATE: "إنهاء" }[ev.finalRecommendation as string]}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-xs h-7"
                          onClick={(e) => { e.stopPropagation(); router.push(`/probation-evaluations/${ev.id}`); }}>
                          فتح
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إنشاء تقييم فترة تجربة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>الموظف *</Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.firstNameAr} {e.lastNameAr} — {e.employeeNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>تاريخ التعيين *</Label>
                <Input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>نهاية فترة التجربة *</Label>
                <Input type="date" value={form.probationEndDate} onChange={(e) => setForm({ ...form, probationEndDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>تاريخ التقييم</Label>
              <Input type="date" value={form.evaluationDate} onChange={(e) => setForm({ ...form, evaluationDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>مجالات العمل</Label>
              <Input
                value={form.workAreasNote}
                onChange={(e) => setForm({ ...form, workAreasNote: e.target.value })}
                placeholder="عمل في قسم المبيعات والتسويق"
              />
            </div>
            {/* Criteria scoring */}
            {criteriaList.length > 0 && (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-medium">تقييم المعايير</p>
                <div className="space-y-2">
                  {criteriaList.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between gap-2">
                      <Label className="text-xs flex-1">{c.nameAr}</Label>
                      <Select
                        value={form.scores[c.id] || "none"}
                        onValueChange={(v) => setForm({ ...form, scores: { ...form.scores, [c.id]: v === "none" ? undefined as any : v as ProbationScore } })}
                      >
                        <SelectTrigger className="w-32 h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {SCORE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>إلغاء</Button>
            <Button
              onClick={handleCreate}
              disabled={!form.employeeId || !form.hireDate || !form.probationEndDate || createEval.isPending}
            >
              إنشاء (مسودة)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
