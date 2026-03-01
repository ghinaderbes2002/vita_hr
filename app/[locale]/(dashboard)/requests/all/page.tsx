"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle, XCircle, MoreHorizontal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useRequests, useHrApproveRequest, useHrRejectRequest } from "@/lib/hooks/use-requests";
import { useEmployees } from "@/lib/hooks/use-employees";
import { RequestStatusBadge } from "@/components/features/requests/request-status-badge";
import { RequestActionDialog } from "@/components/features/requests/request-action-dialog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { Request, Employee } from "@/types";

const STATUS_OPTIONS = ["PENDING_MANAGER", "PENDING_HR", "APPROVED", "REJECTED", "CANCELLED", "DRAFT"];
const TYPE_OPTIONS = ["PERMISSION", "TRANSFER", "ADVANCE", "RESIGNATION", "JOB_CHANGE", "RIGHTS", "REWARD", "SPONSORSHIP", "OTHER"];

export default function AllRequestsPage() {
  const t = useTranslations();
  const { hasPermission, isAdmin } = usePermissions();
  const canApprove = isAdmin() || hasPermission("requests:hr-approve");
  const canReject = isAdmin() || hasPermission("requests:hr-reject");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Request | null>(null);

  const { data, isLoading } = useRequests({
    limit: 50,
    status: statusFilter === "all" ? undefined : statusFilter,
    type: typeFilter === "all" ? undefined : typeFilter,
  });
  const { data: empData } = useEmployees({ limit: 1000 });
  const hrApprove = useHrApproveRequest();
  const hrReject = useHrRejectRequest();

  const requests: Request[] = (data as any)?.data?.items || (data as any)?.data || [];
  const employees: Employee[] = (empData as any)?.data?.items || (empData as any)?.data || [];
  const employeeMap = Object.fromEntries(employees.map((e) => [e.id, e]));

  const handleApproveConfirm = async (notes: string) => {
    if (selected) {
      await hrApprove.mutateAsync({ id: selected.id, notes: notes || undefined });
      setApproveDialogOpen(false);
      setSelected(null);
    }
  };

  const handleRejectConfirm = async (notes: string) => {
    if (selected) {
      await hrReject.mutateAsync({ id: selected.id, notes });
      setRejectDialogOpen(false);
      setSelected(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("requests.allRequests")}
        description={t("requests.allRequestsDescription")}
      />

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("requests.filterByStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{t(`requests.statuses.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("requests.filterByType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {TYPE_OPTIONS.map((tp) => (
              <SelectItem key={tp} value={tp}>{t(`requests.types.${tp}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
                    {req.status === "PENDING_HR" && (canApprove || canReject) && (
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
        isLoading={hrApprove.isPending}
      />
      <RequestActionDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        action="reject"
        onConfirm={handleRejectConfirm}
        isLoading={hrReject.isPending}
      />
    </div>
  );
}
