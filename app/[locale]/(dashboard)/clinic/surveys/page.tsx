"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { PageGuard } from "@/components/permissions/page-guard";
import {
  PatientSurveyDialog, PatientSurveysTable, SURVEY_DEPARTMENT_LABEL,
} from "@/components/clinic/patient-survey";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useClinicPatient } from "@/lib/hooks/use-clinic-patients";
import { usePatientSurveyStats } from "@/lib/hooks/use-patient-surveys";
import type { SurveyDepartment } from "@/lib/api/patient-surveys";

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

/** Survey counts per department and the centre-wide satisfaction rate. */
function SurveyStatsStrip() {
  const { data: s, isLoading } = usePatientSurveyStats();
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
        </div>
      </CardContent>
    </Card>
  );
}

function PatientSurveys() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission, isAdmin } = usePermissions();
  const canView = isAdmin() || hasPermission(PERMISSIONS.CLINIC_PATIENTS.SURVEYS_VIEW);
  const canCreate = isAdmin() || hasPermission(PERMISSIONS.CLINIC_PATIENTS.SURVEYS_CREATE);
  const [department, setDepartment] = useState<SurveyDepartment | "ALL">("ALL");
  const [open, setOpen] = useState(false);

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
          canCreate && (
            <Button onClick={() => setOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              استبيان جديد
            </Button>
          )
        }
      />

      {canView && (
        <>
          <SurveyStatsStrip />

          <Card>
            <CardContent className="pt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <PatientSurveysTable params={department !== "ALL" ? { department } : {}} />
            </CardContent>
          </Card>
        </>
      )}

      <PatientSurveyDialog open={open} onOpenChange={setOpen} />
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
