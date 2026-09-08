"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search, Eye, Stethoscope, Lock } from "lucide-react";
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
import { useDoctorExamCases } from "@/lib/hooks/use-clinic-physio";
import { useMyEmployee } from "@/lib/hooks/use-employees";
import { usePermissions } from "@/lib/hooks/use-permissions";
import {
  DoctorExamListItem,
  DoctorExamStatus,
  DOCTOR_EXAM_STATUS_VALUES,
} from "@/lib/api/clinic-physio";

const LIMIT = 20;

/**
 * المدير الطبي وحده يتابع المعاينات التي لم تُحوّل بعد. القائمة مخفية عن باقي
 * المسميات في الشريط الجانبي (showForJobTitleCodes)، والصفحة تكرّر الشرط حتى لا
 * يفتحها أحد بالرابط المباشر.
 */
const ALLOWED_JOB_CODES = ["VTX-JTL-000007"]; // المدير الطبي

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

export default function DoctorExamsListPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("clinic.doctorExams");
  const tCommon = useTranslations("clinic.common");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DoctorExamStatus | "all">("all");

  const { isAdmin } = usePermissions();
  const { data: myEmployee, isLoading: meLoading } = useMyEmployee();
  const myJobTitleCode: string = (myEmployee as any)?.jobTitle?.code ?? "";
  const allowed = isAdmin() || ALLOWED_JOB_CODES.includes(myJobTitleCode);

  // The endpoint takes no search term, so a search pulls one large page and
  // filters here — same trick as the physio list. 100 is the server's ceiling.
  const trimmedSearch = search.trim();
  const clientPaged = !!trimmedSearch;
  const { data, isLoading } = useDoctorExamCases(
    {
      page: clientPaged ? 1 : page,
      limit: clientPaged ? 100 : LIMIT,
      status: statusFilter !== "all" ? statusFilter : undefined,
    },
    !meLoading && allowed,
  );

  const filtered = (data?.items ?? []).filter((c: DoctorExamListItem) => {
    if (!trimmedSearch) return true;
    const q = trimmedSearch.toLowerCase();
    const name = c.patient ? `${c.patient.firstName} ${c.patient.lastName}`.toLowerCase() : "";
    const num = c.patient?.patientNumber?.toLowerCase() ?? "";
    const id = c.patient?.idNumber?.toLowerCase() ?? "";
    const caseNum = c.caseNumber?.toLowerCase() ?? "";
    return name.includes(q) || num.includes(q) || id.includes(q) || caseNum.includes(q);
  });

  const total = clientPaged ? filtered.length : (data?.total ?? 0);
  const totalPages = clientPaged ? Math.ceil(filtered.length / LIMIT) : (data?.totalPages ?? 0);
  const safePage = clientPaged ? Math.min(page, Math.max(1, totalPages)) : page;
  const rows = clientPaged
    ? filtered.slice((safePage - 1) * LIMIT, safePage * LIMIT)
    : filtered;

  if (!meLoading && !allowed) {
    return (
      <div className="rounded-md border">
        <EmptyState
          icon={<Lock className="h-8 w-8 text-muted-foreground" />}
          title={t("empty.title")}
          description={t("description")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <ClinicCountChips
            isLoading={meLoading || isLoading}
            counts={[{ icon: Stethoscope, label: tCommon("cases"), value: total }]}
          />
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
            {DOCTOR_EXAM_STATUS_VALUES.map((v) => (
              <SelectItem key={v} value={v}>{t(`statuses.${v}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.caseNumber")}</TableHead>
              <TableHead>{t("table.patientNumber")}</TableHead>
              <TableHead>{t("table.patient")}</TableHead>
              <TableHead>{t("table.idNumber")}</TableHead>
              <TableHead>{t("table.complaint")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead>{t("table.createdAt")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {meLoading || isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState
                    icon={<Stethoscope className="h-8 w-8 text-muted-foreground" />}
                    title={t("empty.title")}
                    description={t("empty.description")}
                  />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((c: DoctorExamListItem) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => router.push(`/${locale}/clinic/physio/${c.id}`)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {c.caseNumber ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {c.patient?.patientNumber ?? "—"}
                  </TableCell>
                  <TableCell className="font-medium">
                    {c.patient ? `${c.patient.firstName} ${c.patient.lastName}`.trim() : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {c.patient?.idNumber ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-56 truncate" title={c.majorComplaint ?? undefined}>
                    {c.majorComplaint || "—"}
                  </TableCell>
                  <TableCell><CaseStatusBadge status={c.status} /></TableCell>
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

      {totalPages > 1 && (
        <Pagination page={safePage} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={setPage} />
      )}
    </div>
  );
}
