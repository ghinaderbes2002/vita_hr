"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Accessibility, Check, Eye, Plus, Search, Users, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { ClinicCountChips } from "@/components/clinic/clinic-count-chips";
import { ActionGuard } from "@/components/permissions/action-guard";
import { OrthoticsReceptionDialog } from "@/components/clinic/orthotics-reception-dialog";
import { sectionsFilled } from "@/components/clinic/orthotics-labels";
import { useOrthoticsMyPatients, useOrthoticsReceptions } from "@/lib/hooks/use-clinic-orthotics";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import type { OrthoticsReception } from "@/lib/api/clinic-orthotics";

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

const PAGE_SIZE = 20;

const isAssigned = (r: OrthoticsReception) => (r.practitionerIds ?? []).length > 0;

const SECTION_BADGES = [
  { key: "doctor", label: "العظمية" },
  { key: "physio", label: "الفيزيائي" },
  { key: "prosthetist", label: "الأطراف" },
] as const;

export default function OrthoticsListPage() {
  const router = useRouter();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [assignFilter, setAssignFilter] = useState<"all" | "assigned" | "unassigned">("all");
  const [createOpen, setCreateOpen] = useState(false);

  // Whoever runs the reception desk — creating receptions or managing the team —
  // sees the whole caseload; a practitioner who only fills in their own section
  // sees the receptions they are assigned to.
  const { hasAnyPermission, isAdmin } = usePermissions();
  const seesAll = isAdmin() || hasAnyPermission([
    PERMISSIONS.CLINIC_ORTHOTICS.CREATE,
    PERMISSIONS.CLINIC_ORTHOTICS.EDIT,
    PERMISSIONS.CLINIC_ORTHOTICS.DELETE,
  ]);

  // Exactly one of the two runs, so a practitioner never pulls the whole list.
  const { data: allReceptions = [], isLoading: allLoading } = useOrthoticsReceptions(undefined, seesAll);
  const { data: myReceptions = [], isLoading: mineLoading } = useOrthoticsMyPatients(!seesAll);
  const receptions = seesAll ? allReceptions : myReceptions;
  const isLoading = seesAll ? allLoading : mineLoading;

  // The reception carries practitioner ids only; names come from the staff list.
  const { data: staffData } = useEmployeesBasicList();
  const staffName = (id: string) => {
    const e = (Array.isArray(staffData) ? staffData : []).find((x) => x.id === id);
    return e ? `${e.firstNameAr ?? ""} ${e.lastNameAr ?? ""}`.trim() : "";
  };

  const unassignedCount = receptions.filter((r) => !isAssigned(r)).length;
  const patientCount = new Set(receptions.map((r) => r.patientId)).size;

  const filtered = receptions.filter((r) => {
    if (assignFilter === "assigned" && !isAssigned(r)) return false;
    if (assignFilter === "unassigned" && isAssigned(r)) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name = `${r.patient?.firstName ?? ""} ${r.patient?.lastName ?? ""}`.toLowerCase();
    return name.includes(q)
      || (r.patient?.patientNumber ?? "").toLowerCase().includes(q)
      || (r.guardianName ?? "").toLowerCase().includes(q);
  });

  // The API returns the whole list, so it is paged here.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const open = (id: string) => router.push(`/${locale}/clinic/orthotics/${id}`);

  return (
    <div className="space-y-6">
      <PageHeader
        title="قسم المقومات"
        description={seesAll
          ? "استقبالات المقومات وتقييمات طبيب العظمية والعلاج الفيزيائي والأطراف الصناعية"
          : "الاستقبالات المعيَّن عليها كمعالج"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ClinicCountChips
              isLoading={isLoading}
              counts={[
                { icon: Users, label: "المرضى", value: patientCount },
                { icon: Accessibility, label: "الاستقبالات", value: receptions.length },
                ...(seesAll ? [{ icon: UserX, label: "بدون معالج", value: unassignedCount }] : []),
              ]}
            />
            <ActionGuard permission={PERMISSIONS.CLINIC_ORTHOTICS.CREATE}>
              <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                استقبال جديد
              </Button>
            </ActionGuard>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="ابحث باسم المريض أو رقمه أو ولي الأمر..."
            className="pr-9"
          />
        </div>
        {seesAll && (
          <Select
            value={assignFilter}
            onValueChange={(v) => { setAssignFilter(v as typeof assignFilter); setPage(1); }}
          >
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الاستقبالات</SelectItem>
              <SelectItem value="assigned">معيَّن لها معالج</SelectItem>
              <SelectItem value="unassigned">بدون معالج</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="rounded-md border">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Accessibility className="h-8 w-8 text-muted-foreground" />}
            title={search || assignFilter !== "all" ? "لا توجد نتائج مطابقة" : "لا توجد استقبالات"}
            description={seesAll ? "أنشئ استقبالاً جديداً لتظهر السجلات هنا" : "لم تُعيَّن على أي استقبال بعد"}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم المريض</TableHead>
                <TableHead>المريض</TableHead>
                <TableHead>ولي الأمر</TableHead>
                <TableHead>المعالجون</TableHead>
                <TableHead>التقييمات</TableHead>
                <TableHead>تاريخ الاستقبال</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => {
                const filled = sectionsFilled(r);
                return (
                  <TableRow
                    key={r.id}
                    className={`cursor-pointer ${isAssigned(r) ? "" : "border-s-4 border-s-amber-400 bg-amber-50/40 dark:bg-amber-500/5"}`}
                    onClick={() => open(r.id)}
                  >
                    <TableCell className="font-mono text-xs">{r.patient?.patientNumber ?? "—"}</TableCell>
                    <TableCell>{`${r.patient?.firstName ?? ""} ${r.patient?.lastName ?? ""}`.trim() || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {r.guardianName
                        ? <>{r.guardianName}{r.guardianRelation && <span className="text-muted-foreground"> ({r.guardianRelation})</span>}</>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {isAssigned(r) ? (
                        <div className="flex flex-wrap gap-1">
                          {(r.practitionerIds ?? []).map((pid) => (
                            <Badge key={pid} variant="secondary" className="text-xs font-normal">{staffName(pid) || "…"}</Badge>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-xs text-amber-700">
                          <UserX className="h-3 w-3" />
                          بدون معالج
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {SECTION_BADGES.map(({ key, label }) => (
                          <Badge
                            key={key}
                            variant="outline"
                            className={`gap-1 text-[10px] ${filled[key] ? "border-green-300 bg-green-50 text-green-700" : "text-muted-foreground"}`}
                          >
                            {filled[key] && <Check className="h-3 w-3" />}
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmt(r.createdAt)}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {!isLoading && totalPages > 1 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          total={filtered.length}
          limit={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}

      <OrthoticsReceptionDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={open} />
    </div>
  );
}
