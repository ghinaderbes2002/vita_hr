"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, XCircle, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useRequests, useManagerApproveRequest, useManagerRejectRequest } from "@/lib/hooks/use-requests";
import { useEmployees } from "@/lib/hooks/use-employees";
import { RequestStatusBadge } from "@/components/features/requests/request-status-badge";
import { RequestActionDialog } from "@/components/features/requests/request-action-dialog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { Request, Employee } from "@/types";

export default function PendingManagerPage() {
  const t = useTranslations();
  const { hasPermission, isAdmin } = usePermissions();
  const canApprove = isAdmin() || hasPermission("requests:manager-approve");
  const canReject = isAdmin() || hasPermission("requests:manager-reject");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Request | null>(null);

  const { data, isLoading } = useRequests({ status: "PENDING_MANAGER", limit: 50 });
  const { data: empData } = useEmployees({ limit: 1000 });
  const managerApprove = useManagerApproveRequest();
  const managerReject = useManagerRejectRequest();

  const requests: Request[] = (data as any)?.data?.items || (data as any)?.data || [];
  const employees: Employee[] = (empData as any)?.data?.items || (empData as any)?.data || [];
  const employeeMap = Object.fromEntries(employees.map((e) => [e.id, e]));

  const handleApproveConfirm = async (notes: string) => {
    if (selected) {
      await managerApprove.mutateAsync({ id: selected.id, notes: notes || undefined });
      setApproveDialogOpen(false);
      setSelected(null);
    }
  };

  const handleRejectConfirm = async (notes: string) => {
    if (selected) {
      await managerReject.mutateAsync({ id: selected.id, notes });
      setRejectDialogOpen(false);
      setSelected(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("requests.pendingManagerApproval")}
        description={t("requests.pendingManagerDescription")}
      />

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
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-sm">{req.requestNumber}</TableCell>
                  <TableCell>
                    {(() => {
                      const emp = req.employee || employeeMap[req.employeeId];
                      return emp ? `${emp.firstNameAr} ${emp.lastNameAr}` : "—";
                    })()}
                  </TableCell>
                  <TableCell>{t(`requests.types.${req.type}`)}</TableCell>
                  <TableCell className="max-w-40 truncate">{req.reason}</TableCell>
                  <TableCell><RequestStatusBadge status={req.status} /></TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {(canApprove || canReject) && (
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canApprove && (
                            <DropdownMenuItem
                              onClick={() => { setSelected(req); setApproveDialogOpen(true); }}
                            >
                              <CheckCircle className="h-4 w-4 ml-2 text-green-600" />
                              {t("requests.actions.approve")}
                            </DropdownMenuItem>
                          )}
                          {canReject && (
                            <DropdownMenuItem
                              onClick={() => { setSelected(req); setRejectDialogOpen(true); }}
                              className="text-destructive"
                            >
                              <XCircle className="h-4 w-4 ml-2" />
                              {t("requests.actions.reject")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <RequestActionDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        action="approve"
        onConfirm={handleApproveConfirm}
        isLoading={managerApprove.isPending}
      />
      <RequestActionDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        action="reject"
        onConfirm={handleRejectConfirm}
        isLoading={managerReject.isPending}
      />
    </div>
  );
}
