"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  ArrowRight, CalendarClock, MapPin, Pencil, Phone, Plus, Smartphone, Star, Trash2, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionGuard, PageGuard } from "@/components/permissions";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { LocationMap } from "@/components/clinic/location-map";
import { ReferralSourceFormDialog } from "@/components/clinic/referral-source-form-dialog";
import { ReferralVisitDialog } from "@/components/clinic/referral-visit-dialog";
import {
  useDeleteReferralVisit, useReferralSource, useReferralSourcePatientCount, useReferralVisits,
} from "@/lib/hooks/use-clinic-referrals";
import {
  REFERRAL_SOURCE_TYPE_LABEL, REFERRAL_VISIT_TYPE_LABEL, ReferralVisit,
} from "@/lib/api/clinic-referrals";

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("ar-SA-u-nu-latn", { dateStyle: "medium" }) : "—";

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-3 border-b py-2 last:border-0">
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

  const { data: source, isLoading } = useReferralSource(id);
  const { data: visitsData } = useReferralVisits(id);
  // The stats endpoints are separately permissioned, so the count is only
  // requested for users who are allowed to see it.
  const { data: patientCount } = useReferralSourcePatientCount(canSeeStats ? id : "");
  const deleteVisit = useDeleteReferralVisit();

  // The detail response already embeds the visits; the dedicated list endpoint
  // is what stays fresh after an add/edit, so it wins when both are present.
  const visits = visitsData ?? source?.visits ?? [];

  const openNewVisit = () => { setEditingVisit(null); setVisitOpen(true); };
  const openEditVisit = (v: ReferralVisit) => { setEditingVisit(v); setVisitOpen(true); };

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

  return (
    <PageGuard permission={PERMISSIONS.CLINIC_REFERRALS.VIEW}>
      <div className="space-y-6">
        <PageHeader
          title={source.name}
          description={[REFERRAL_SOURCE_TYPE_LABEL[source.type], source.specialty].filter(Boolean).join(" — ")}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-2"
                onClick={() => router.push(`/${locale}/clinic/referrals`)}>
                <ArrowRight className="h-4 w-4" />
                رجوع
              </Button>
              <ActionGuard permission={PERMISSIONS.CLINIC_REFERRALS.MANAGE}>
                <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  تعديل
                </Button>
              </ActionGuard>
              <ActionGuard permission={PERMISSIONS.CLINIC_REFERRALS.VISITS_ADD}>
                <Button className="gap-2" onClick={openNewVisit}>
                  <Plus className="h-4 w-4" />
                  تسجيل زيارة
                </Button>
              </ActionGuard>
            </div>
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
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
            <Card>
              <CardContent className="flex items-center gap-3 pt-4 pb-3">
                <div className="rounded-lg bg-muted p-2"><Users className="h-5 w-5 text-muted-foreground" /></div>
                <div>
                  <p className="mb-0.5 text-sm text-muted-foreground">المرضى المُحالون</p>
                  <p className="text-2xl font-bold">{patientCount ?? "—"}</p>
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
              <InfoRow label="الجوال" value={source.mobile && (
                <span className="inline-flex items-center gap-1.5" dir="ltr">
                  <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />{source.mobile}
                </span>
              )} />
              <InfoRow label="تقييم العيادة" value={source.clinicRating ? <Stars value={source.clinicRating} /> : null} />
              <InfoRow label="كثافة المرضى" value={source.patientDensityRating ? <Stars value={source.patientDensityRating} /> : null} />
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
          <CardHeader className="flex flex-row items-center justify-between pb-2">
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
                    {[...visits]
                      .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())
                      .map((v) => (
                        <TableRow key={v.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{formatDate(v.visitDate)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{REFERRAL_VISIT_TYPE_LABEL[v.visitType]}</Badge>
                          </TableCell>
                          <TableCell className="max-w-52 truncate text-sm">{v.topics || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(v.nextVisitDate)}</TableCell>
                          <TableCell className="text-sm">{v.visitedBy?.fullName ?? "—"}</TableCell>
                          <TableCell className="max-w-52 truncate text-sm text-muted-foreground">{v.notes || "—"}</TableCell>
                          <TableCell>
                            <ActionGuard permission={PERMISSIONS.CLINIC_REFERRALS.VISITS_ADD}>
                              <div className="flex gap-1">
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
              </div>
            )}
          </CardContent>
        </Card>

        <ReferralSourceFormDialog open={editOpen} onOpenChange={setEditOpen} source={source} />

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
