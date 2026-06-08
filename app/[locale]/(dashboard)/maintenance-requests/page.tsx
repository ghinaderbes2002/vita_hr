"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Eye } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS, tr } from "date-fns/locale";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useMyMaintenanceRequests } from "@/lib/hooks/use-maintenance-requests";
import { MaintenanceRequestDialog } from "@/components/features/maintenance-requests/maintenance-request-dialog";
import { MaintenanceStatusBadge } from "@/components/features/maintenance-requests/maintenance-status-badge";
import { MaintenanceRequest } from "@/lib/api/maintenance-requests";

const priorityClasses: Record<string, string> = {
  URGENT: "bg-red-100 text-red-800 border-red-300",
  MEDIUM: "bg-orange-100 text-orange-800 border-orange-300",
  NORMAL: "bg-gray-100 text-gray-700 border-gray-300",
};

export default function MaintenanceRequestsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "ar" ? ar : locale === "tr" ? tr : enUS;

  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<MaintenanceRequest | null>(null);

  const { data, isLoading } = useMyMaintenanceRequests();
  const requests: MaintenanceRequest[] = (data as any)?.data?.items || (data as any)?.data || (data as any)?.items || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("maintenance.myRequests")}
        description={t("maintenance.myRequestsDescription")}
        actions={
          <Button onClick={() => setNewDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            {t("maintenance.newRequest")}
          </Button>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("requests.fields.requestNumber")}</TableHead>
              <TableHead>{t("maintenance.fields.assetType")}</TableHead>
              <TableHead>{t("maintenance.fields.workLocation")}</TableHead>
              <TableHead>{t("maintenance.fields.priority")}</TableHead>
              <TableHead>{t("requests.fields.status")}</TableHead>
              <TableHead>{t("requests.fields.createdAt")}</TableHead>
              <TableHead className="w-17.5">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-sm">{req.requestNumber || "—"}</TableCell>
                  <TableCell>{req.details?.assetType || "—"}</TableCell>
                  <TableCell>
                    {req.details?.workLocation
                      ? t(`maintenance.workLocations.${req.details.workLocation}` as any)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {req.details?.priority && (
                      <Badge variant="outline" className={priorityClasses[req.details.priority] ?? ""}>
                        {t(`maintenance.priorities.${req.details.priority}` as any)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <MaintenanceStatusBadge status={req.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(req.createdAt), "PPP", { locale: dateLocale })}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setSelected(req); setDetailsOpen(true); }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <MaintenanceRequestDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} />

      {/* Details dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("maintenance.title")}</DialogTitle>
          </DialogHeader>
          {selected && (
            <Card>
              <CardContent className="pt-5 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t("requests.fields.requestNumber")}</p>
                    <p className="font-medium font-mono">{selected.requestNumber || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("requests.fields.status")}</p>
                    <MaintenanceStatusBadge status={selected.status} />
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("maintenance.fields.workLocation")}</p>
                    <p className="font-medium">
                      {selected.details?.workLocation
                        ? t(`maintenance.workLocations.${selected.details.workLocation}` as any)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("maintenance.fields.priority")}</p>
                    <p className="font-medium">
                      {selected.details?.priority
                        ? t(`maintenance.priorities.${selected.details.priority}` as any)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("maintenance.fields.assetType")}</p>
                    <p className="font-medium">{selected.details?.assetType || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("maintenance.fields.assetNumber")}</p>
                    <p className="font-medium">{selected.details?.assetNumber || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("maintenance.fields.brandModel")}</p>
                    <p className="font-medium">{selected.details?.brandModel || "—"}</p>
                  </div>
                  {selected.details?.repairOption && (
                    <div>
                      <p className="text-muted-foreground">{t("maintenance.fields.repairOption")}</p>
                      <p className="font-medium">
                        {t(`maintenance.repairOptions.${selected.details.repairOption}` as any)}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">{t("maintenance.fields.faultDescription")}</p>
                  <p className="mt-0.5 whitespace-pre-wrap">{selected.details?.faultDescription || "—"}</p>
                </div>
                {selected.details?.situationDescription && (
                  <div>
                    <p className="text-muted-foreground text-sm">{t("maintenance.fields.situationDescription")}</p>
                    <p className="mt-0.5 whitespace-pre-wrap">{selected.details.situationDescription}</p>
                  </div>
                )}
                {selected.targetEmployee && (
                  <div>
                    <p className="text-muted-foreground text-sm">{t("maintenance.fields.assignedEmployee")}</p>
                    <p className="font-medium">
                      {selected.targetEmployee.firstNameAr} {selected.targetEmployee.lastNameAr}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailsOpen(false)}>{t("common.confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
