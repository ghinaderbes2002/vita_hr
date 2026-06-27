"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, MoreHorizontal, Eye, Check, X, Settings } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS, tr } from "date-fns/locale";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { usePendingMyApproval, useApproveRequest, useRejectRequest, useCeoApprovedRequests } from "@/lib/hooks/use-requests";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { RequestStatusBadge } from "@/components/features/requests/request-status-badge";
import { RequestActionDialog } from "@/components/features/requests/request-action-dialog";
import { MaintenanceStatusBadge } from "@/components/features/maintenance-requests/maintenance-status-badge";
import { LogisticsDialog } from "@/components/features/maintenance-requests/logistics-dialog";
import {
  useAllMaintenanceRequests,
  useManagerApproveMaintenanceRequest,
  useManagerRejectMaintenanceRequest,
  useExecutiveApproveMaintenanceRequest,
  useExecutiveRejectMaintenanceRequest,
} from "@/lib/hooks/use-maintenance-requests";
import { MaintenanceRequest } from "@/lib/api/maintenance-requests";
import { Request } from "@/types";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { usePermissions } from "@/lib/hooks/use-permissions";

const priorityClasses: Record<string, string> = {
  URGENT: "bg-red-100 text-red-800 border-red-300",
  HIGH: "bg-orange-100 text-orange-800 border-orange-300",
  NORMAL: "bg-gray-100 text-gray-700 border-gray-300",
};

type MaintenanceActionType = "manager-approve" | "manager-reject" | "executive-approve" | "executive-reject";

