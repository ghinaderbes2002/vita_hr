"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, ClipboardCheck, Clock } from "lucide-react";
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
} from "@/lib/hooks/use-probation-evaluations";
import { useEmployees } from "@/lib/hooks/use-employees";
import { useAuthStore } from "@/lib/stores/auth-store";
import { ProbationStatus, CreateProbationEvaluationData } from "@/lib/api/probation-evaluations";

const STATUS_CLASSES: Record<ProbationStatus, string> = {
  DRAFT:                    "bg-gray-100 text-gray-600",
  PENDING_SELF_EVALUATION:  "bg-indigo-100 text-indigo-700",
  PENDING_SENIOR_MANAGER:   "bg-blue-100 text-blue-700",
  PENDING_HR:               "bg-purple-100 text-purple-700",
  PENDING_CEO:              "bg-amber-100 text-amber-700",
  PENDING_MEETING_SCHEDULE: "bg-orange-100 text-orange-700",
  COMPLETED:                "bg-green-100 text-green-700",
  REJECTED_BY_SENIOR:       "bg-red-100 text-red-700",
  REJECTED_BY_HR:           "bg-red-100 text-red-700",
  REJECTED_BY_CEO:          "bg-red-100 text-red-700",
};

export default function ProbationEvaluationsPage() {
  const router = useRouter();
  const t = useTranslations("probationEvaluations");
  const tCommon = useTranslations("common");
  const { user } = useAuthStore();
  const [tab, setTab] = useState<"all" | "pending">("pending");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<{
    employeeId: string;
    hireDate: string;
    probationEndDate: string;
    seniorManagerId: string;
    workAreasNote: string;
  }>({
    employeeId: "", hireDate: "", probationEndDate: "",
    seniorManagerId: "", workAreasNote: "",
  });

  const { data: allEvals, isLoading: allLoading } = useProbationEvaluations();
  const { data: pendingEvals, isLoading: pendingLoading } = usePendingMyAction();
  const { data: employeesData } = useEmployees({ limit: 100 });
  const createEval = useCreateProbationEvaluation();

  const evals: any[] = (tab === "all" ? (allEvals as any) : (pendingEvals as any)) || [];
  const isLoading = tab === "all" ? allLoading : pendingLoading;
  const employees: any[] = (employeesData as any)?.data?.items || [];
  const employeeMap = Object.fromEntries(employees.map((e: any) => [e.id, e]));

  function handleCreate() {
    if (!form.employeeId || !form.hireDate || !form.probationEndDate) return;
    const payload: CreateProbationEvaluationData = {
      employeeId: form.employeeId,
      hireDate: form.hireDate,
      probationEndDate: form.probationEndDate,
      evaluatorId: user?.id || "",
      seniorManagerId: form.seniorManagerId || undefined,
      workAreasNote: form.workAreasNote || undefined,
    };
    createEval.mutate(payload, { onSuccess: () => setCreateOpen(false) });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        count={evals.length}
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("newEvaluation")}
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { key: "pending", icon: Clock },
          { key: "all", icon: ClipboardCheck },
        ] as const).map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : evals.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck className="h-10 w-10" />}
              title={tab === "pending" ? t("empty.pendingTitle") : t("empty.allTitle")}
              description={tab === "pending" ? t("empty.pendingDescription") : t("empty.allDescription")}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.employee")}</TableHead>
                  <TableHead>{t("table.probationEnd")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead>{t("table.overallRating")}</TableHead>
                  <TableHead>{t("table.recommendation")}</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evals.map((ev) => (
                  <TableRow key={ev.id} className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/probation-evaluations/${ev.id}`)}>
                    <TableCell className="font-medium">
                      {ev.employee
                        ? `${ev.employee.firstNameAr} ${ev.employee.lastNameAr}`
                        : employeeMap[ev.employeeId]
                          ? `${employeeMap[ev.employeeId].firstNameAr} ${employeeMap[ev.employeeId].lastNameAr}`
                          : ev.employeeId}
                    </TableCell>
                    <TableCell>
                      {ev.probationEndDate ? new Date(ev.probationEndDate).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${STATUS_CLASSES[ev.status as ProbationStatus]}`}>
                        {t(`status.${ev.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ev.overallRating ? t(`scores.${ev.overallRating}`) : "—"}
                    </TableCell>
                    <TableCell>
                      {ev.finalRecommendation ? (
                        <span className="text-xs">{t(`recommendationShort.${ev.finalRecommendation}`)}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="text-xs h-7"
                        onClick={(e) => { e.stopPropagation(); router.push(`/probation-evaluations/${ev.id}`); }}>
                        {t("table.open")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("form.createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("form.employee")} *</Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder={t("form.employeePlaceholder")} /></SelectTrigger>
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
                <Label>{t("form.hireDate")} *</Label>
                <Input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("form.probationEndDate")} *</Label>
                <Input type="date" value={form.probationEndDate} onChange={(e) => setForm({ ...form, probationEndDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("form.workAreasNote")}</Label>
              <Input
                value={form.workAreasNote}
                onChange={(e) => setForm({ ...form, workAreasNote: e.target.value })}
                placeholder={t("form.workAreasNotePlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{tCommon("cancel")}</Button>
            <Button
              onClick={handleCreate}
              disabled={!form.employeeId || !form.hireDate || !form.probationEndDate || createEval.isPending}
            >
              {t("form.createDraft")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
