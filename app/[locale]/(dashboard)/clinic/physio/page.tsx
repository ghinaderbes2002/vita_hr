"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search, Eye, Heart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/shared/pagination";
import { CaseStatusBadge } from "@/components/clinic/case-status-badge";
import { ClinicCountChips } from "@/components/clinic/clinic-count-chips";
import { usePhysioCases } from "@/lib/hooks/use-clinic-physio";
import { useClinicPatients } from "@/lib/hooks/use-clinic-patients";
import { PhysioCase, PhysioStatus } from "@/lib/api/clinic-physio";
import { useMyEmployee } from "@/lib/hooks/use-employees";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";

const LIMIT = 15;

/**
 * Job titles that oversee the whole physio caseload instead of just their own.
 * Seeing the list is separate from opening a file: مشرف المركز follows every
 * case from here, but the case page still limits them to the intake tab.
 */
const FULL_CASELOAD_JOB_CODES = [
  "VTX-JTL-000034", // رئيس قسم العلاج الفيزيائي
  "VTX-JTL-000011", // مشرف المركز
  "VTX-JTL-000007", // المدير الطبي
];

const STATUS_VALUES: PhysioStatus[] = [
  "INTAKE", "COMPLAINT", "PAIN_MAP", "MEDICAL_HISTORY", "GOALS",
  "POSTURAL_ASSESSMENT", "TREATMENT_PLAN", "EVALUATION",
  "ACTIVE_TREATMENT", "SUPERVISOR_REVIEW", "COMPLETED", "DISCHARGED", "CANCELLED",
];

const fmt = (d: string) => {
  const date = new Date(d);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

export default function PhysioListPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("clinic.physio");
  const tCommon = useTranslations("clinic.common");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PhysioStatus | "all">("all");

  const { hasPermission, isAdmin } = usePermissions();
  const { data: myEmployee } = useMyEmployee();
  const myJobTitleCode: string = (myEmployee as any)?.jobTitle?.code ?? "";
  // Everyone else — inside the department or outside it — sees only the cases
  // carrying their own id. The old rule read `department.managerId` and applied
  // only to members of the physio department, so changing someone's job title
  // left them supervising, and anyone outside the department saw everything.
  const seesAll = isAdmin() || FULL_CASELOAD_JOB_CODES.includes(myJobTitleCode);
  const shouldFilter = !seesAll;

  const myEmployeeId: string | undefined = (myEmployee as any)?.id;

  /**
   * "Mine" is the case's own assignment — `physiotherapistIds` on the record,
   * with the older singular field as a fallback. The previous filter went
   * through `/appointments/practitioner-patients`, which answers a different
   * question (patients I have appointments with) and hid every case from a
   * therapist who had not booked any.
   */
  const isMyCase = (c: PhysioCase) => {
    const ids = (c as any).physiotherapistIds as string[] | undefined;
    if (ids?.length) return !!myEmployeeId && ids.includes(myEmployeeId);
    const single = (c as any).physiotherapistId as string | null | undefined;
    return !!myEmployeeId && single === myEmployeeId;
  };

  // Filtering and paging both happen here whenever the list is narrowed, so the
  // page has to hold every record rather than one server page — otherwise page 1
  // of 41 might contain none of this therapist's cases. Same trick the search
  // path already uses; the backend accepts neither a search nor a therapist filter.
  // 100 is the server's ceiling for `limit` — asking for more is a 400.
  const trimmedSearch = search.trim();
  const clientPaged = shouldFilter || !!trimmedSearch;
  const { data, isLoading } = usePhysioCases({
    page: clientPaged ? 1 : page,
    limit: clientPaged ? 100 : LIMIT,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const filtered = (data?.items ?? []).filter((c: PhysioCase) => {
    if (shouldFilter && !isMyCase(c)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const name = c.patient ? `${c.patient.firstName} ${c.patient.lastName}`.toLowerCase() : "";
    const num = c.patient?.patientNumber?.toLowerCase() ?? "";
    return name.includes(q) || num.includes(q);
  });

  const total = clientPaged ? filtered.length : (data?.total ?? 0);
  const totalPages = clientPaged ? Math.ceil(filtered.length / LIMIT) : (data?.totalPages ?? 0);
  // Filtering can shrink the list under the current page — clamp rather than
  // leaving the user on an empty screen with no way back.
  const safePage = clientPaged ? Math.min(page, Math.max(1, totalPages)) : page;
  const cases = clientPaged
    ? filtered.slice((safePage - 1) * LIMIT, safePage * LIMIT)
    : filtered;

  // The table lists cases, so the patient head-count comes from the patients
  // endpoint — `total` above would double-count anyone with two files open.
  // A practitioner who only sees their own patients gets counted from that same
  // list instead, and their case total is withheld: the server's `total` covers
  // the whole department and would overstate what they can actually see.
  // Not everyone who may read cases may list patients — a therapist without
  // `clinic.patients.view` gets a 403, and the retries used to leave the chips
  // stuck on their skeletons. Ask only when allowed, and drop the chip when not.
  const canListPatients = hasPermission(PERMISSIONS.CLINIC_PATIENTS.VIEW);
  const { data: patientsData, isLoading: patientsCountLoading } = useClinicPatients(
    { page: 1, limit: 1, caseType: "physio" },
    !shouldFilter && canListPatients,
  );
  const counts = shouldFilter
    ? [
        { icon: Users, label: tCommon("patients"), value: new Set(filtered.map((c: PhysioCase) => c.patientId)).size },
        { icon: Heart, label: tCommon("cases"), value: filtered.length },
      ]
    : [
        ...(canListPatients
          ? [{ icon: Users, label: tCommon("patients"), value: patientsData?.total }]
          : []),
        { icon: Heart, label: tCommon("cases"), value: total },
      ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <ClinicCountChips
            isLoading={isLoading || patientsCountLoading}
            counts={counts}
          />
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pr-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("filter.all")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter.all")}</SelectItem>
            {STATUS_VALUES.map((v) => (
              <SelectItem key={v} value={v}>{t(`statuses.${v}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.patientNumber")}</TableHead>
              <TableHead>{t("table.patient")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead>حالة الخطة</TableHead>
              <TableHead>{t("table.createdAt")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState icon={<Heart className="h-8 w-8 text-muted-foreground" />} title={t("empty.title")} description={t("empty.description")} />
                </TableCell>
              </TableRow>
            ) : (
              cases.map((c: PhysioCase) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => router.push(`/${locale}/clinic/physio/${c.id}`)}
                >
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {c.patient?.patientNumber ?? "—"}
                  </TableCell>
                  <TableCell className="font-medium">
                    {c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : "—"}
                  </TableCell>
                  <TableCell><CaseStatusBadge status={c.status} /></TableCell>
                  <TableCell>
                    {c.treatmentPlan?.status === "ACTIVE" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                        نشط
                      </span>
                    ) : c.treatmentPlan?.status === "INACTIVE" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400 inline-block" />
                        غير نشط
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {fmt(c.createdAt)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => router.push(`/${locale}/clinic/physio/${c.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!trimmedSearch && totalPages > 1 && (
        <Pagination page={safePage} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={setPage} />
      )}
    </div>
  );
}
