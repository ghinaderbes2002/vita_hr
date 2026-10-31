"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import {
  ArrowRight, CalendarClock, FileDown, Loader2, MapPin, Pencil, Phone, Plus, ShoppingBag, Star, Trash2, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { WhatsAppLink } from "@/components/shared/whatsapp-link";
import { ActionGuard, PageGuard } from "@/components/permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { LocationMap } from "@/components/clinic/location-map";
import { ReferralSourceFormDialog } from "@/components/clinic/referral-source-form-dialog";
import { ReferralVisitDialog } from "@/components/clinic/referral-visit-dialog";
import {
  useDeleteReferralVisit, useReferralSource, useReferralSourcePatientCount, useReferralSourcePatients,
  useReferralVisits,
} from "@/lib/hooks/use-clinic-referrals";
import { Pagination } from "@/components/shared/pagination";
import {
  REFERRAL_SOURCE_TYPE_LABEL, REFERRAL_VISIT_TYPE_LABEL, ReferralSourcePatient, ReferralVisit,
  clinicReferralsApi, visitedByNameOf,
} from "@/lib/api/clinic-referrals";

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("ar-SA-u-nu-latn", { dateStyle: "medium" }) : "—";

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b py-2 last:border-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-end">{value}</span>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={n <= value ? "h-3.5 w-3.5 fill-amber-400 text-amber-400" : "h-3.5 w-3.5 text-muted-foreground/30"} />
      ))}
    </span>
  );
}

