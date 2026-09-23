"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Search, Eye, Trash2, Users, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useClinicPatients, useDeleteClinicPatient, useExportPatients } from "@/lib/hooks/use-clinic-patients";
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
  const [caseTypeFilter, setCaseTypeFilter] =
    useState<"all" | "prosthetics" | "physio" | "podiatry" | "doctor_exam">("all");
  const [consentFilter, setConsentFilter] =
    useState<"all" | "FUNDER_ONLY" | "FUNDER_AND_SOCIAL" | "REFUSED" | "NONE">("all");
  const [companyFilter, setCompanyFilter] = useState<"all" | "yes" | "no">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Restrict the list to the user's own department: a physio-only clinician sees
  // physio patients, a prosthetics/podiatry one sees that department. Admins and
  // anyone holding both see everything (no restriction).
  //
  // Whoever may register patients is excluded from that narrowing: reception and
  // sales enter patients for every department, so a list missing half of them is
  // the wrong tool for their job.
  const { hasPermission, isAdmin } = usePermissions();
  const registersPatients = hasPermission(PERMISSIONS.CLINIC_PATIENTS.CREATE);
  const canPhysio = hasPermission(PERMISSIONS.CLINIC_PHYSIO.CASE_VIEW);
  const canProsthetics =
    hasPermission(PERMISSIONS.CLINIC_PROSTHETICS.CASE_VIEW) ||
    hasPermission(PERMISSIONS.CLINIC_PODIATRY.RECEPTION_VIEW);
  const department: "physio" | "prosthetics" | undefined =
    isAdmin() || registersPatients || canPhysio === canProsthetics
      ? undefined
      : canPhysio ? "physio" : "prosthetics";

  const { data, isLoading } = useClinicPatients({
    page,
    limit: LIMIT,
    search: search || undefined,
    gender: genderFilter !== "all" ? (genderFilter as any) : undefined,
    caseType: caseTypeFilter !== "all" ? (caseTypeFilter as any) : undefined,
    consentDecision: consentFilter !== "all" ? consentFilter : undefined,
    isCompanyPatient: companyFilter === "all" ? undefined : companyFilter === "yes",
    department,
  });

  const deletePatient = useDeleteClinicPatient();

  // Excel export: every patient, or only those created within a date range.
  // Either end of the range may be left open, but not both.
  const exportPatients = useExportPatients();
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<"all" | "range">("all");
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const rangeEmpty = exportScope === "range" && !exportFrom && !exportTo;
  const rangeReversed = exportScope === "range" && !!exportFrom && !!exportTo && exportFrom > exportTo;

  const handleExport = () => {
    const params = exportScope === "range"
      ? { from: exportFrom || undefined, to: exportTo || undefined }
      : undefined;
    exportPatients.mutate(params, { onSuccess: () => setExportOpen(false) });
  };

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
          <div className="flex flex-wrap gap-2">
            {/* Shown to everyone who can open this list — the export asks no more than that. */}
            <Button variant="outline" onClick={() => setExportOpen(true)} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              {t("export.button")}
            </Button>
            <ActionGuard permission={PERMISSIONS.CLINIC_PATIENTS.CREATE}>
              <Button onClick={() => router.push(`/${locale}/clinic/patients/new`)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t("newPatient")}
              </Button>
            </ActionGuard>
          </div>
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
            <SelectItem value="podiatry">{t("filter.podiatry")}</SelectItem>
            <SelectItem value="doctor_exam">{t("filter.doctorExam")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={companyFilter} onValueChange={(v) => { setCompanyFilter(v as "all" | "yes" | "no"); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="مريض شركة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter.all")}</SelectItem>
            <SelectItem value="yes">مرضى الشركة</SelectItem>
            <SelectItem value="no">غير مرضى الشركة</SelectItem>
          </SelectContent>
        </Select>
        <Select value={consentFilter} onValueChange={(v) => { setConsentFilter(v as any); setPage(1); }}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="الموافقة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter.all")}</SelectItem>
            <SelectItem value="FUNDER_ONLY">الجهة الداعمة فقط</SelectItem>
            <SelectItem value="FUNDER_AND_SOCIAL">الداعمة ووسائل التواصل</SelectItem>
            <SelectItem value="REFUSED">رفضوا التوثيق</SelectItem>
            <SelectItem value="NONE">لم يوقّعوا</SelectItem>
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
                  <TableCell className="font-medium">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {p.firstName} {p.lastName}
                      {p.isCompanyPatient && (
                        <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700 text-[10px]">
                          شركة
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.gender === "MALE" ? "default" : "secondary"}>
                      {tCommon(`gender.${p.gender}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>{age(p.dateOfBirth)} {t("ageSuffix")}</TableCell>
                  <TableCell dir="ltr" className="text-left">{p.phone}</TableCell>
                  <TableCell>{p.city?.governorate || p.city?.name || "—"}</TableCell>
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

      {total > 0 && (
        <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={setPage} />
      )}

      <Dialog open={exportOpen} onOpenChange={(o) => { if (!exportPatients.isPending) setExportOpen(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("export.title")}</DialogTitle>
          </DialogHeader>
          <RadioGroup value={exportScope} onValueChange={(v) => setExportScope(v as "all" | "range")} className="gap-3">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="all" id="patients-export-all" />
              <Label htmlFor="patients-export-all">{t("export.all")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="range" id="patients-export-range" />
              <Label htmlFor="patients-export-range">{t("export.range")}</Label>
            </div>
          </RadioGroup>
          {exportScope === "range" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("export.from")}</Label>
                <Input type="date" value={exportFrom} max={exportTo || undefined} onChange={(e) => setExportFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("export.to")}</Label>
                <Input type="date" value={exportTo} min={exportFrom || undefined} onChange={(e) => setExportTo(e.target.value)} />
              </div>
              {rangeReversed && (
                <p className="col-span-2 text-xs text-destructive">{t("export.invalidRange")}</p>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setExportOpen(false)} disabled={exportPatients.isPending}>
              {t("export.cancel")}
            </Button>
            <Button onClick={handleExport} disabled={rangeEmpty || rangeReversed || exportPatients.isPending} className="gap-2">
              {exportPatients.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              {t("export.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
