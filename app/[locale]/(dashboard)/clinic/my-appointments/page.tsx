"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import { useMyAppointments } from "@/lib/hooks/use-clinic-appointments";
import { Appointment, AppointmentStatus } from "@/lib/api/clinic-appointments";

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-green-100 text-green-800",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-orange-100 text-orange-700",
  RESCHEDULED: "bg-purple-100 text-purple-800",
};

export default function MyAppointmentsPage() {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const t = useTranslations("clinic.appointments");

  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "ALL">("ALL");
  const [dateFilter, setDateFilter] = useState("");

  const { data, isLoading } = useMyAppointments({
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    date: dateFilter || undefined,
    limit: 100,
  });

  const items = (data?.items ?? []).slice().sort((a, b) => b.startTime.localeCompare(a.startTime));

  const fmtTime = (v?: string | null) =>
    v ? (v.length > 5 ? new Date(v).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : v) : "—";
  const fmtDate = (a: Appointment) =>
    a.startTime && a.startTime.length > 5
      ? new Date(a.startTime).toLocaleDateString(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      : (a.date ?? "—");

  const hasFilters = statusFilter !== "ALL" || !!dateFilter;

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      <PageHeader title={t("myAppointments.title")} description={t("myAppointments.description")} />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AppointmentStatus | "ALL")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("filter.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("filter.allStatuses")}</SelectItem>
            {(["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW", "RESCHEDULED"] as AppointmentStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{t(`statuses.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-44"
          aria-label={t("myAppointments.dateFilter")}
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setStatusFilter("ALL"); setDateFilter(""); }}>
            <X className="h-3.5 w-3.5" />
            {t("myAppointments.clearFilters")}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>{t("myAppointments.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((appt) => (
            <Card key={appt.id}>
              <CardContent className="flex items-start gap-3 p-3">
                <div className="text-center min-w-16 shrink-0">
                  <p className="font-mono text-sm font-bold">{fmtTime(appt.startTime)}</p>
                  <p className="font-mono text-xs text-muted-foreground">{fmtTime(appt.endTime)}</p>
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName}` : (appt.patientName || "—")}
                    </span>
                    <Badge className={cn("text-xs", STATUS_COLOR[appt.status])} variant="outline">{t(`statuses.${appt.status}`)}</Badge>
                    <Badge variant="outline" className="text-xs">{t(`types.${appt.appointmentType}`)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{fmtDate(appt)}</p>
                  {appt.notes && <p className="text-xs text-muted-foreground">{appt.notes}</p>}
                  {appt.status === "CANCELLED" && (appt.cancelReason || appt.cancelledReason) && (
                    <p className="text-xs text-destructive/80">{t("cancelReason")}: {appt.cancelReason ?? appt.cancelledReason}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
