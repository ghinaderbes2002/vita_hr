"use client";

import { useState } from "react";
import { EyeOff, ShieldAlert, Star, StarHalf } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ClinicCountChips } from "@/components/clinic/clinic-count-chips";
import { PatientName, PatientPicker } from "@/components/patient-app/patient-picker";
import { cn } from "@/lib/utils";
import { ROLES } from "@/lib/permissions/roles";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useEmployee } from "@/lib/hooks/use-employees";
import { useTherapistRatings } from "@/lib/hooks/use-patient-app";
import type { Patient } from "@/lib/api/clinic-patients";
import type { TherapistRating } from "@/lib/api/patient-app";

const ALL = "__all__";

const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "—";

const average = (list: TherapistRating[]) =>
  list.length ? list.reduce((sum, r) => sum + r.score, 0) / list.length : 0;

export default function PatientAppRatingsPage() {
  const { isAdmin, hasRole } = usePermissions();
  // No permission covers this screen — the backend allows only this role and
  // super_admin, and answers everyone else with 403.
  const allowed = isAdmin() || hasRole(ROLES.CLINIC_PHYSIO_DEPT_HEAD) || hasRole("رئيس قسم العلاج الفيزيائي");

  const [patient, setPatient] = useState<Patient | null>(null);
  const [therapistId, setTherapistId] = useState(ALL);

  const { data: ratings = [], isLoading, isError } = useTherapistRatings(
    {
      erpPatientId: patient?.id,
      erpTherapistId: therapistId !== ALL ? therapistId : undefined,
    },
    allowed,
  );

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-lg text-muted-foreground">
          هذه الشاشة مخصصة لرئيس قسم العلاج الفيزيائي فقط
        </p>
      </div>
    );
  }

  const rows = [...ratings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const byTherapist = Object.values(
    rows.reduce<Record<string, TherapistRating[]>>((acc, r) => {
      (acc[r.erpTherapistId] ??= []).push(r);
      return acc;
    }, {}),
  ).sort((a, b) => average(b) - average(a));

  // Options come from what's loaded; with a therapist selected the list narrows
  // to them, which is fine since "all" is always there to go back.
  const therapistIds = Array.from(new Set(rows.map((r) => r.erpTherapistId)));
  if (therapistId !== ALL && !therapistIds.includes(therapistId)) therapistIds.push(therapistId);

  return (
    <div className="space-y-4">
      <PageHeader
        title="تقييمات المعالجين"
        description="تقييمات المرضى السرية لجلسات العلاج الفيزيائي"
        actions={
          <ClinicCountChips
            isLoading={isLoading}
            counts={[
              { icon: Star, label: "تقييم", value: rows.length },
              { icon: StarHalf, label: "المتوسط", value: rows.length ? Number(average(rows).toFixed(1)) : undefined },
            ]}
          />
        }
      />

      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          هذه البيانات سرية ولا تظهر للمعالجين. كل اطّلاع على هذه الشاشة (مع الفلاتر المستخدمة)
          يُسجَّل تلقائياً في سجل التدقيق.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="space-y-1.5">
          <Label>المريض</Label>
          <PatientPicker value={patient} onChange={setPatient} />
        </div>
        <div className="space-y-1.5">
          <Label>المعالج</Label>
          <Select value={therapistId} onValueChange={setTherapistId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>كل المعالجين</SelectItem>
              {therapistIds.map((id) => (
                <SelectItem key={id} value={id}><TherapistName id={id} /></SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isError ? (
        <EmptyState
          icon={<EyeOff className="h-8 w-8 text-muted-foreground" />}
          title="تعذّر تحميل التقييمات"
          description="قد لا يكون دورك مسموحاً له بالاطلاع عليها"
        />
      ) : (
        <>
          {byTherapist.length > 1 && (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المعالج</TableHead>
                    <TableHead>عدد التقييمات</TableHead>
                    <TableHead>المتوسط</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byTherapist.map((list) => (
                    <TableRow
                      key={list[0].erpTherapistId}
                      className="cursor-pointer"
                      onClick={() => setTherapistId(list[0].erpTherapistId)}
                    >
                      <TableCell className="font-medium"><TherapistName id={list[0].erpTherapistId} /></TableCell>
                      <TableCell>{list.length}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <Stars score={average(list)} />
                          <span className="text-sm text-muted-foreground">{average(list).toFixed(1)}</span>
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المعالج</TableHead>
                  <TableHead>المريض</TableHead>
                  <TableHead>التقييم</TableHead>
                  <TableHead>ملاحظة المريض</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <EmptyState
                        icon={<Star className="h-8 w-8 text-muted-foreground" />}
                        title="لا توجد تقييمات"
                        description="يقيّم المريض الجلسة من التطبيق بعد انتهائها"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-sm" dir="ltr">{fmtDateTime(r.createdAt)}</TableCell>
                      <TableCell className="text-sm"><TherapistName id={r.erpTherapistId} /></TableCell>
                      <TableCell className="text-sm"><PatientName id={r.erpPatientId} /></TableCell>
                      <TableCell><Stars score={r.score} /></TableCell>
                      <TableCell className="max-w-96 whitespace-pre-wrap text-sm">{r.privateNote || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

function Stars({ score }: { score: number }) {
  const rounded = Math.round(score);
  return (
    <span className="flex items-center gap-0.5" aria-label={`${score} من 5`} dir="ltr">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn("h-4 w-4", i < rounded ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")}
        />
      ))}
    </span>
  );
}

function TherapistName({ id }: { id: string }) {
  const { data } = useEmployee(id);
  const e = data as any;
  const name = e ? `${e.firstNameAr ?? ""} ${e.lastNameAr ?? ""}`.trim() : "";
  return <>{name || `معالج ${id.slice(0, 8)}`}</>;
}
