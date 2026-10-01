"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionGuard, PageGuard } from "@/components/permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { ReferralSourceFormDialog } from "@/components/clinic/referral-source-form-dialog";
import { useDeleteReferralSource, useReferralSources } from "@/lib/hooks/use-clinic-referrals";
import { ReferralSource, visitsCountOf } from "@/lib/api/clinic-referrals";

const PAGE_SIZE = 20;

/**
 * The referral-sources screen narrowed to one kind: a project is the source type
 * stored as ASSOCIATION, so the type is neither filtered nor asked for.
 */
export default function ClinicProjectsPage() {
  const router = useRouter();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ReferralSource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReferralSource | null>(null);

  // Typing shouldn't fire a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(id);
  }, [search]);

  const changeSearch = (v: string) => { setSearch(v); setPage(1); };

  const { data, isLoading } = useReferralSources({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    type: "ASSOCIATION",
  });
  const deleteSource = useDeleteReferralSource();

  const projects = data?.items ?? [];

  const openEdit = (s: ReferralSource) => { setEditing(s); setFormOpen(true); };
  const openCreate = () => { setEditing(null); setFormOpen(true); };

  return (
    <PageGuard permission={PERMISSIONS.CLINIC_REFERRALS.VIEW}>
      <div className="space-y-6">
        <PageHeader
          title="المشاريع"
          description="المشاريع التي تُحيل المرضى إلى المركز"
          actions={
            <ActionGuard permission={PERMISSIONS.CLINIC_REFERRALS.MANAGE}>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة مشروع
              </Button>
            </ActionGuard>
          }
        />

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-48 flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => changeSearch(e.target.value)}
              placeholder="ابحث بالاسم..." className="pr-9" />
          </div>
        </div>

        <div className="rounded-md border">
          <Table dir="rtl">
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
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
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      icon={<Users className="h-8 w-8 text-muted-foreground" />}
                      title="لا توجد مشاريع"
                      description={debouncedSearch
                        ? "لا توجد نتائج مطابقة للبحث"
                        : "أضف أول مشروع للمركز"}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer hover:bg-muted/50"
                    // The detail screen is shared with the contacts list.
                    onClick={() => router.push(`/${locale}/clinic/referrals/${s.id}`)}
                  >
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.city || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.specialty || "—"}</TableCell>
                    <TableCell className="font-medium">{visitsCountOf(s)}</TableCell>
                    <TableCell className="font-medium">{s.patientCount ?? "—"}</TableCell>
                    <TableCell>
                      {/* The row itself opens the project, so editing and deleting
                          must not bubble up to it. */}
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
          lockedType="ASSOCIATION"
        />

        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          title={`حذف "${deleteTarget?.name ?? ""}"؟`}
          description="سيتم إخفاء المشروع من القائمة مع الاحتفاظ بزياراته المسجلة."
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
