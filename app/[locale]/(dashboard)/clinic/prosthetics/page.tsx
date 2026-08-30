"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search, Eye, Activity, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { useProstheticsCases, useProstheticsCasesByPractitioner } from "@/lib/hooks/use-clinic-prosthetics";
import { useMyEmployee } from "@/lib/hooks/use-employees";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useClinicPatients } from "@/lib/hooks/use-clinic-patients";
import { ProstheticsCase, ProstheticsStatus } from "@/lib/api/clinic-prosthetics";

const LIMIT = 15;

/** Job titles that oversee the whole caseload instead of just their own cases. */
const FULL_CASELOAD_JOB_CODES = [
  "VTX-JTL-000035", // رئيس قسم الأطراف الصناعية وطب الأقدام
  "VTX-JTL-000007",
];

const STATUS_VALUES: ProstheticsStatus[] = [
  "INTAKE", "ASSESSMENT", "COMMITTEE_REVIEW", "COMMITTEE_APPROVED",
  "FITTING", "GAIT_ANALYSIS", "FINAL_EVALUATION", "DELIVERED",
  "FOLLOW_UP", "CLOSED", "CANCELLED",
];

const fmt = (d: string) => {
  const date = new Date(d);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

export default function ProstheticsListPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("clinic.prosthetics");
  const tCommon = useTranslations("clinic.common");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProstheticsStatus | "all">("all");

  // Only the overseeing job titles and system admins get the whole caseload.
  // Everyone else — including a physiotherapist from another department who is
  // attached to some of these cases — sees just the cases carrying their own id.
  const { isAdmin } = usePermissions();
  const { data: myEmployee, isLoading: meLoading } = useMyEmployee();
  const myEmployeeId: string | undefined = (myEmployee as any)?.id;
  const myJobTitleCode: string = (myEmployee as any)?.jobTitle?.code ?? "";
  const seesAll = isAdmin() || FULL_CASELOAD_JOB_CODES.includes(myJobTitleCode);
  const mineOnly = !seesAll;

  // Only one of the two runs — the mode isn't known until the profile lands, so
  // neither fires before then and a practitioner never pulls the whole list.
  const { data, isLoading: listLoading } = useProstheticsCases(
    { page, limit: LIMIT, status: statusFilter !== "all" ? statusFilter : undefined },
    !meLoading && !mineOnly,
  );
  const { data: myCases, isLoading: mineLoading } = useProstheticsCasesByPractitioner(
    myEmployeeId,
    !meLoading && mineOnly,
  );
  const isLoading = meLoading || (mineOnly ? mineLoading : listLoading);

  // `by-practitioner` returns every case at once, so its status filter, paging
  // and search all happen here; the paginated list already applied status+page
  // server-side and only needs the search.
  const source: ProstheticsCase[] = mineOnly ? (myCases ?? []) : (data?.items ?? []);
  const filtered = source.filter((c: ProstheticsCase) => {
    if (mineOnly && statusFilter !== "all" && c.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const name = c.patient ? `${c.patient.firstName} ${c.patient.lastName}`.toLowerCase() : "";
    const num = c.patient?.patientNumber?.toLowerCase() ?? "";
    return name.includes(q) || num.includes(q);
  });

  const total = mineOnly ? filtered.length : (data?.total ?? 0);
  const totalPages = mineOnly ? Math.ceil(filtered.length / LIMIT) : (data?.totalPages ?? 0);
  // Filtering can shrink the list under the current page — clamp instead of
  // leaving the user on an empty screen with no way back.
  const safePage = mineOnly ? Math.min(page, Math.max(1, totalPages)) : page;
  const cases = mineOnly
    ? filtered.slice((safePage - 1) * LIMIT, safePage * LIMIT)
    : filtered;

  // The table lists cases, so the patient head-count has to come from the
  // patients endpoint — `total` above would double-count anyone with two files.
  // In "my cases" mode that endpoint would report the whole clinic, so the count
  // is derived from the loaded cases instead: same set as the table, exactly.
  const { data: patientsData, isLoading: patientsLoading } = useClinicPatients(
    { page: 1, limit: 1, caseType: "prosthetics" },
    !mineOnly,
  );
  const patientCount = mineOnly
    ? new Set(filtered.map((c) => c.patientId)).size
    : patientsData?.total;

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <ClinicCountChips
            isLoading={isLoading || patientsLoading}
            counts={[
              { icon: Users, label: tCommon("patients"), value: patientCount },
              { icon: Activity, label: tCommon("cases"), value: total },
            ]}
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
              <TableHead>{t("table.amputationType")}</TableHead>
              <TableHead>{t("table.amputationSide")}</TableHead>
              <TableHead>{t("table.amputationLevel")}</TableHead>
              <TableHead>{t("table.createdAt")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState icon={<Activity className="h-8 w-8 text-muted-foreground" />} title={t("empty.title")} description={t("empty.description")} />
                </TableCell>
              </TableRow>
            ) : (
              cases.map((c: ProstheticsCase) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => router.push(`/${locale}/clinic/prosthetics/${c.id}`)}
                >
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {c.patient?.patientNumber ?? "—"}
                  </TableCell>
                  <TableCell className="font-medium">
                    {c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : "—"}
                  </TableCell>
                  <TableCell><CaseStatusBadge status={c.status} /></TableCell>
                  <TableCell>
                    {c.amputationType
                      ? <Badge variant="secondary" className="text-xs">
                          {(Array.isArray(c.amputationType) ? c.amputationType : [c.amputationType])
                            .map((t: string) => tCommon(`amputationType.${t}`))
                            .join(" + ")}
                        </Badge>
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.amputationSide ? tCommon(`amputationSide.${c.amputationSide}`) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm font-mono">
                    {c.amputationLevel ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {fmt(c.createdAt)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => router.push(`/${locale}/clinic/prosthetics/${c.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination page={safePage} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={setPage} />
      )}
    </div>
  );
}
