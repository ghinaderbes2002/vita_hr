"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Search, Eye, Plus, Footprints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePodiatryReceptions } from "@/lib/hooks/use-clinic-podiatry";
import { PodiatryReception } from "@/lib/api/clinic-podiatry";
import { VISIT_TYPE_LABEL } from "@/components/clinic/podiatry-labels";
import { PodiatryReceptionDialog } from "@/components/clinic/podiatry-reception-dialog";

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

export default function PodiatryListPage() {
  const router = useRouter();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);

  const { data: receptions = [], isLoading } = usePodiatryReceptions();

  const filtered = (receptions as PodiatryReception[]).filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const name = `${r.patient?.firstName ?? ""} ${r.patient?.lastName ?? ""}`.toLowerCase();
    return name.includes(q) || (r.patient?.patientNumber ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <PageHeader title="طب الأقدام" description="استقبالات وجلسات طب الأقدام" />
        <Button className="gap-2" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4" />
          استقبال جديد
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم أو رقم المريض..."
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
            title="لا توجد استقبالات"
            description="ابدأ بإنشاء استقبال جديد لمريض"
          />
        ) : (
          <Table dir="rtl">
            <TableHeader>
              <TableRow>
                <TableHead>رقم المريض</TableHead>
                <TableHead>المريض</TableHead>
                <TableHead>سبب الزيارة</TableHead>
                <TableHead>الجلسات</TableHead>
                <TableHead>تاريخ الاستقبال</TableHead>
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
                        <Badge key={v} variant="outline" className="text-[10px]">{VISIT_TYPE_LABEL[v] ?? v}</Badge>
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

      <PodiatryReceptionDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={(id) => router.push(`/${locale}/clinic/podiatry/${id}`)}
      />
    </div>
  );
}