export default function ReferralSourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const { hasPermission, isAdmin } = usePermissions();
  const canSeeStats = isAdmin() || hasPermission(PERMISSIONS.CLINIC_REFERRALS.STATS_VIEW);

  const [editOpen, setEditOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<ReferralVisit | null>(null);
  const [deleteVisitTarget, setDeleteVisitTarget] = useState<ReferralVisit | null>(null);
  const [viewingVisit, setViewingVisit] = useState<ReferralVisit | null>(null);

  const { data: source, isLoading } = useReferralSource(id);
  const { data: visitsData } = useReferralVisits(id);
  // The stats endpoints are separately permissioned, so the count is only
  // requested for users who are allowed to see it.
  const { data: counts } = useReferralSourcePatientCount(canSeeStats ? id : "");
  const [patientsPage, setPatientsPage] = useState(1);
  // "Sales" narrows the list to the patients who actually entered a service.
  const [salesOnly, setSalesOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const patientFilters = { realOnly: salesOnly, dateFrom, dateTo };
  const { data: patientsData, isLoading: patientsLoading } =
    useReferralSourcePatients(canSeeStats ? id : "", patientsPage, 20, patientFilters);
  const showPatients = (onlySales: boolean) => {
    setSalesOnly(onlySales);
    setPatientsPage(1);
    document.getElementById("referred-patients")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const deleteVisit = useDeleteReferralVisit();

  // The sheet covers the whole list in the current view, not just the page on screen.
  const [exporting, setExporting] = useState(false);
  const exportPatients = async () => {
    if (exporting || !source) return;
    setExporting(true);
    try {
      const patients: ReferralSourcePatient[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const res = await clinicReferralsApi.listPatients(id, page, 100, patientFilters);
        patients.push(...res.items);
        totalPages = res.totalPages;
        page += 1;
      } while (page <= totalPages);
      const { downloadReferralPatientsPdf } = await import("@/components/clinic/referral-patients-pdf");
      await downloadReferralPatientsPdf({
        referrerLabel: source.type === "DOCTOR" && !/^(د\.|د\s|دكتور|الدكتور)/.test(source.name)
          ? `الدكتور ${source.name}`
          : source.name,
        listLabel: salesOnly ? "المبيعات" : "المرضى المُحالون",
        dateFrom,
        dateTo,
        patients,
      });
    } catch {
      toast.error("تعذّر تصدير المرضى");
    } finally {
      setExporting(false);
    }
  };

  // The detail response already embeds the visits; the dedicated list endpoint
  // is what stays fresh after an add/edit, so it wins when both are present.
  const visits = visitsData ?? source?.visits ?? [];

  const openNewVisit = () => { setEditingVisit(null); setVisitOpen(true); };
  const openEditVisit = (v: ReferralVisit) => { setEditingVisit(v); setVisitOpen(true); };

  // Filter by whoever logged the visit. Names come from the visits themselves, so
  // the list only ever offers people who actually appear in this source's log.
  const [visitorFilter, setVisitorFilter] = useState("all");
  const visitorNames = [...new Set(visits.map(visitedByNameOf).filter(Boolean) as string[])].sort();
  const hasUnnamed = visits.some((v) => !visitedByNameOf(v));
  const shownVisits = visits.filter((v) =>
    visitorFilter === "all" ? true
      : visitorFilter === "__none" ? !visitedByNameOf(v)
        : visitedByNameOf(v) === visitorFilter,
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-1" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!source) {
    return <EmptyState title="المصدر غير موجود" description="ربما تم حذفه أو أن الرابط غير صحيح" />;
  }

  const addressLine = [source.street, source.landmark, source.region, source.city]
    .filter(Boolean).join("، ");
  // A project (ASSOCIATION) has its own short record: name, backer, contract
  // dates and notes. The visits, address, phones, ratings and map of the other
  // source types do not apply to it and are left out.
  const isProject = source.type === "ASSOCIATION";
  // patientCount is the real number of patients attributed to this source (the
  // "case density" management asked for) — not the manual 1-5 patientDensityRating.
  const patientCount = source.patientCount ?? counts?.patientCount;
  const sales = source.sales ?? source.realPatientCount ?? counts?.sales;

  return (
    <PageGuard permission={PERMISSIONS.CLINIC_REFERRALS.VIEW}>
      <div className="space-y-6">
        <PageHeader
          title={source.name}
          description={[REFERRAL_SOURCE_TYPE_LABEL[source.type], source.specialty].filter(Boolean).join(" — ")}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" className="gap-2"
                onClick={() => router.push(`/${locale}/clinic/${isProject ? "projects" : "referrals"}`)}>
                <ArrowRight className="h-4 w-4" />
                رجوع
              </Button>
              <ActionGuard permission={PERMISSIONS.CLINIC_REFERRALS.MANAGE}>
                <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  تعديل
                </Button>
              </ActionGuard>
              {!isProject && (
              <ActionGuard permission={PERMISSIONS.CLINIC_REFERRALS.VISITS_ADD}>
                <Button className="gap-2" onClick={openNewVisit}>
                  <Plus className="h-4 w-4" />
                  تسجيل زيارة
                </Button>
              </ActionGuard>
              )}
            </div>
          }
        />

        {isProject ? (
          <Card className="max-w-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-base">بيانات المشروع</CardTitle></CardHeader>
            <CardContent>
              <InfoRow label="اسم المشروع" value={source.name} />
              <InfoRow label="الجهة الداعمة" value={source.supportingEntity || "—"} />
              <InfoRow label="تاريخ التعاقد" value={formatDate(source.contractDate)} />
              <InfoRow label="تاريخ التفعيل" value={formatDate(source.activationDate)} />
              <InfoRow label="تاريخ انتهاء التعاقد" value={formatDate(source.contractEndDate)} />
              <InfoRow label="ملاحظات أخرى" value={source.notes || "—"} />
            </CardContent>
          </Card>
        ) : (
        <>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-4 pb-3">
              <div className="rounded-lg bg-muted p-2"><CalendarClock className="h-5 w-5 text-muted-foreground" /></div>
              <div>
                <p className="mb-0.5 text-sm text-muted-foreground">عدد الزيارات</p>
                <p className="text-2xl font-bold">{visits.length}</p>
              </div>
            </CardContent>
          </Card>
          {canSeeStats && (
            <Card className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => showPatients(false)}>
              <CardContent className="flex items-center gap-3 pt-4 pb-3">
                <div className="rounded-lg bg-muted p-2"><Users className="h-5 w-5 text-muted-foreground" /></div>
                <div>
                  <p className="mb-0.5 text-sm text-muted-foreground">كثافة الحالات (المرضى المُحالون)</p>
                  <p className="text-2xl font-bold">{patientCount ?? "—"}</p>
                  {source.densityPercent != null && (
                    <p className="text-xs text-muted-foreground">
                      <span className="tabular-nums">{Number(source.densityPercent).toFixed(1)}%</span> من مرضى نفس النوع ({REFERRAL_SOURCE_TYPE_LABEL[source.type]})
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          {canSeeStats && (
            <Card className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => showPatients(true)}>
              <CardContent className="flex items-center gap-3 pt-4 pb-3">
                <div className="rounded-lg bg-muted p-2"><ShoppingBag className="h-5 w-5 text-muted-foreground" /></div>
                <div>
                  <p className="mb-0.5 text-sm text-muted-foreground">المبيعات</p>
                  <p className="text-2xl font-bold">{sales ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">مرضى دخلوا خدمة فعلاً — اضغط لعرضهم</p>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="flex items-center gap-3 pt-4 pb-3">
              <div className="rounded-lg bg-muted p-2"><CalendarClock className="h-5 w-5 text-muted-foreground" /></div>
              <div>
                <p className="mb-0.5 text-sm text-muted-foreground">أيام الزيارة</p>
                <p className="text-base font-semibold">{source.visitDays || "—"}</p>
                {source.visitTimes && (
                  <p className="text-xs text-muted-foreground">{source.visitTimes}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2"><CardTitle className="text-base">البيانات</CardTitle></CardHeader>
            <CardContent>
              <InfoRow label="النوع" value={
                <Badge variant="outline" className="text-xs">{REFERRAL_SOURCE_TYPE_LABEL[source.type]}</Badge>
              } />
              <InfoRow label="التخصص" value={source.specialty} />
              <InfoRow label="المدينة" value={source.city} />
              <InfoRow label="المنطقة" value={source.region} />
              <InfoRow label="الشارع" value={source.street} />
              <InfoRow label="أقرب معلم" value={source.landmark} />
              <InfoRow label="الطابق" value={source.floor} />
              <InfoRow label="العنوان" value={source.address} />
              <InfoRow label="هاتف العيادة" value={source.clinicPhone && (
                <span className="inline-flex items-center gap-1.5" dir="ltr">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />{source.clinicPhone}
                </span>
              )} />
              <InfoRow label="الجوال" value={source.mobile && <WhatsAppLink phone={source.mobile} />} />
              <InfoRow label="تقييم العيادة" value={source.clinicRating ? <Stars value={source.clinicRating} /> : null} />
              <InfoRow label="تقييم كثافة المرضى (يدوي)" value={source.patientDensityRating ? <Stars value={source.patientDensityRating} /> : null} />
              <InfoRow label="تقييم الطبيب" value={source.doctorRating ? <Stars value={source.doctorRating} /> : null} />
              <InfoRow label="أوقات الزيارة" value={source.visitTimes} />
              <InfoRow label="الاهتمامات" value={source.interests?.length ? (
                <span className="flex flex-wrap justify-end gap-1">
                  {source.interests.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                </span>
              ) : null} />
              <InfoRow label="ملاحظات" value={source.notes} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                الموقع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {addressLine && <p className="text-sm text-muted-foreground">{addressLine}</p>}
              {source.latitude != null && source.longitude != null ? (
                <LocationMap
                  value={{ latitude: source.latitude, longitude: source.longitude }}
                  height={320}
                />
              ) : (
                <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
                  لم يتم تحديد موقع على الخريطة لهذا المصدر
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-wrap gap-2 flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">الزيارات</CardTitle>
            <ActionGuard permission={PERMISSIONS.CLINIC_REFERRALS.VISITS_ADD}>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={openNewVisit}>
                <Plus className="h-3.5 w-3.5" />
                تسجيل زيارة
              </Button>
            </ActionGuard>
          </CardHeader>
          <CardContent>
            {visits.length === 0 ? (
              <EmptyState
                icon={<CalendarClock className="h-8 w-8 text-muted-foreground" />}
                title="لا توجد زيارات مسجلة"
                description="سجّل أول زيارة لهذا المصدر"
              />
            ) : (
              <>
              {visitorNames.length > 0 && (
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">الموظف</span>
                  <Select value={visitorFilter} onValueChange={setVisitorFilter}>
                    <SelectTrigger className="h-8 w-56 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      {visitorNames.map((name) => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                      {hasUnnamed && <SelectItem value="__none">غير محدد</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="rounded-md border">
                <Table dir="rtl">
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>المحاور</TableHead>
                      <TableHead>الزيارة المرتقبة</TableHead>
                      <TableHead>بواسطة</TableHead>
                      <TableHead>ملاحظات</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shownVisits
                      .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())
                      .map((v) => (
                        <TableRow
                          key={v.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setViewingVisit(v)}
                        >
                          <TableCell className="font-medium">{formatDate(v.visitDate)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{REFERRAL_VISIT_TYPE_LABEL[v.visitType]}</Badge>
                          </TableCell>
                          <TableCell className="max-w-52 truncate text-sm">{v.topics || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(v.nextVisitDate)}</TableCell>
                          <TableCell className="text-sm">{visitedByNameOf(v) ?? "—"}</TableCell>
                          <TableCell className="max-w-52 truncate text-sm text-muted-foreground">{v.notes || "—"}</TableCell>
                          <TableCell>
                            <ActionGuard permission={PERMISSIONS.CLINIC_REFERRALS.VISITS_ADD}>
                              {/* The row itself opens the visit, so the buttons keep the click. */}
                              <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditVisit(v)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteVisitTarget(v)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </ActionGuard>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
                {shownVisits.length === 0 && (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    لا توجد زيارات لهذا الموظف
                  </p>
                )}
              </div>
              </>
            )}
          </CardContent>
        </Card>

        {canSeeStats && (
          <Card id="referred-patients" className="scroll-mt-4">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-muted-foreground" />
                {salesOnly ? "المبيعات" : "المرضى المُحالون"}
                {patientsData && <Badge variant="secondary" className="text-xs">{patientsData.total}</Badge>}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={exportPatients}
                disabled={exporting || !patientsData?.items.length}
              >
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                تصدير PDF
              </Button>
              <div className="inline-flex rounded-lg border bg-muted/40 p-1">
                {[
                  { only: false, label: "كل المسجّلين" },
                  { only: true, label: "المبيعات" },
                ].map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    onClick={() => { setSalesOnly(o.only); setPatientsPage(1); }}
                    aria-pressed={salesOnly === o.only}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      salesOnly === o.only ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">تاريخ الإحالة من</span>
                <Input
                  type="date"
                  className="h-8 w-40 text-xs"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => { setDateFrom(e.target.value); setPatientsPage(1); }}
                />
                <span className="text-xs text-muted-foreground">إلى</span>
                <Input
                  type="date"
                  className="h-8 w-40 text-xs"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => { setDateTo(e.target.value); setPatientsPage(1); }}
                />
                {(dateFrom || dateTo) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={() => { setDateFrom(""); setDateTo(""); setPatientsPage(1); }}
                  >
                    مسح
                  </Button>
                )}
              </div>
              {patientsLoading ? (
                <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : !patientsData?.items.length ? (
                <EmptyState
                  icon={<Users className="h-8 w-8 text-muted-foreground" />}
                  title={
                    dateFrom || dateTo ? "لا يوجد مرضى ضمن هذه الفترة"
                      : salesOnly ? "لا توجد مبيعات لهذا المصدر بعد" : "لا يوجد مرضى منسوبون لهذا المصدر"
                  }
                />
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table dir="rtl">
                      <TableHeader>
                        <TableRow>
                          <TableHead>رقم المريض</TableHead>
                          <TableHead>الاسم</TableHead>
                          <TableHead>الهاتف</TableHead>
                          <TableHead>تاريخ الإحالة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patientsData.items.map((p) => (
                          <TableRow
                            key={p.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => router.push(`/${locale}/clinic/patients/${p.id}`)}
                          >
                            <TableCell className="font-mono text-xs">{p.patientNumber || "—"}</TableCell>
                            <TableCell className="font-medium">{p.name || "—"}</TableCell>
                            <TableCell className="text-sm"><span dir="ltr">{p.phone || "—"}</span></TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDate(p.referredAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {patientsData.totalPages > 1 && (
                    <Pagination
                      page={patientsData.page}
                      totalPages={patientsData.totalPages}
                      total={patientsData.total}
                      limit={patientsData.limit}
                      onPageChange={setPatientsPage}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        </>
        )}

        <ReferralSourceFormDialog open={editOpen} onOpenChange={setEditOpen} source={source} />

        <Dialog open={!!viewingVisit} onOpenChange={(o) => !o && setViewingVisit(null)}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>تفاصيل الزيارة</DialogTitle>
            </DialogHeader>
            {viewingVisit && (
              <div className="space-y-0.5">
                <InfoRow label="التاريخ" value={formatDate(viewingVisit.visitDate)} />
                <InfoRow
                  label="النوع"
                  value={<Badge variant="outline" className="text-xs">
                    {REFERRAL_VISIT_TYPE_LABEL[viewingVisit.visitType]}
                  </Badge>}
                />
                <InfoRow label="بواسطة" value={visitedByNameOf(viewingVisit)} />
                <InfoRow
                  label="الزيارة المرتقبة"
                  value={viewingVisit.nextVisitDate ? formatDate(viewingVisit.nextVisitDate) : null}
                />
                {/* The table truncates these two, which is the whole reason the
                    row opens — so here they wrap in full. */}
                <InfoRow
                  label="المحاور"
                  value={viewingVisit.topics && (
                    <span className="whitespace-pre-wrap">{viewingVisit.topics}</span>
                  )}
                />
                <InfoRow
                  label="ملاحظات"
                  value={viewingVisit.notes && (
                    <span className="whitespace-pre-wrap">{viewingVisit.notes}</span>
                  )}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        <ReferralVisitDialog
          open={visitOpen}
          onOpenChange={(o) => { setVisitOpen(o); if (!o) setEditingVisit(null); }}
          sourceId={id}
          visit={editingVisit}
        />

        <ConfirmDialog
          open={!!deleteVisitTarget}
          onOpenChange={(o) => !o && setDeleteVisitTarget(null)}
          title="حذف الزيارة؟"
          description={`سيتم حذف زيارة ${formatDate(deleteVisitTarget?.visitDate)} نهائياً.`}
          variant="destructive"
          onConfirm={() => {
            if (deleteVisitTarget) deleteVisit.mutate({ sourceId: id, visitId: deleteVisitTarget.id });
            setDeleteVisitTarget(null);
          }}
        />
      </div>
    </PageGuard>
  );
}
