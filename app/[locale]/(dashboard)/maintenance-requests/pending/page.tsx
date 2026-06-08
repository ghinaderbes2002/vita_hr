"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, X, Eye, Settings } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS, tr } from "date-fns/locale";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  useAllMaintenanceRequests,
  useManagerApproveMaintenanceRequest,
  useManagerRejectMaintenanceRequest,
  useExecutiveApproveMaintenanceRequest,
  useExecutiveRejectMaintenanceRequest,
} from "@/lib/hooks/use-maintenance-requests";
import { MaintenanceStatusBadge } from "@/components/features/maintenance-requests/maintenance-status-badge";
import { LogisticsDialog } from "@/components/features/maintenance-requests/logistics-dialog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { MaintenanceRequest } from "@/lib/api/maintenance-requests";

const priorityClasses: Record<string, string> = {
  URGENT: "bg-red-100 text-red-800 border-red-300",
  MEDIUM: "bg-orange-100 text-orange-800 border-orange-300",
  NORMAL: "bg-gray-100 text-gray-700 border-gray-300",
};

type ActionType = "manager-approve" | "manager-reject" | "executive-approve" | "executive-reject";

export default function MaintenancePendingPage() {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "ar" ? ar : locale === "tr" ? tr : enUS;

  const { hasPermission, isAdmin } = usePermissions();
  const canManagerApprove = isAdmin() || hasPermission("maintenance:manager-approve" as any);
  const canLogistics = isAdmin() || hasPermission("maintenance:logistics" as any);
  const canExecutiveApprove = isAdmin() || hasPermission("maintenance:executive-approve" as any);

  const showManagerTab = isAdmin() || canManagerApprove;
  const showLogisticsTab = isAdmin() || canLogistics;
  const showExecutiveTab = isAdmin() || canExecutiveApprove;

  const defaultTab = showManagerTab ? "manager" : showLogisticsTab ? "logistics" : "executive";
  const [activeTab, setActiveTab] = useState(defaultTab);

  const [actionDialog, setActionDialog] = useState<{ type: ActionType; req: MaintenanceRequest } | null>(null);
  const [notes, setNotes] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<MaintenanceRequest | null>(null);
  const [logisticsRequestId, setLogisticsRequestId] = useState<string | null>(null);
  const [logisticsDialogOpen, setLogisticsDialogOpen] = useState(false);

  const { data: managerData, isLoading: managerLoading } = useAllMaintenanceRequests(
    { status: "PENDING_MANAGER" },
    { enabled: activeTab === "manager" },
  );
  const { data: logisticsData, isLoading: logisticsLoading } = useAllMaintenanceRequests(
    { status: "PENDING_LOGISTICS" },
    { enabled: activeTab === "logistics" },
  );
  const { data: execData, isLoading: execLoading } = useAllMaintenanceRequests(
    { status: "PENDING_EXECUTIVE" },
    { enabled: activeTab === "executive" },
  );

  const managerApprove = useManagerApproveMaintenanceRequest();
  const managerReject = useManagerRejectMaintenanceRequest();
  const execApprove = useExecutiveApproveMaintenanceRequest();
  const execReject = useExecutiveRejectMaintenanceRequest();

  const getList = (tab: string): MaintenanceRequest[] => {
    const d = tab === "manager" ? managerData : tab === "logistics" ? logisticsData : execData;
    return (d as any)?.data?.items || (d as any)?.data || (d as any)?.items || [];
  };
  const isLoadingTab = activeTab === "manager" ? managerLoading : activeTab === "logistics" ? logisticsLoading : execLoading;

  const openAction = (type: ActionType, req: MaintenanceRequest) => {
    setActionDialog({ type, req });
    setNotes("");
  };

  const confirmAction = async () => {
    if (!actionDialog) return;
    const { type, req } = actionDialog;
    if (type === "manager-approve") await managerApprove.mutateAsync({ id: req.id, notes: notes || undefined });
    else if (type === "manager-reject") await managerReject.mutateAsync({ id: req.id, notes: notes || undefined });
    else if (type === "executive-approve") await execApprove.mutateAsync({ id: req.id, notes: notes || undefined });
    else if (type === "executive-reject") await execReject.mutateAsync({ id: req.id, notes: notes || undefined });
    setActionDialog(null);
    setNotes("");
  };

  const isConfirmPending =
    managerApprove.isPending || managerReject.isPending ||
    execApprove.isPending || execReject.isPending;

  const isRejectAction = (type?: ActionType) =>
    type === "manager-reject" || type === "executive-reject";

  const renderTable = (
    list: MaintenanceRequest[],
    actions: (req: MaintenanceRequest) => React.ReactNode,
  ) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("requests.fields.employee")}</TableHead>
          <TableHead>{t("maintenance.fields.assetType")}</TableHead>
          <TableHead>{t("maintenance.fields.workLocation")}</TableHead>
          <TableHead>{t("maintenance.fields.priority")}</TableHead>
          <TableHead>{t("requests.fields.createdAt")}</TableHead>
          <TableHead>{t("common.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoadingTab ? (
          Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 6 }).map((_, j) => (
                <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
              ))}
            </TableRow>
          ))
        ) : list.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center">{t("common.noData")}</TableCell>
          </TableRow>
        ) : (
          list.map((req) => (
            <TableRow key={req.id}>
              <TableCell className="font-medium">
                {req.employee?.firstNameAr} {req.employee?.lastNameAr}
              </TableCell>
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
              <TableCell className="text-muted-foreground text-sm">
                {format(new Date(req.createdAt), "PPP", { locale: dateLocale })}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setSelectedDetails(req); setDetailsOpen(true); }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {actions(req)}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const managerActions = (req: MaintenanceRequest) => (
    <>
      <Button size="sm" onClick={() => openAction("manager-approve", req)}>
        <Check className="h-4 w-4 ml-1" />
        {t("maintenance.actions.approve")}
      </Button>
      <Button size="sm" variant="destructive" onClick={() => openAction("manager-reject", req)}>
        <X className="h-4 w-4 ml-1" />
        {t("maintenance.actions.reject")}
      </Button>
    </>
  );

  const logisticsActions = (req: MaintenanceRequest) => (
    <Button
      size="sm"
      variant="outline"
      onClick={() => { setLogisticsRequestId(req.id); setLogisticsDialogOpen(true); }}
    >
      <Settings className="h-4 w-4 ml-1" />
      {t("maintenance.actions.process")}
    </Button>
  );

  const executiveActions = (req: MaintenanceRequest) => (
    <>
      <Button size="sm" onClick={() => openAction("executive-approve", req)}>
        <Check className="h-4 w-4 ml-1" />
        {t("maintenance.actions.approve")}
      </Button>
      <Button size="sm" variant="destructive" onClick={() => openAction("executive-reject", req)}>
        <X className="h-4 w-4 ml-1" />
        {t("maintenance.actions.reject")}
      </Button>
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("maintenance.pendingTitle")}
        description={t("maintenance.pendingDescription")}
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v)}
        className="space-y-4"
      >
        <TabsList>
          {showManagerTab && (
            <TabsTrigger value="manager">{t("maintenance.tabs.manager")}</TabsTrigger>
          )}
          {showLogisticsTab && (
            <TabsTrigger value="logistics">{t("maintenance.tabs.logistics")}</TabsTrigger>
          )}
          {showExecutiveTab && (
            <TabsTrigger value="executive">{t("maintenance.tabs.executive")}</TabsTrigger>
          )}
        </TabsList>

        {showManagerTab && (
          <TabsContent value="manager" className="rounded-md border">
            {renderTable(getList("manager"), managerActions)}
          </TabsContent>
        )}
        {showLogisticsTab && (
          <TabsContent value="logistics" className="rounded-md border">
            {renderTable(getList("logistics"), logisticsActions)}
          </TabsContent>
        )}
        {showExecutiveTab && (
          <TabsContent value="executive" className="rounded-md border">
            {renderTable(getList("executive"), executiveActions)}
          </TabsContent>
        )}
      </Tabs>

      {/* Approve / Reject dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(v) => !v && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog
                ? t(isRejectAction(actionDialog.type)
                    ? "maintenance.actions.rejectTitle"
                    : "maintenance.actions.approveTitle")
                : ""}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.req.employee?.firstNameAr} {actionDialog?.req.employee?.lastNameAr}
              {" — "}
              {actionDialog?.req.details?.assetType}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>
              {isRejectAction(actionDialog?.type)
                ? t("maintenance.actions.notesRequired")
                : t("maintenance.actions.notesLabel")}
            </Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("maintenance.fields.notesPlaceholder")}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant={isRejectAction(actionDialog?.type) ? "destructive" : "default"}
              onClick={confirmAction}
              disabled={isConfirmPending || (isRejectAction(actionDialog?.type) && !notes)}
            >
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("maintenance.title")}</DialogTitle>
          </DialogHeader>
          {selectedDetails && (
            <Card>
              <CardContent className="pt-5 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t("requests.fields.employee")}</p>
                    <p className="font-medium">
                      {selectedDetails.employee?.firstNameAr} {selectedDetails.employee?.lastNameAr}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("requests.fields.status")}</p>
                    <MaintenanceStatusBadge status={selectedDetails.status} />
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("maintenance.fields.workLocation")}</p>
                    <p className="font-medium">
                      {selectedDetails.details?.workLocation
                        ? t(`maintenance.workLocations.${selectedDetails.details.workLocation}` as any)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("maintenance.fields.priority")}</p>
                    <p className="font-medium">
                      {selectedDetails.details?.priority
                        ? t(`maintenance.priorities.${selectedDetails.details.priority}` as any)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("maintenance.fields.assetType")}</p>
                    <p className="font-medium">{selectedDetails.details?.assetType || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("maintenance.fields.brandModel")}</p>
                    <p className="font-medium">{selectedDetails.details?.brandModel || "—"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">{t("maintenance.fields.faultDescription")}</p>
                  <p className="mt-0.5 whitespace-pre-wrap">{selectedDetails.details?.faultDescription || "—"}</p>
                </div>
              </CardContent>
            </Card>
          )}
          <DialogFooter>
            <Button onClick={() => setDetailsOpen(false)}>{t("common.confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LogisticsDialog
        open={logisticsDialogOpen}
        onOpenChange={setLogisticsDialogOpen}
        requestId={logisticsRequestId}
      />
    </div>
  );
}
