"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { ArrowRight, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PatientPhoto } from "@/components/clinic/patient-photo";
import { PractitionersCard } from "@/components/clinic/podiatry-practitioners-card";
import { OrthoticsReceptionDialog } from "@/components/clinic/orthotics-reception-dialog";
import {
  OrthoticsDoctorSection, OrthoticsPhysioSection, OrthoticsProsthetistSection,
} from "@/components/clinic/orthotics-assessment-sections";
import { sectionsFilled } from "@/components/clinic/orthotics-labels";
import {
  useAssignOrthoticsPractitioners, useOrthoticsReception,
} from "@/lib/hooks/use-clinic-orthotics";
import { useClinicPatient } from "@/lib/hooks/use-clinic-patients";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

function ageFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const m = now.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age--;
  return age >= 0 && age < 150 ? age : null;
}

function Row({ label, value, dir }: { label: string; value?: React.ReactNode; dir?: "ltr" }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium">{label}</p>
      <p className="text-sm text-muted-foreground" dir={dir}>{value || "—"}</p>
    </div>
  );
}

const TAB_CLASS = "text-sm py-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white";

export default function OrthoticsReceptionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const isRtl = locale === "ar";

  const { data: reception, isLoading } = useOrthoticsReception(id);
  const { data: patient } = useClinicPatient(reception?.patientId ?? "");
  const assign = useAssignOrthoticsPractitioners();

  const { hasPermission, isAdmin } = usePermissions();
  const can = (p: Parameters<typeof hasPermission>[0]) => isAdmin() || hasPermission(p);

  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }
  if (!reception) {
    return <p className="py-12 text-center text-muted-foreground">لم يُعثر على الاستقبال</p>;
  }

  const patientName =
    `${patient?.firstName ?? reception.patient?.firstName ?? ""} ${patient?.lastName ?? reception.patient?.lastName ?? ""}`.trim() || "—";
  const patientNumber = patient?.patientNumber ?? reception.patient?.patientNumber;
  const age = ageFromDob(patient?.dateOfBirth);
  const filled = sectionsFilled(reception);
  const done = (on: boolean) => on && <Check className="ms-1 h-3.5 w-3.5" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <button
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/${locale}/clinic/orthotics`)}
          >
            <ArrowRight className="h-3.5 w-3.5 ltr:rotate-180" />
            قسم المقومات
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold">{patientName}</h1>
            {patientNumber && <Badge variant="outline" className="font-mono text-xs">{patientNumber}</Badge>}
            <span className="text-xs text-muted-foreground">{fmt(reception.createdAt)}</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="reception" dir={isRtl ? "rtl" : "ltr"}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1" dir={isRtl ? "rtl" : "ltr"}>
          <TabsTrigger value="reception" className={TAB_CLASS}>الاستقبال</TabsTrigger>
          <TabsTrigger value="doctor" className={TAB_CLASS}>طبيب العظمية{done(filled.doctor)}</TabsTrigger>
          <TabsTrigger value="physio" className={TAB_CLASS}>العلاج الفيزيائي{done(filled.physio)}</TabsTrigger>
          <TabsTrigger value="prosthetist" className={TAB_CLASS}>الأطراف الصناعية{done(filled.prosthetist)}</TabsTrigger>
        </TabsList>

        <TabsContent value="reception" className="mt-4 space-y-4">
          <PractitionersCard
            practitionerIds={reception.practitionerIds ?? []}
            canEdit={can(PERMISSIONS.CLINIC_ORTHOTICS.EDIT)}
            isPending={assign.isPending}
            onSave={(ids) => assign.mutate({ id, practitionerIds: ids })}
          />

          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">بيانات ولي الأمر</CardTitle>
                <ActionGuard permission={PERMISSIONS.CLINIC_ORTHOTICS.EDIT}>
                  <Button size="sm" className="gap-1.5 bg-orange-500 text-white hover:bg-orange-600" onClick={() => setEditOpen(true)}>
                    <Pencil className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                </ActionGuard>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-3">
                <Row label="اسم ولي الأمر" value={reception.guardianName} />
                <Row label="صلة القرابة" value={reception.guardianRelation} />
                <Row label="هاتف ولي الأمر" value={reception.guardianPhone} dir="ltr" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">معلومات المريض</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-3 md:grid-cols-3">
                  <Row label="رقم المريض" value={patientNumber} />
                  <Row label="اسم المريض" value={patientName} />
                  <Row label="الهاتف" value={patient?.phone} dir="ltr" />
                  <Row label="العمر" value={age != null ? `${age} سنة` : null} />
                  <Row label="الطول" value={patient?.heightCm ? `${patient.heightCm} cm` : null} />
                  <Row label="الوزن" value={patient?.weightKg ? `${patient.weightKg} kg` : null} />
                </div>
                <PatientPhoto patientId={reception.patientId} className="h-28 w-28 shrink-0" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="doctor" className="mt-4">
          <OrthoticsDoctorSection reception={reception} canEdit={can(PERMISSIONS.CLINIC_ORTHOTICS.DOCTOR_ASSESSMENT_EDIT)} />
        </TabsContent>

        <TabsContent value="physio" className="mt-4">
          <OrthoticsPhysioSection reception={reception} canEdit={can(PERMISSIONS.CLINIC_ORTHOTICS.PHYSIO_ASSESSMENT_EDIT)} />
        </TabsContent>

        <TabsContent value="prosthetist" className="mt-4">
          <OrthoticsProsthetistSection reception={reception} canEdit={can(PERMISSIONS.CLINIC_ORTHOTICS.PROSTHETIST_OPINION_EDIT)} />
        </TabsContent>
      </Tabs>

      <OrthoticsReceptionDialog open={editOpen} onOpenChange={setEditOpen} reception={reception} />

    </div>
  );
}