export default function PendingManagerPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const dateLocale = locale === "ar" ? ar : locale === "tr" ? tr : enUS;

  const { hasPermission, isAdmin, hasRole } = usePermissions();
  const isCeo = hasRole("CEO" as any);
  const canManagerApprove = isAdmin() || hasPermission("maintenance:manager-approve" as any);
  const canLogistics = isAdmin() || hasPermission(PERMISSIONS.REQUESTS.LO_APPROVE);
  const canExecutiveApprove = isAdmin() || hasPermission(PERMISSIONS.REQUESTS.CEO_APPROVE);
  const showAnyMaintenance = isAdmin() || canManagerApprove || canLogistics || canExecutiveApprove;

  // ── Generic requests ──
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedGeneric, setSelectedGeneric] = useState<Request | null>(null);

  const { data, isLoading } = usePendingMyApproval({ limit: 50 });
  const { data: ceoApprovedData, isLoading: ceoApprovedLoading } = useCeoApprovedRequests({ limit: 50 }, { enabled: isCeo || isAdmin() });
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();
  const { data: allEmployeesData } = useEmployeesBasicList();

  const requests: Request[] = (data as any)?.data?.items || (data as any)?.data || [];
  const ceoApprovedRequests: Request[] = (ceoApprovedData as any)?.data?.items || (ceoApprovedData as any)?.data?.data?.items || [];
  const empMap = new Map(
    (Array.isArray(allEmployeesData) ? allEmployeesData : []).map((e: any) => [e.id, e])
  );
  const genericRequests = requests;
  const maintenancePendingItems = requests.filter((r) => (r as any).type === "MAINTENANCE") as any[];

  const handleApproveConfirm = async (notes: string) => {
    if (selectedGeneric) {
      await approveRequest.mutateAsync({ id: selectedGeneric.id, body: { notes: notes || undefined } });
      setApproveDialogOpen(false);
      setSelectedGeneric(null);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (selectedGeneric) {
      await rejectRequest.mutateAsync({ id: selectedGeneric.id, reason });
      setRejectDialogOpen(false);
      setSelectedGeneric(null);
    }
  };

  // ── Maintenance requests ──
  const defaultMaintenanceTab = canManagerApprove || isAdmin() ? "manager" : canLogistics ? "logistics" : canExecutiveApprove ? "executive" : "manager";
  const [maintenanceTab, setMaintenanceTab] = useState(defaultMaintenanceTab);
  const [maintenanceActionDialog, setMaintenanceActionDialog] = useState<{ type: MaintenanceActionType; req: MaintenanceRequest } | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<MaintenanceRequest | null>(null);
  const [logisticsRequestId, setLogisticsRequestId] = useState<string | null>(null);
  const [logisticsDialogOpen, setLogisticsDialogOpen] = useState(false);

  const { data: managerData, isLoading: managerLoading } = useAllMaintenanceRequests(
    { status: "PENDING_MANAGER" },
    { enabled: maintenanceTab === "manager" && showAnyMaintenance },
  );
  const { data: logisticsData, isLoading: logisticsLoading } = useAllMaintenanceRequests(
    { status: "PENDING_LOGISTICS" },
    { enabled: maintenanceTab === "logistics" && showAnyMaintenance },
  );
  const { data: execData, isLoading: execLoading } = useAllMaintenanceRequests(
    { status: "PENDING_EXECUTIVE" },
    { enabled: maintenanceTab === "executive" && showAnyMaintenance },
  );

  const managerApprove = useManagerApproveMaintenanceRequest();
  const managerReject = useManagerRejectMaintenanceRequest();
  const execApprove = useExecutiveApproveMaintenanceRequest();
  const execReject = useExecutiveRejectMaintenanceRequest();

  const getMaintenanceList = (tab: string): MaintenanceRequest[] => {
    if (tab === "manager" && !isAdmin() && !canManagerApprove) {
      return maintenancePendingItems;
    }
    const d = tab === "manager" ? managerData : tab === "logistics" ? logisticsData : execData;
    return (d as any)?.data?.items || (d as any)?.data || (d as any)?.items || [];
  };

  const isMaintenanceLoading = maintenanceTab === "manager"
    ? (!isAdmin() && !canManagerApprove ? false : managerLoading)
    : maintenanceTab === "logistics" ? logisticsLoading : execLoading;

  const confirmMaintenanceAction = async () => {
    if (!maintenanceActionDialog) return;
    const { type, req } = maintenanceActionDialog;
    if (type === "manager-approve") await managerApprove.mutateAsync({ id: req.id, notes: actionNotes || undefined });
    else if (type === "manager-reject") await managerReject.mutateAsync({ id: req.id, notes: actionNotes || undefined });
    else if (type === "executive-approve") await execApprove.mutateAsync({ id: req.id, notes: actionNotes || undefined });
    else if (type === "executive-reject") await execReject.mutateAsync({ id: req.id, notes: actionNotes || undefined });
    setMaintenanceActionDialog(null);
    setActionNotes("");
  };

  const isMaintenanceActionPending =
    managerApprove.isPending || managerReject.isPending ||
    execApprove.isPending || execReject.isPending;

  const isRejectAction = (type?: MaintenanceActionType) =>
    type === "manager-reject" || type === "executive-reject";

  const renderMaintenanceTable = (list: MaintenanceRequest[], actions: (req: MaintenanceRequest) => React.ReactNode) => (
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
        {isMaintenanceLoading ? (
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
                  <Button size="sm" variant="ghost" onClick={() => { setSelectedDetails(req); setDetailsOpen(true); }}>
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("requests.pendingManagerApproval")}
        description={t("requests.pendingManagerDescription") || "الطلبات التي تنتظر موافقتك"}
      />

      <Tabs defaultValue="admin" className="space-y-4">
        <TabsList>
          <TabsTrigger value="admin">{t("requests.tabs.adminRequests")}</TabsTrigger>
          {(isCeo || isAdmin()) && (
            <TabsTrigger value="ceo-approved">الطلبات المعتمدة</TabsTrigger>
          )}
        </TabsList>

        {/* ── Generic admin requests tab ── */}
        <TabsContent value="admin">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("requests.fields.requestNumber")}</TableHead>
                  <TableHead>{t("requests.fields.employee")}</TableHead>
                  <TableHead>{t("requests.fields.type")}</TableHead>
                  <TableHead>{t("requests.fields.reason")}</TableHead>
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
                ) : genericRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">{t("common.noData")}</TableCell>
                  </TableRow>
                ) : (
                  genericRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono text-sm">{req.requestNumber}</TableCell>
                      <TableCell>
                        {(() => {
                          const emp = (req as any).employee || empMap.get((req as any).employeeId);
                          return emp ? `${emp.firstNameAr} ${emp.lastNameAr}` : "—";
                        })()}
                      </TableCell>
                      <TableCell>{t(`requests.types.${req.type}` as any)}</TableCell>
                      <TableCell className="max-w-40 truncate">{req.reason}</TableCell>
                      <TableCell><RequestStatusBadge status={req.status} /></TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/${locale}/requests/${req.id}`)}>
                              <Eye className="h-4 w-4 ml-2" />
                              {t("common.view")}
                            </DropdownMenuItem>
                            {(req as any).type === "MAINTENANCE" ? (
                              <>
                                {(req as any).status === "PENDING_MANAGER" && canLogistics ? (
                                  <DropdownMenuItem onClick={() => { setLogisticsRequestId(req.id); setLogisticsDialogOpen(true); }}>
                                    <Settings className="h-4 w-4 ml-2 text-blue-600" />
                                    {t("maintenance.actions.process")}
                                  </DropdownMenuItem>
                                ) : (req as any).status === "PENDING_MANAGER" ? (
                                  <DropdownMenuItem onClick={() => { setMaintenanceActionDialog({ type: "manager-approve", req: req as any }); setActionNotes(""); }}>
                                    <CheckCircle className="h-4 w-4 ml-2 text-green-600" />
                                    {t("requests.actions.approve")}
                                  </DropdownMenuItem>
                                ) : (req as any).status === "PENDING_LOGISTICS" && canLogistics ? (
                                  <DropdownMenuItem onClick={() => { setLogisticsRequestId(req.id); setLogisticsDialogOpen(true); }}>
                                    <Settings className="h-4 w-4 ml-2 text-blue-600" />
                                    {t("maintenance.actions.process")}
                                  </DropdownMenuItem>
                                ) : (req as any).status === "PENDING_EXECUTIVE" && canExecutiveApprove ? (
                                  <>
                                    <DropdownMenuItem onClick={() => { setMaintenanceActionDialog({ type: "executive-approve", req: req as any }); setActionNotes(""); }}>
                                      <CheckCircle className="h-4 w-4 ml-2 text-green-600" />
                                      {t("requests.actions.approve")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => { setMaintenanceActionDialog({ type: "executive-reject", req: req as any }); setActionNotes(""); }}
                                      className="text-destructive"
                                    >
                                      <XCircle className="h-4 w-4 ml-2" />
                                      {t("requests.actions.reject")}
                                    </DropdownMenuItem>
                                  </>
                                ) : null}
                                {(req as any).status === "PENDING_MANAGER" && (
                                  <DropdownMenuItem
                                    onClick={() => { setMaintenanceActionDialog({ type: "manager-reject", req: req as any }); setActionNotes(""); }}
                                    className="text-destructive"
                                  >
                                    <XCircle className="h-4 w-4 ml-2" />
                                    {t("requests.actions.reject")}
                                  </DropdownMenuItem>
                                )}
                              </>
                            ) : (
                              <>
                                <ActionGuard permission={PERMISSIONS.REQUESTS.MANAGER_APPROVE}>
                                  <DropdownMenuItem onClick={() => { setSelectedGeneric(req); setApproveDialogOpen(true); }}>
                                    <CheckCircle className="h-4 w-4 ml-2 text-green-600" />
                                    {t("requests.actions.approve")}
                                  </DropdownMenuItem>
                                </ActionGuard>
                                <ActionGuard permission={PERMISSIONS.REQUESTS.MANAGER_REJECT}>
                                  <DropdownMenuItem
                                    onClick={() => { setSelectedGeneric(req); setRejectDialogOpen(true); }}
                                    className="text-destructive"
                                  >
                                    <XCircle className="h-4 w-4 ml-2" />
                                    {t("requests.actions.reject")}
                                  </DropdownMenuItem>
                                </ActionGuard>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── CEO Approved requests tab ── */}
        {(isCeo || isAdmin()) && (
          <TabsContent value="ceo-approved">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("requests.fields.requestNumber")}</TableHead>
                    <TableHead>{t("requests.fields.employee")}</TableHead>
                    <TableHead>{t("requests.fields.type")}</TableHead>
                    <TableHead>{t("requests.fields.reason")}</TableHead>
                    <TableHead>{t("requests.fields.status")}</TableHead>
                    <TableHead>{t("requests.fields.createdAt")}</TableHead>
                    <TableHead className="w-17.5">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ceoApprovedLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : ceoApprovedRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">{t("common.noData")}</TableCell>
                    </TableRow>
                  ) : (
                    ceoApprovedRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-mono text-sm">{req.requestNumber}</TableCell>
                        <TableCell>
                          {(() => {
                            const emp = (req as any).employee || empMap.get((req as any).employeeId);
                            return emp ? `${emp.firstNameAr} ${emp.lastNameAr}` : "—";
                          })()}
                        </TableCell>
                        <TableCell>{t(`requests.types.${req.type}` as any)}</TableCell>
                        <TableCell className="max-w-40 truncate">{req.reason}</TableCell>
                        <TableCell><RequestStatusBadge status={req.status} /></TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => router.push(`/requests/${req.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        )}

      </Tabs>

      {/* Generic request dialogs */}
      <RequestActionDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        action="approve"
        onConfirm={handleApproveConfirm}
        isLoading={approveRequest.isPending}
      />
      <RequestActionDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        action="reject"
        onConfirm={handleRejectConfirm}
        isLoading={rejectRequest.isPending}
      />

      {/* Maintenance approve/reject dialog */}
      <Dialog open={!!maintenanceActionDialog} onOpenChange={(v) => !v && setMaintenanceActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {maintenanceActionDialog
                ? t(isRejectAction(maintenanceActionDialog.type)
                    ? "maintenance.actions.rejectTitle"
                    : "maintenance.actions.approveTitle")
                : ""}
            </DialogTitle>
            <DialogDescription>
              {maintenanceActionDialog?.req.employee?.firstNameAr} {maintenanceActionDialog?.req.employee?.lastNameAr}
              {" — "}
              {maintenanceActionDialog?.req.details?.assetType}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>
              {isRejectAction(maintenanceActionDialog?.type)
                ? t("maintenance.actions.notesRequired")
                : t("maintenance.actions.notesLabel")}
            </Label>
            <Textarea
              rows={3}
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder={t("maintenance.fields.notesPlaceholder")}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintenanceActionDialog(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant={isRejectAction(maintenanceActionDialog?.type) ? "destructive" : "default"}
              onClick={confirmMaintenanceAction}
              disabled={isMaintenanceActionPending || (isRejectAction(maintenanceActionDialog?.type) && !actionNotes)}
            >
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maintenance details dialog */}
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
                    <p className="font-medium">{selectedDetails.employee?.firstNameAr} {selectedDetails.employee?.lastNameAr}</p>
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
