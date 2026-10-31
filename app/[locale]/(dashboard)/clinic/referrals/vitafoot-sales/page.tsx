"use client";

import { useState } from "react";
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
import { usePodiatrySales } from "@/lib/hooks/use-clinic-podiatry";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

const PAGE_SIZE = 20;

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

/** VitaFoot sales: every podiatry patient whose insole has been fitted, one row each. */
export default function VitaFootSalesPage() {
  const router = useRouter();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim());

  const { data, isLoading, isError } = usePodiatrySales({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });
  const rows = data?.items ?? [];

  return (
    <PageGuard permission={PERMISSIONS.CLINIC_REFERRALS.VIEW}>
      <div className="space-y-6">
        <PageHeader
          title="مبيعات فيتافوت"
          description="المرضى الذين تم تركيب الضبان لهم"
          count={data?.total}
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
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Footprints className="h-8 w-8 text-muted-foreground" />}
              title={debouncedSearch ? "لا توجد نتائج مطابقة" : "لا توجد مبيعات بعد"}
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
                {rows.map((s) => (
                  <TableRow
                    key={s.patientId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/${locale}/clinic/podiatry/${s.receptionId}`)}
                  >
                    <TableCell className="font-mono text-xs">{s.patientNumber ?? "—"}</TableCell>
                    <TableCell className="font-medium">{s.patientName || "—"}</TableCell>
                    <TableCell className="text-sm">{s.insoleType?.join("، ") || "—"}</TableCell>
                    <TableCell className="tabular-nums">{s.shoeSize ?? "—"}</TableCell>
                    <TableCell className="font-medium tabular-nums">{s.installCount}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmt(s.installedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {(data?.totalPages ?? 1) > 1 && (
          <Pagination
            page={data!.page}
            totalPages={data!.totalPages}
            total={data!.total}
            limit={data!.limit}
            onPageChange={setPage}
          />
        )}
      </div>
    </PageGuard>
  );
}
