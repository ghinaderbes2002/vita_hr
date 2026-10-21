"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import {
  ArrowRight, Building2, ChevronLeft, FolderKanban, LayoutGrid, List, MapPin, Pencil, Phone, Plus,
  Search, Star, Stethoscope, Trash2, Users, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionGuard, PageGuard } from "@/components/permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { ReferralSourceFormDialog } from "@/components/clinic/referral-source-form-dialog";
import { useDeleteReferralSource, useReferralSources } from "@/lib/hooks/use-clinic-referrals";
import {
  REFERRAL_SOURCE_TYPES, REFERRAL_SOURCE_TYPE_LABEL, ReferralSource, ReferralSourceType, visitsCountOf,
} from "@/lib/api/clinic-referrals";

// Associations are projects, and have their own screen — this directory holds
// doctors, hospitals and the rest.
const CONTACT_TYPES = REFERRAL_SOURCE_TYPES.filter((t) => t !== "ASSOCIATION");
/** A whole category is loaded at once — directories here run to tens, not thousands. */
const CATEGORY_LIMIT = 100;

const TYPE_META: Record<ReferralSourceType, {
  title: string; hint: string; icon: LucideIcon; tone: string; soft: string; ring: string;
}> = {
  DOCTOR:      { title: "الأطباء", hint: "الأطباء المُحيلون للمرضى", icon: Stethoscope, tone: "bg-blue-500", soft: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300", ring: "hover:border-blue-400" },
  HOSPITAL:    { title: "المشافي", hint: "المشافي والمراكز الطبية", icon: Building2, tone: "bg-purple-500", soft: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300", ring: "hover:border-purple-400" },
  ASSOCIATION: { title: "المشاريع", hint: "الجمعيات والمشاريع الداعمة", icon: FolderKanban, tone: "bg-emerald-500", soft: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", ring: "hover:border-emerald-400" },
  OTHER:       { title: "جهات أخرى", hint: "باقي جهات الاتصال", icon: Users, tone: "bg-slate-500", soft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", ring: "hover:border-slate-400" },
};

type SortKey = "patients" | "visits" | "name";

const patientsOf = (s: ReferralSource) => s.patientCount ?? 0;
/** Two letters for the avatar, skipping a "د." title. */
const initialsOf = (name: string) =>
  name.replace(/^د\.?\s*/, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("") || "؟";
const ratingOf = (s: ReferralSource) => s.doctorRating ?? s.clinicRating ?? null;

export default function ReferralSourcesPage() {
  const router = useRouter();
  const locale = useLocale();
  // The open category lives in the URL, so coming back from a source returns
  // to its list rather than to the cards.
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const typeFilter: ReferralSourceType | null =
    typeParam && (CONTACT_TYPES as readonly string[]).includes(typeParam) ? (typeParam as ReferralSourceType) : null;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [city, setCity] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("patients");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ReferralSource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReferralSource | null>(null);

  // Typing shouldn't fire a request per keystroke (the landing search is server-side).
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(id);
  }, [search]);

  const openCategory = (t: ReferralSourceType | null) => {
    setSearch(""); setDebouncedSearch(""); setCity(null);
    router.replace(t ? `/${locale}/clinic/referrals?type=${t}` : `/${locale}/clinic/referrals`, { scroll: false });
  };

  // Each category is loaded whole: the cards sum it, and the open one is
  // searched, filtered and sorted here without a round trip.
  const doctorsQ = useReferralSources({ type: "DOCTOR", page: 1, limit: CATEGORY_LIMIT });
  const hospitalsQ = useReferralSources({ type: "HOSPITAL", page: 1, limit: CATEGORY_LIMIT });
  const othersQ = useReferralSources({ type: "OTHER", page: 1, limit: CATEGORY_LIMIT });
  // Only the contact types are ever looked up here — projects are not in this directory.
  const byType = { DOCTOR: doctorsQ, HOSPITAL: hospitalsQ, OTHER: othersQ } as Record<ReferralSourceType, typeof doctorsQ>;

  // Searching from the landing view looks across every contact on the server.
  const landingSearchQ = useReferralSources(
    { page: 1, limit: CATEGORY_LIMIT, search: debouncedSearch || undefined },
    { enabled: !typeFilter && !!debouncedSearch },
  );
  const deleteSource = useDeleteReferralSource();

  const categoryItems: ReferralSource[] = typeFilter ? byType[typeFilter].data?.items ?? [] : [];
  const categoryLoading = typeFilter ? byType[typeFilter].isLoading : false;

  // Cities in the open category, busiest first.
  const cityCounts = new Map<string, number>();
  for (const s of categoryItems) if (s.city?.trim()) cityCounts.set(s.city.trim(), (cityCounts.get(s.city.trim()) ?? 0) + 1);
  const cities = [...cityCounts.entries()].sort((a, b) => b[1] - a[1]);

  const term = search.trim().toLowerCase();
  const shown: ReferralSource[] = typeFilter
    ? categoryItems
        .filter((s) => !city || s.city?.trim() === city)
        .filter((s) => !term || [s.name, s.specialty, s.city].some((v) => v?.toLowerCase().includes(term)))
        .sort((a, b) =>
          sort === "name" ? a.name.localeCompare(b.name, "ar")
            : sort === "visits" ? visitsCountOf(b) - visitsCountOf(a)
            : patientsOf(b) - patientsOf(a))
    : (landingSearchQ.data?.items ?? []).filter((s) => s.type !== "ASSOCIATION");
  const listLoading = typeFilter ? categoryLoading : landingSearchQ.isLoading;
  const showList = !!typeFilter || !!debouncedSearch;

  const openSource = (s: ReferralSource) => router.push(`/${locale}/clinic/referrals/${s.id}`);
  const openEdit = (s: ReferralSource) => { setEditing(s); setFormOpen(true); };
  const openCreate = () => { setEditing(null); setFormOpen(true); };

  const rowActions = (s: ReferralSource) => (
    // The card / row itself opens the source, so these must not bubble up to it.
    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
      <ActionGuard permission={PERMISSIONS.CLINIC_REFERRALS.MANAGE}>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="تعديل" onClick={() => openEdit(s)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="حذف"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => setDeleteTarget(s)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </ActionGuard>
    </div>
  );

  return (
    <PageGuard permission={PERMISSIONS.CLINIC_REFERRALS.VIEW}>
      <div className="space-y-6">
        <PageHeader
          title="جهات الاتصال"
          description="الأطباء والمشافي التي تُحيل المرضى إلى المركز"
          actions={
            <ActionGuard permission={PERMISSIONS.CLINIC_REFERRALS.MANAGE}>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة مصدر
              </Button>
            </ActionGuard>
          }
        />

        {/* ── Category cards: large tiles on the landing view, a compact strip once a list is open ── */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${showList ? "gap-3" : "gap-4"}`}>
          {CONTACT_TYPES.map((t) => {
            const meta = TYPE_META[t];
            const q = byType[t];
            const items = q.data?.items ?? [];
            const active = typeFilter === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => openCategory(active ? null : t)}
                className={`group relative overflow-hidden rounded-2xl border bg-card text-start shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg ${meta.ring} ${
                  showList ? "p-4" : "flex min-h-56 flex-col p-6"
                } ${active ? "border-primary ring-2 ring-primary/30" : ""}`}
              >
                <div className={`absolute inset-x-0 top-0 ${showList ? "h-1" : "h-1.5"} ${meta.tone}`} />
                {/* soft glow behind the icon on the large tiles */}
                {!showList && <div className={`pointer-events-none absolute -end-10 -top-10 h-36 w-36 rounded-full opacity-10 blur-2xl ${meta.tone}`} />}
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={showList ? "text-sm font-semibold" : "text-lg font-bold"}>{meta.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta.hint}</p>
                  </div>
                  <div className={`rounded-xl text-white shadow-md ${meta.tone} ${showList ? "p-2" : "p-3.5"}`}>
                    <meta.icon className={showList ? "h-5 w-5" : "h-7 w-7"} />
                  </div>
                </div>
                {q.isLoading ? (
                  <Skeleton className={showList ? "mt-4 h-9 w-16" : "mt-auto h-14 w-24"} />
                ) : (
                  <p className={`font-bold tabular-nums ${showList ? "mt-4 text-3xl" : "mt-auto pt-6 text-5xl"}`}>
                    {q.data?.total ?? "—"}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between border-t pt-2.5 text-xs text-muted-foreground">
                  <span className="flex gap-3">
                    <span><b className="tabular-nums text-foreground">{items.reduce((a, s) => a + visitsCountOf(s), 0)}</b> زيارة</span>
                    <span><b className="tabular-nums text-foreground">{items.reduce((a, s) => a + patientsOf(s), 0)}</b> مريض مُحال</span>
                  </span>
                  <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 ltr:rotate-180" />
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Toolbar ── */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {typeFilter && (
              <>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openCategory(null)}>
                  <ArrowRight className="h-4 w-4 ltr:rotate-180" />
                  كل الفئات
                </Button>
                <h2 className="text-base font-semibold">
                  {TYPE_META[typeFilter].title}
                  <span className="ms-2 text-sm font-normal text-muted-foreground">({shown.length})</span>
                </h2>
              </>
            )}
            <div className="relative min-w-48 flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={typeFilter ? `ابحث في ${TYPE_META[typeFilter].title} بالاسم أو التخصص أو المدينة...` : "ابحث في كل جهات الاتصال..."}
                className="pr-9" />
            </div>
            {typeFilter && (
              <>
                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patients">الأكثر إحالة للمرضى</SelectItem>
                    <SelectItem value="visits">الأكثر زيارة</SelectItem>
                    <SelectItem value="name">الاسم (أبجدياً)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex rounded-lg border p-0.5">
                  {([["grid", LayoutGrid, "بطاقات"], ["table", List, "جدول"]] as const).map(([v, Icon, label]) => (
                    <Button key={v} variant={view === v ? "secondary" : "ghost"} size="icon" className="h-8 w-8"
                      aria-label={label} title={label} onClick={() => setView(v)}>
                      <Icon className="h-4 w-4" />
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Cities in this category, busiest first — one click narrows the list. */}
          {typeFilter && cities.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setCity(null)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${!city ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                كل المدن
              </button>
              {cities.map(([c, n]) => (
                <button key={c} type="button" onClick={() => setCity(city === c ? null : c)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${city === c ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                  <MapPin className="h-3 w-3" />
                  {c}
                  <span className="tabular-nums opacity-70">{n}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── List ── */}
        {!showList ? (
          <div className="rounded-xl border border-dashed py-12 text-center">
            <p className="text-sm text-muted-foreground">اختر فئة من الأعلى لعرض جهاتها، أو ابحث بالاسم.</p>
          </div>
        ) : listLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8 text-muted-foreground" />}
            title="لا توجد جهات اتصال"
            description={term || city || debouncedSearch ? "لا توجد نتائج مطابقة للبحث" : "أضف أول جهة اتصال في هذه الفئة"}
          />
        ) : view === "grid" || !typeFilter ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((s) => {
              const meta = TYPE_META[s.type];
              const rating = ratingOf(s);
              return (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openSource(s)}
                  onKeyDown={(e) => { if (e.key === "Enter") openSource(s); }}
                  className="group flex cursor-pointer flex-col rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${meta.soft}`}>
                      {initialsOf(s.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{s.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.specialty || REFERRAL_SOURCE_TYPE_LABEL[s.type]}</p>
                    </div>
                    <div className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      {rowActions(s)}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {s.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.city}</span>}
                    {rating != null && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="tabular-nums">{rating}</span>
                      </span>
                    )}
                    {!typeFilter && (
                      <Badge variant="outline" className={`text-[10px] ${meta.soft}`}>{REFERRAL_SOURCE_TYPE_LABEL[s.type]}</Badge>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3 mt-3">
                    <div className="flex gap-4 text-xs">
                      <span><b className="text-base tabular-nums">{patientsOf(s)}</b> <span className="text-muted-foreground">مريض</span></span>
                      <span><b className="text-base tabular-nums">{visitsCountOf(s)}</b> <span className="text-muted-foreground">زيارة</span></span>
                    </div>
                    {(s.mobile || s.clinicPhone) && (
                      <a
                        href={`tel:${s.mobile || s.clinicPhone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10"
                        dir="ltr"
                      >
                        <Phone className="h-3 w-3" />
                        {s.mobile || s.clinicPhone}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table dir="rtl">
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>المدينة</TableHead>
                  <TableHead>التخصص</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>الزيارات</TableHead>
                  <TableHead>المرضى</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openSource(s)}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.city || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.specialty || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground" dir="ltr">{s.mobile || s.clinicPhone || "—"}</TableCell>
                    <TableCell className="font-medium tabular-nums">{visitsCountOf(s)}</TableCell>
                    <TableCell className="font-medium tabular-nums">{s.patientCount ?? "—"}</TableCell>
                    <TableCell>{rowActions(s)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {typeFilter && (byType[typeFilter].data?.total ?? 0) > CATEGORY_LIMIT && (
          <p className="text-center text-xs text-muted-foreground">
            تُعرض أول {CATEGORY_LIMIT} جهة من هذه الفئة — استخدم البحث للوصول إلى البقية.
          </p>
        )}

        <ReferralSourceFormDialog
          open={formOpen}
          onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }}
          source={editing}
          excludeTypes={["ASSOCIATION"]}
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
