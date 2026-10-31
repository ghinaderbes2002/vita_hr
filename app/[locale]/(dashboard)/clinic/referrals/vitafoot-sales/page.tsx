"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Footprints, Loader2, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { PageGuard } from "@/components/permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { usePodiatrySales, useUpdatePodiatrySaleCost } from "@/lib/hooks/use-clinic-podiatry";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { usePermissions } from "@/lib/hooks/use-permissions";
import type { PodiatrySale } from "@/lib/api/clinic-podiatry";

const PAGE_SIZE = 20;

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");
// null is "not entered or not visible", never zero.
const fmtCost = (v?: number | null) => (v == null ? "—" : Number(v).toLocaleString("en-US"));
const COST_PATTERN = /^\d+(\.\d{1,2})?$/;

/** VitaFoot sales: every podiatry patient whose insole has been fitted, one row each. */
export default function VitaFootSalesPage() {
  const router = useRouter();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim());

  const { hasPermission, isAdmin } = usePermissions();
  const canEditCost = isAdmin() || hasPermission(PERMISSIONS.CLINIC_PODIATRY.SALES_UPDATE_COST);
  const canSeeCost = canEditCost || hasPermission(PERMISSIONS.CLINIC_PODIATRY.SALES_VIEW_COST);

  const updateCost = useUpdatePodiatrySaleCost();
  const [costTarget, setCostTarget] = useState<PodiatrySale | null>(null);
  const [costValue, setCostValue] = useState("");
  const trimmedCost = costValue.trim();
  const costValid = trimmedCost === "" || COST_PATTERN.test(trimmedCost);

  const openCost = (s: PodiatrySale) => {
    setCostTarget(s);
    setCostValue(s.insoleCost == null ? "" : String(s.insoleCost));
  };
  const saveCost = () => {
    if (!costTarget || !costValid) return;
    updateCost.mutate(
      { sessionId: costTarget.sessionId, insoleCost: trimmedCost === "" ? null : Number(trimmedCost) },
      { onSuccess: () => setCostTarget(null) },
    );
  };

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
                  {canSeeCost && <TableHead>تكلفة آخر تركيب</TableHead>}
                  {canSeeCost && <TableHead>إجمالي التكلفة</TableHead>}
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
                    {canSeeCost && (
                      <TableCell className="tabular-nums">
                        <div className="flex items-center gap-1">
                          <span>{fmtCost(s.insoleCost)}</span>
                          {canEditCost && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label="تعديل التكلفة"
                              // The row itself opens the patient.
                              onClick={(e) => { e.stopPropagation(); openCost(s); }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {canSeeCost && <TableCell className="font-medium tabular-nums">{fmtCost(s.totalCost)}</TableCell>}
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

        <Dialog open={!!costTarget} onOpenChange={(o) => !o && setCostTarget(null)}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle>تكلفة آخر تركيب</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{costTarget?.patientName || "—"}</p>
              <Label htmlFor="insole-cost">التكلفة</Label>
              <Input
                id="insole-cost"
                type="number"
                min={0}
                step="0.01"
                dir="ltr"
                value={costValue}
                onChange={(e) => setCostValue(e.target.value)}
              />
              <p className={`text-xs ${costValid ? "text-muted-foreground" : "text-destructive"}`}>
                {costValid ? "اترك الحقل فارغاً لمسح التكلفة" : "أدخل رقماً موجباً بمنزلتين عشريتين كحد أقصى"}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCostTarget(null)}>إلغاء</Button>
              <Button onClick={saveCost} disabled={!costValid || updateCost.isPending}>
                {updateCost.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                حفظ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageGuard>
  );
}
