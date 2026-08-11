"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  Building2, Eye, HeartHandshake, Pencil, Plus, Search, Stethoscope, Trash2, Trophy, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionGuard, PageGuard } from "@/components/permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { ReferralSourceFormDialog } from "@/components/clinic/referral-source-form-dialog";
import { useDeleteReferralSource, useReferralSources, useReferralStats } from "@/lib/hooks/use-clinic-referrals";
import {
  REFERRAL_SOURCE_TYPES, REFERRAL_SOURCE_TYPE_LABEL, ReferralSource, ReferralSourceType, visitsCountOf,
} from "@/lib/api/clinic-referrals";

const PAGE_SIZE = 20;

const TYPE_ICON: Record<ReferralSourceType, typeof Stethoscope> = {
  DOCTOR: Stethoscope,
  HOSPITAL: Building2,
  ASSOCIATION: HeartHandshake,
};

const TYPE_BADGE: Record<ReferralSourceType, string> = {
  DOCTOR:      "border-blue-300 bg-blue-50 text-blue-700",
  HOSPITAL:    "border-purple-300 bg-purple-50 text-purple-700",
  ASSOCIATION: "border-green-300 bg-green-50 text-green-700",
};

export default function ReferralSourcesPage() {
  const router = useRouter();
  const locale = useLocale();
  const { hasPermission, isAdmin } = usePermissions();
  const canSeeStats = isAdmin() || hasPermission(PERMISSIONS.CLINIC_REFERRALS.STATS_VIEW);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ReferralSourceType | "all">("all");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ReferralSource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReferralSource | null>(null);

  // Typing shouldn't fire a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(id);
  }, [search]);

  // A filter change re-scopes the list, so the old page number no longer applies.
  const changeSearch = (v: string) => { setSearch(v); setPage(1); };
  const changeType = (v: ReferralSourceType | "all") => { setTypeFilter(v); setPage(1); };

  const { data, isLoading } = useReferralSources({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
  });
  const { data: stats } = useReferralStats({ enabled: canSeeStats });
  const deleteSource = useDeleteReferralSource();

  const sources = data?.items ?? [];
  const countOfType = (t: ReferralSourceType) =>
    stats?.byType.find((b) => b.type === t)?._count.id ?? 0;

  const openEdit = (s: ReferralSource) => { setEditing(s); setFormOpen(true); };
  const openCreate = () => { setEditing(null); setFormOpen(true); };

  return (
    <PageGuard permission={PERMISSIONS.CLINIC_REFERRALS.VIEW}>
      <div className="space-y-6">
        <PageHeader
          title="مصادر الإحالة"
          description="الأطباء والمشافي والجمعيات التي تُحيل المرضى إلى المركز"
          actions={
            <ActionGuard permission={PERMISSIONS.CLINIC_REFERRALS.MANAGE}>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة مصدر
              </Button>
            </ActionGuard>
          }
        />

        {canSeeStats && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {REFERRAL_SOURCE_TYPES.map((t) => {
                const Icon = TYPE_ICON[t];
                return (
                  <Card key={t}>
                    <CardContent className="flex items-center gap-3 pt-4 pb-3">
                      <div className="rounded-lg bg-muted p-2">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="mb-0.5 text-sm text-muted-foreground">{REFERRAL_SOURCE_TYPE_LABEL[t]}</p>
                        <p className="text-2xl font-bold">{countOfType(t)}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {(stats?.topSources.length ?? 0) > 0 && (
              <Card>
                <CardContent className="space-y-3 pt-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      <p className="font-semibold">أكثر 10 مصادر نشاطاً</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      «مرضى مسجّلون» كل من أُدرج باسم المصدر، و«مرضى فعليون» من دخل خدمة فعلاً —
                      والفرق بينهما هم من لم يحضروا بعد.
                    </p>
                  </div>
                  <div className="rounded-md border">
                    <Table dir="rtl">
                      <TableHeader>
                        <TableRow>
                          <TableHead>المصدر</TableHead>
                          <TableHead>النوع</TableHead>
                          <TableHead>المدينة</TableHead>
                          <TableHead>زيارات الفريق</TableHead>
                          <TableHead>مرضى مسجّلون</TableHead>
                          <TableHead>مرضى فعليون</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats!.topSources.slice(0, 10).map((s, i) => (
                          <TableRow
                            key={s.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => router.push(`/${locale}/clinic/referrals/${s.id}`)}
                          >
                            <TableCell className="font-medium">
                              <span className="flex items-center gap-2">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                                  {i + 1}
                                </span>
                                {s.name}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${TYPE_BADGE[s.type]}`}>
                                {REFERRAL_SOURCE_TYPE_LABEL[s.type]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{s.city || "—"}</TableCell>
                            <TableCell className="font-medium">{visitsCountOf(s)}</TableCell>
                            <TableCell className="font-medium">{s.patientCount ?? 0}</TableCell>
                            <TableCell className="font-medium text-green-600">{s.realPatientCount ?? 0}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-48 flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => changeSearch(e.target.value)}
              placeholder="ابحث بالاسم..." className="pr-9" />
          </div>
          <Select value={typeFilter} onValueChange={(v) => changeType(v as ReferralSourceType | "all")}>
            <SelectTrigger className="w-40"><SelectValue placeholder="النوع" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {REFERRAL_SOURCE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{REFERRAL_SOURCE_TYPE_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table dir="rtl">
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>المدينة</TableHead>
                <TableHead>التخصص</TableHead>
                <TableHead>الزيارات</TableHead>
                <TableHead>المرضى</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : sources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState
                      icon={<Users className="h-8 w-8 text-muted-foreground" />}
                      title="لا توجد مصادر إحالة"
                      description={debouncedSearch || typeFilter !== "all"
                        ? "لا توجد نتائج مطابقة للبحث"
                        : "أضف أول مصدر إحالة للمركز"}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                sources.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${TYPE_BADGE[s.type]}`}>
                        {REFERRAL_SOURCE_TYPE_LABEL[s.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.city || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.specialty || "—"}</TableCell>
                    <TableCell className="font-medium">{visitsCountOf(s)}</TableCell>
                    <TableCell className="font-medium">{s.patientCount ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => router.push(`/${locale}/clinic/referrals/${s.id}`)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <ActionGuard permission={PERMISSIONS.CLINIC_REFERRALS.MANAGE}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(s)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </ActionGuard>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {data && data.totalPages > 1 && (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              limit={data.limit}
              onPageChange={setPage}
            />
          )}
        </div>

        <ReferralSourceFormDialog
          open={formOpen}
          onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }}
          source={editing}
        />

        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          title={`حذف "${deleteTarget?.name ?? ""}"؟`}
          description="سيتم إخفاء المصدر من القائمة مع الاحتفاظ بزياراته المسجلة."
          variant="destructive"
          onConfirm={() => {
            if (deleteTarget) deleteSource.mutate(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      </div>
    </PageGuard>
  );
}
