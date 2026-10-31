"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Footprints, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { PageGuard } from "@/components/permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { usePodiatryReceptions } from "@/lib/hooks/use-clinic-podiatry";
import { PodiatryReception, PodiatrySession } from "@/lib/api/clinic-podiatry";

const PAGE_SIZE = 20;

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

const installTime = (s: PodiatrySession) => new Date(s.installedAt!).getTime();

/** One row per patient: every live fitting across their receptions, latest details shown. */
const groupSales = (receptions: PodiatryReception[]) => {
  const byPatient = new Map<string, { reception: PodiatryReception; session: PodiatrySession; count: number }>();
  for (const r of receptions) {
    for (const s of r.sessions ?? []) {
      if (!s.installedAt || s.archivedAt) continue;
      const row = byPatient.get(r.patientId);
      if (!row) byPatient.set(r.patientId, { reception: r, session: s, count: 1 });
      else {
        row.count += 1;
        if (installTime(s) > installTime(row.session)) {
          row.session = s;
          row.reception = r;
        }
      }
    }
  }
  return [...byPatient.values()]
    .map((row) => ({
      ...row,
      name: `${row.reception.patient?.firstName ?? ""} ${row.reception.patient?.lastName ?? ""}`.trim(),
    }))
    // Latest fitting first, so a new sale shows at the top.
    .sort((a, b) => installTime(b.session) - installTime(a.session));
};

/** VitaFoot sales: every podiatry patient whose insole has been fitted. */
export default function VitaFootSalesPage() {
  const router = useRouter();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data = [], isLoading, isError } = usePodiatryReceptions();

  const sales = useMemo(() => groupSales(data), [data]);

  const q = search.trim().toLowerCase();
  const rows = sales.filter((s) =>
    !q || s.name.toLowerCase().includes(q) || s.reception.patient?.patientNumber?.toLowerCase().includes(q));
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <PageGuard permission={PERMISSIONS.CLINIC_REFERRALS.VIEW}>
      <div className="space-y-6">
        <PageHeader
          title="مبيعات فيتافوت"
          description="المرضى الذين تم تركيب الضبان لهم"
          count={isLoading ? undefined : rows.length}
        />

        <div className="relative max-w-md">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="ابحث بالاسم أو رقم المريض..."
            className="ps-9"
          />
        </div>

        <div className="rounded-md border">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : isError ? (
            <p className="py-10 text-center text-sm text-destructive">تعذّر تحميل المبيعات</p>
          ) : shown.length === 0 ? (
            <EmptyState
              icon={<Footprints className="h-8 w-8 text-muted-foreground" />}
              title={q ? "لا توجد نتائج مطابقة" : "لا توجد مبيعات بعد"}
            />
          ) : (
            <Table dir="rtl">
              <TableHeader>
                <TableRow>
                  <TableHead>رقم المريض</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>نوع الضبان</TableHead>
                  <TableHead>المقاس</TableHead>
                  <TableHead>عدد التركيبات</TableHead>
                  <TableHead>آخر تركيب</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map(({ reception: r, session: s, count, name }) => (
                  <TableRow
                    key={r.patientId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/${locale}/clinic/podiatry/${r.id}`)}
                  >
                    <TableCell className="font-mono text-xs">{r.patient?.patientNumber ?? "—"}</TableCell>
                    <TableCell className="font-medium">{name || "—"}</TableCell>
                    <TableCell className="text-sm">{s.insoleType?.join("، ") || "—"}</TableCell>
                    <TableCell className="tabular-nums">{s.shoeSize ?? "—"}</TableCell>
                    <TableCell className="font-medium tabular-nums">{count}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmt(s.installedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} total={rows.length} limit={PAGE_SIZE} onPageChange={setPage} />
        )}
      </div>
    </PageGuard>
  );
}
