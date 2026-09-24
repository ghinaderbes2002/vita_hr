"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS, tr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { MaintenanceStatusBadge } from "@/components/features/maintenance-requests/maintenance-status-badge";
import { useMaintenanceLog } from "@/lib/hooks/use-maintenance-requests";
import { MaintenanceLogItem, MaintenanceStatus } from "@/lib/api/maintenance-requests";

const PRIORITY_CLASSES: Record<string, string> = {
  URGENT: "bg-red-100 text-red-800 border-red-300",
  MEDIUM: "bg-orange-100 text-orange-800 border-orange-300",
  NORMAL: "bg-gray-100 text-gray-700 border-gray-300",
};

/** Every state a logged request can be in, in the order the request moves. */
const STATUSES: MaintenanceStatus[] = [
  "PENDING_LOGISTICS", "PENDING_EXECUTIVE", "ASSIGNED", "DONE", "REJECTED",
];

export default function MaintenanceLogPage() {
  return (
    <PageGuard permission={PERMISSIONS.REQUESTS.LO_APPROVE}>
      <MaintenanceLog />
    </PageGuard>
  );
}

function MaintenanceLog() {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "ar" ? ar : locale === "tr" ? tr : enUS;

  const { data: rows = [], isLoading } = useMaintenanceLog();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<MaintenanceStatus | "ALL">("ALL");

  // The log arrives whole, so both filters narrow it here without another call.
  const term = search.trim().toLowerCase();
  const submittedBy = (r: MaintenanceLogItem) =>
    r.submittedByName?.trim() ||
    [r.employee?.firstNameAr, r.employee?.lastNameAr].filter(Boolean).join(" ").trim();
  const list = rows.filter((r) => {
    if (status !== "ALL" && r.status !== status) return false;
    if (!term) return true;
    return [submittedBy(r), r.assignedToName ?? "", r.details?.assetType ?? ""]
      .some((v) => v.toLowerCase().includes(term));
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("maintenance.log.title")}
        description={t("maintenance.log.description")}
      />

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_14rem]">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("maintenance.log.searchPlaceholder")}
                className="ps-9"
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as MaintenanceStatus | "ALL")}>
              <SelectTrigger className="w-full min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("maintenance.log.allStatuses")}</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{t(`maintenance.statuses.${s}` as any)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table dir={locale === "ar" ? "rtl" : "ltr"}>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("maintenance.log.submittedBy")}</TableHead>
                  <TableHead>{t("maintenance.fields.assetType")}</TableHead>
                  <TableHead>{t("maintenance.fields.workLocation")}</TableHead>
                  <TableHead>{t("maintenance.fields.priority")}</TableHead>
                  <TableHead>{t("maintenance.log.assignedTo")}</TableHead>
                  <TableHead>{t("requests.fields.status")}</TableHead>
                  <TableHead>{t("requests.fields.createdAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      {rows.length === 0 ? t("common.noData") : t("maintenance.log.noMatches")}
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{submittedBy(r) || "—"}</TableCell>
                      <TableCell>{r.details?.assetType || "—"}</TableCell>
                      <TableCell>
                        {r.details?.workLocation
                          ? t(`maintenance.workLocations.${r.details.workLocation}` as any)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {r.details?.priority ? (
                          <Badge variant="outline" className={PRIORITY_CLASSES[r.details.priority] ?? ""}>
                            {t(`maintenance.priorities.${r.details.priority}` as any)}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      {/* Null until the logistics officer puts someone on the job. */}
                      <TableCell>{r.assignedToName?.trim() || "—"}</TableCell>
                      <TableCell><MaintenanceStatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(r.createdAt), "PPP", { locale: dateLocale })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!isLoading && rows.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("maintenance.log.count", { shown: list.length, total: rows.length })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
