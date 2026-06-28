"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Search, Eye, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/shared/pagination";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useClinicPatients, useDeleteClinicPatient } from "@/lib/hooks/use-clinic-patients";
import { Patient } from "@/lib/api/clinic-patients";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LIMIT = 15;

export default function ClinicPatientsPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("clinic.patients");
  const tCommon = useTranslations("clinic.common");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [genderFilter, setGenderFilter] = useState<"all" | "MALE" | "FEMALE">("all");
  const [caseTypeFilter, setCaseTypeFilter] = useState<"all" | "prosthetics" | "physio" | "both">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useClinicPatients({
    page,
    limit: LIMIT,
    search: search || undefined,
    gender: genderFilter !== "all" ? (genderFilter as any) : undefined,
    caseType: caseTypeFilter !== "all" ? (caseTypeFilter as any) : undefined,
  });

  const deletePatient = useDeleteClinicPatient();

  const patients = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;
  const total = data?.total ?? 0;

  const handleDelete = async () => {
    if (!deleteId) return;
    await deletePatient.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const age = (dob: string) => Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  const fmt = (d: string) => { const x = new Date(d); return `${x.getDate()}/${x.getMonth() + 1}/${x.getFullYear()}`; };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button onClick={() => router.push(`/${locale}/clinic/patients/new`)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("newPatient")}
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-50">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t("searchPlaceholder")}
            className="pr-9"
          />
        </div>
        <Select value={genderFilter} onValueChange={(v) => { setGenderFilter(v as any); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder={t("filter.gender")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter.all")}</SelectItem>
            <SelectItem value="MALE">{tCommon("gender.MALE")}</SelectItem>
            <SelectItem value="FEMALE">{tCommon("gender.FEMALE")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={caseTypeFilter} onValueChange={(v) => { setCaseTypeFilter(v as any); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("filter.caseType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter.all")}</SelectItem>
            <SelectItem value="prosthetics">{t("filter.prosthetics")}</SelectItem>
            <SelectItem value="physio">{t("filter.physio")}</SelectItem>
            <SelectItem value="both">{t("filter.both")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("patientNumber")}</TableHead>
              <TableHead>{t("table.name")}</TableHead>
              <TableHead>{t("table.gender")}</TableHead>
              <TableHead>{t("table.age")}</TableHead>
              <TableHead>{t("table.phone")}</TableHead>
              <TableHead>{t("table.city")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState icon={<Users className="h-8 w-8 text-muted-foreground" />} title={t("empty.title")} description={t("empty.description")} />
                </TableCell>
              </TableRow>
            ) : (
              patients.map((p: Patient) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/${locale}/clinic/patients/${p.id}`)}
                >
                  <TableCell className="font-mono text-sm">{p.patientNumber}</TableCell>
                  <TableCell className="font-medium">{p.firstName} {p.lastName}</TableCell>
                  <TableCell>
                    <Badge variant={p.gender === "MALE" ? "default" : "secondary"}>
                      {tCommon(`gender.${p.gender}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>{age(p.dateOfBirth)} {t("ageSuffix")}</TableCell>
                  <TableCell dir="ltr" className="text-left">{p.phone}</TableCell>
                  <TableCell>{p.city?.governorate ?? p.city?.name ?? "—"}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/${locale}/clinic/patients/${p.id}`)}>
                          <Eye className="h-4 w-4 ml-2" />
                          {t("viewFile")}
                        </DropdownMenuItem>
                        <ActionGuard permission={PERMISSIONS.CLINIC_PATIENTS.DELETE}>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(p.id)}
                          >
                            <Trash2 className="h-4 w-4 ml-2" />
                            {t("delete.confirm")}
                          </DropdownMenuItem>
                        </ActionGuard>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={setPage} />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title={t("delete.title")}
        description={t("delete.description")}
        confirmText={t("delete.confirm")}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
