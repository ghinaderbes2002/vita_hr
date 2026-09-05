"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search, Eye, Footprints, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ClinicCountChips } from "@/components/clinic/clinic-count-chips";
import { usePodiatryReceptions, usePodiatryMyPatients } from "@/lib/hooks/use-clinic-podiatry";
import { useMyEmployee } from "@/lib/hooks/use-employees";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PodiatryReception } from "@/lib/api/clinic-podiatry";
import { usePodiatryEnumLabels } from "@/components/clinic/podiatry-labels";

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

/**
 * المسميات التي تشرف على مرضى القسم كاملاً. غيرها يرى فقط الحالات المعيَّن
 * عليها كمعالج. Kept in step with the same list on the prosthetics page.
 */
const FULL_CASELOAD_JOB_CODES = [
  "VTX-JTL-000035", // رئيس قسم الأطراف الصناعية وطب الأقدام
  "VTX-JTL-000011", // مشرف المركز
  "VTX-JTL-000007", // المدير الطبي
];

export default function PodiatryListPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("clinic.podiatry");
  const tMine = useTranslations("clinic.podiatry.myPatients");
  const tCommon = useTranslations("clinic.common");
  const enumLabel = usePodiatryEnumLabels();
  const [search, setSearch] = useState("");

  // المشرفون يرون كل مرضى القسم؛ من عداهم يرى حالاته المعيَّن عليها فقط.
  const { isAdmin } = usePermissions();
  const { data: myEmployee, isLoading: meLoading } = useMyEmployee();
  const seesAll = isAdmin() || FULL_CASELOAD_JOB_CODES.includes(myEmployee?.jobTitle?.code ?? "");
  const mineOnly = !seesAll;

  // Exactly one of the two runs: the mode is unknown until the profile
  // lands, so neither fires before then and a therapist never pulls the
  // whole clinic list.
  const { data: allReceptions = [], isLoading: allLoading } =
    usePodiatryReceptions(undefined, !meLoading && seesAll);
  const { data: myReceptions = [], isLoading: mineLoading } =
    usePodiatryMyPatients(!meLoading && mineOnly);

  const receptions = mineOnly ? myReceptions : allReceptions;
  const isLoading = meLoading || (mineOnly ? mineLoading : allLoading);

  const filtered = (receptions as PodiatryReception[]).filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const name = `${r.patient?.firstName ?? ""} ${r.patient?.lastName ?? ""}`.toLowerCase();
    return name.includes(q) || (r.patient?.patientNumber ?? "").toLowerCase().includes(q);
  });

  // This list isn't paginated, so the distinct patients are countable right here
  // — no second request, and exact rather than an estimate off one page.
  const patientCount = new Set(
    (receptions as PodiatryReception[]).map((r) => r.patientId),
  ).size;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={mineOnly ? tMine("description") : t("description")}
        actions={
          <ClinicCountChips
            isLoading={isLoading}
            counts={[
              { icon: Users, label: tCommon("patients"), value: patientCount },
              { icon: Footprints, label: tCommon("receptions"), value: (receptions as PodiatryReception[]).length },
            ]}
          />
        }
      />

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pr-9"
        />
      </div>

      <div className="rounded-md border">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Footprints className="h-8 w-8 text-muted-foreground" />}
            title={mineOnly ? tMine("empty.title") : t("empty.title")}
            description={mineOnly ? tMine("empty.description") : t("empty.description")}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.patientNumber")}</TableHead>
                <TableHead>{t("table.patient")}</TableHead>
                <TableHead>{t("table.visitType")}</TableHead>
                <TableHead>{t("table.sessions")}</TableHead>
                <TableHead>{t("table.receptionDate")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => router.push(`/${locale}/clinic/podiatry/${r.id}`)}>
                  <TableCell className="font-mono text-xs">{r.patient?.patientNumber ?? "—"}</TableCell>
                  <TableCell>{`${r.patient?.firstName ?? ""} ${r.patient?.lastName ?? ""}`.trim() || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(r.visitTypes ?? []).map((v) => (
                        <Badge key={v} variant="outline" className="text-[10px]">{enumLabel.visitType(v)}</Badge>
                      ))}
                      {(r.visitTypes ?? []).length === 0 && <span className="text-muted-foreground text-xs">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>{r.sessions?.length ?? 0}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmt(r.createdAt)}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

    </div>
  );
}
