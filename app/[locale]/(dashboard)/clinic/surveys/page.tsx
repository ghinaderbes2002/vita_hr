"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { PageGuard } from "@/components/permissions/page-guard";
import {
  PatientSurveyDialog, PatientSurveysTable, RATING_LABEL, SURVEY_DEPARTMENT_LABEL,
  type RatingKey,
} from "@/components/clinic/patient-survey";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useClinicPatient } from "@/lib/hooks/use-clinic-patients";
import { usePatientSurveyStats } from "@/lib/hooks/use-patient-surveys";
import type { PatientSurveyStats, PatientSurveyStatsParams, SurveyDepartment } from "@/lib/api/patient-surveys";
import type { Patient } from "@/lib/api/clinic-patients";
import { SurveyFollowupsButton, SurveyFollowupsDialog } from "@/components/clinic/survey-followups-dialog";

export default function PatientSurveysPage() {
  return (
    <PageGuard
      permissions={[
        PERMISSIONS.CLINIC_PATIENTS.SURVEYS_VIEW,
        PERMISSIONS.CLINIC_PATIENTS.SURVEYS_CREATE,
      ]}
    >
      <PatientSurveys />
    </PageGuard>
  );
}

const clampPct = (v: unknown) => Math.max(0, Math.min(100, Number(v) || 0));

