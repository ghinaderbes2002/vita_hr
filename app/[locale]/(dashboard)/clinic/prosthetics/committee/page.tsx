"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Search, Eye, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { CaseStatusBadge } from "@/components/clinic/case-status-badge";
import { useProstheticsCases } from "@/lib/hooks/use-clinic-prosthetics";
import { ProstheticsCase } from "@/lib/api/clinic-prosthetics";

const fmt = (d: string) => new Date(d).toLocaleDateString("ar");

const COMMITTEE_STATUSES = ["COMMITTEE_REVIEW", "COMMITTEE_APPROVED"] as const;

export default function CommitteeCasesPage() {
  const router = useRouter();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Fetch both committee statuses in parallel
  const { data: reviewData, isLoading: reviewLoading } = useProstheticsCases({
    status: "COMMITTEE_REVIEW",
    limit: 100,
  });
  const { data: approvedData, isLoading: approvedLoading } = useProstheticsCases({
    status: "COMMITTEE_APPROVED",
    limit: 100,
  });

  const isLoading = reviewLoading || approvedLoading;

  const allCases: ProstheticsCase[] = [
    ...(reviewData?.items ?? []),
    ...(approvedData?.items ?? []),
  ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const filtered = allCases.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = c.patient ? `${c.patient.firstName} ${c.patient.lastName}`.toLowerCase() : "";
    return name.includes(q) || (c.patient?.patientNumber ?? "").toLowerCase().includes(q);
  });

  const reviewCount = reviewData?.items?.length ?? 0;
  const approvedCount = approvedData?.items?.length ?? 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="حالات اللجنة الطبية"
        description={isLoading ? "جاري التحميل..." : `${reviewCount} بانتظار المراجعة — ${approvedCount} موافق عليها`}
      />

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pr-9"
            placeholder="بحث باسم المريض أو رقمه..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{filtered.length} حالة</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Users className="h-12 w-12 opacity-20" />
          <p className="text-sm">لا توجد حالات في مرحلة اللجنة</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المريض</TableHead>
                  <TableHead>رقم المريض</TableHead>
                  <TableHead>نوع البتر</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>آخر تحديث</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`/${locale}/clinic/prosthetics/${c.id}`)}>
                    <TableCell className="font-medium">
                      {c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {c.patient?.patientNumber ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.amputationType === "UPPER" ? "طرف علوي" : c.amputationType === "LOWER" ? "طرف سفلي" : "—"}
                      {c.amputationSide && ` · ${c.amputationSide === "RIGHT" ? "يمين" : c.amputationSide === "LEFT" ? "يسار" : "ثنائي"}`}
                    </TableCell>
                    <TableCell>
                      <CaseStatusBadge status={c.status} size="sm" />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmt(c.updatedAt)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); router.push(`/${locale}/clinic/prosthetics/${c.id}`); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