/** Survey counts per department and the satisfaction rate, for the current filters. */
function SurveyStatsStrip({ params }: { params: PatientSurveyStatsParams }) {
  const { data: s, isLoading } = usePatientSurveyStats(params);
  if (isLoading) return <div className="h-24 animate-pulse rounded-lg bg-muted" />;
  if (!s) return null;
  const pct = Math.max(0, Math.min(100, Number(s.satisfactionPercent) || 0));
  const depts = [
    { label: SURVEY_DEPARTMENT_LABEL.PROSTHETICS, n: s.byDepartment.prosthetics },
    { label: SURVEY_DEPARTMENT_LABEL.PODIATRY, n: s.byDepartment.podiatry },
    { label: SURVEY_DEPARTMENT_LABEL.PHYSIO, n: s.byDepartment.physio },
  ];
  return (
    <Card>
      <CardContent className="grid gap-6 pt-5 md:grid-cols-[auto_1fr]">
        <div className="flex flex-wrap gap-6">
          <div className="border-s-2 border-primary ps-3">
            <p className="text-xs text-muted-foreground">إجمالي الاستبيانات</p>
            <p className="text-3xl font-bold tabular-nums leading-tight">{s.total}</p>
          </div>
          {depts.map((d) => (
            <div key={d.label} className="border-s-2 ps-3">
              <p className="text-xs text-muted-foreground">{d.label}</p>
              <p className="text-3xl font-bold tabular-nums leading-tight">{d.n}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-center gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-xs text-muted-foreground">نسبة الرضى العامة</span>
            <span className="text-lg font-bold tabular-nums">{s.total ? `${pct.toFixed(1)}%` : "—"}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-e-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            متوسط التقييم العام للشركة عبر كل الاستبيانات:{" "}
            <span className="font-medium tabular-nums text-foreground">{Number(s.averageRating || 0).toFixed(2)} / 5</span>
          </p>
          {s.podiatryWeightedSatisfactionPercent != null && (
            <>
              <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-xs text-muted-foreground">نسبة رضى فيتافوت المرجّحة</span>
                <span className="text-lg font-bold tabular-nums">{Number(s.podiatryWeightedSatisfactionPercent).toFixed(1)}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-e-full bg-amber-500"
                  style={{ width: `${Math.max(0, Math.min(100, Number(s.podiatryWeightedSatisfactionPercent) || 0))}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">50% ملاءمة الضبان لراحة القدم + 50% متوسط باقي أسئلة فيتافوت</p>
            </>
          )}
        </div>
      </CardContent>
      <QuestionBreakdown byQuestion={s.byQuestion} />
    </Card>
  );
}

/** The satisfaction rate of each question, overall first, then by RATING_LABEL order. */
function QuestionBreakdown({ byQuestion }: { byQuestion: PatientSurveyStats["byQuestion"] }) {
  const rows = (Object.keys(RATING_LABEL) as RatingKey[])
    .sort((a, b) => Number(b === "overallCompanyRating") - Number(a === "overallCompanyRating"))
    .filter((k) => byQuestion[k]?.count)
    .map((k) => ({ key: k, label: RATING_LABEL[k], ...byQuestion[k] }));
  if (!rows.length) return null;
  return (
    <CardContent className="border-t pt-4">
      <p className="mb-3 text-sm font-semibold">نسبة الرضى لكل سؤال</p>
      <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
        {rows.map((r) => (
          <div key={r.key} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="shrink-0 tabular-nums">
                <span className="font-semibold text-foreground">{clampPct(r.satisfactionPercent).toFixed(1)}%</span>
                <span className="text-muted-foreground"> · {Number(r.averageRating || 0).toFixed(2)}/5 · {r.count} استبيان</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-e-full bg-primary" style={{ width: `${clampPct(r.satisfactionPercent)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  );
}

function PatientSurveys() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission, isAdmin } = usePermissions();
  const canView = isAdmin() || hasPermission(PERMISSIONS.CLINIC_PATIENTS.SURVEYS_VIEW);
  const canCreate = isAdmin() || hasPermission(PERMISSIONS.CLINIC_PATIENTS.SURVEYS_CREATE);
  const [department, setDepartment] = useState<SurveyDepartment | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const filters: PatientSurveyStatsParams = {
    ...(department !== "ALL" ? { department } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  };
  const [open, setOpen] = useState(false);
  const [followupsOpen, setFollowupsOpen] = useState(false);
  // A survey started from the follow-up list: tied to that patient and department.
  const [followup, setFollowup] = useState<{ patient: Patient; department: SurveyDepartment } | null>(null);

  // Deep-link from a PATIENT_SURVEY_REQUIRED notification:
  // ?patientId=…&department=… opens a new survey already tied to that patient
  // and department. The dialog waits for the patient so it never shows the
  // patient search first.
  const linkedPatientId = searchParams.get("patientId") ?? "";
  const linkedDeptParam = searchParams.get("department");
  const linkedDept = linkedDeptParam && linkedDeptParam in SURVEY_DEPARTMENT_LABEL
    ? (linkedDeptParam as SurveyDepartment)
    : undefined;
  const { data: linkedPatient, isError: linkedFailed } = useClinicPatient(canCreate ? linkedPatientId : "");
  const [linkedOpen, setLinkedOpen] = useState(false);
  useEffect(() => {
    // If the patient can't be read (e.g. no patient-view permission), still open
    // the survey — with the department set and the patient search instead.
    if (linkedPatient || linkedFailed) setLinkedOpen(true);
  }, [linkedPatient?.id, linkedFailed]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeLinked = (o: boolean) => {
    setLinkedOpen(o);
    // Drop the query so a refresh doesn't reopen the dialog.
    if (!o) router.replace(window.location.pathname);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="استبيانات رضا العملاء"
        description="تقييم المرضى للخدمة، مربوط تلقائياً بالمعالجين المسؤولين عن حالتهم"
        actions={
          <div className="flex flex-wrap gap-2">
            {canView && <SurveyFollowupsButton onClick={() => setFollowupsOpen(true)} />}
            {canCreate && (
              <Button onClick={() => setOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" />
                استبيان جديد
              </Button>
            )}
          </div>
        }
      />

      {canView && (
        <>
          <SurveyStatsStrip params={filters} />

          <Card>
            <CardContent className="pt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>بحث عن العميل</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="الاسم، رقم المريض أو الهاتف..."
                    className="ps-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>القسم</Label>
                <Select value={department} onValueChange={(v) => setDepartment(v as SurveyDepartment | "ALL")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">كل الأقسام</SelectItem>
                    {(Object.keys(SURVEY_DEPARTMENT_LABEL) as SurveyDepartment[]).map((d) => (
                      <SelectItem key={d} value={d}>{SURVEY_DEPARTMENT_LABEL[d]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>من تاريخ</Label>
                <Input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>إلى تاريخ</Label>
                <div className="flex gap-1.5">
                  <Input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} />
                  {(dateFrom || dateTo) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      title="مسح التاريخ"
                      aria-label="مسح التاريخ"
                      onClick={() => { setDateFrom(""); setDateTo(""); }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <PatientSurveysTable
                params={{
                  ...filters,
                  ...(debouncedSearch ? { search: debouncedSearch } : {}),
                }}
              />
            </CardContent>
          </Card>
        </>
      )}

      <PatientSurveyDialog open={open} onOpenChange={setOpen} />
      <SurveyFollowupsDialog
        open={followupsOpen}
        onOpenChange={setFollowupsOpen}
        canCreate={canCreate}
        onRate={(patient, department) => { setFollowupsOpen(false); setFollowup({ patient, department }); }}
      />
      <PatientSurveyDialog
        open={!!followup}
        onOpenChange={(o) => { if (!o) setFollowup(null); }}
        patient={followup?.patient ?? null}
        department={followup?.department}
      />
      {(linkedPatient || linkedFailed) && (
        <PatientSurveyDialog
          open={linkedOpen}
          onOpenChange={closeLinked}
          patient={linkedPatient ?? null}
          department={linkedDept}
        />
      )}
    </div>
  );
}
