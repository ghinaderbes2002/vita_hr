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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList } from "lucide-react";
import { useRequests, useApproveRequest, useRejectRequest } from "@/lib/hooks/use-requests";
import { RequestStatusBadge } from "@/components/features/requests/request-status-badge";
import { RequestActionDialog } from "@/components/features/requests/request-action-dialog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { Request } from "@/types";

const STATUS_OPTIONS = ["DRAFT", "PENDING_MANAGER", "PENDING_HR", "IN_APPROVAL", "APPROVED", "REJECTED", "CANCELLED"];
const TYPE_OPTIONS = ["TRANSFER", "RESIGNATION", "REWARD", "OTHER", "PENALTY_PROPOSAL", "OVERTIME_EMPLOYEE", "OVERTIME_MANAGER", "BUSINESS_MISSION", "DELEGATION", "HIRING_REQUEST", "COMPLAINT"];

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
  const hrApprove = useApproveRequest();
  const hrReject = useRejectRequest();

  const requests: Request[] = (data as any)?.data?.items || (data as any)?.data || [];

  const handleApproveConfirm = async (notes: string) => {
    if (selected) {
      await hrApprove.mutateAsync({ id: selected.id, notes: notes || undefined });
      setApproveDialogOpen(false);
      setSelected(null);
    }
  };

  const handleRejectConfirm = async (notes: string) => {
    if (selected) {
      await hrReject.mutateAsync({ id: selected.id, reason: notes });
      setRejectDialogOpen(false);
      setSelected(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("requests.allRequests")}
        description={t("requests.allRequestsDescription")}
        count={!isLoading ? requests.length : undefined}
      />

      <div className="filter-bar">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 bg-background">
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
          <SelectTrigger className="w-48 bg-background">
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
                <TableCell colSpan={7} className="p-0">
                  <EmptyState
                    icon={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
                    title={t("common.noData")}
                    description={statusFilter !== "all" || typeFilter !== "all" ? "جرب تغيير الفلاتر" : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-sm">{req.requestNumber}</TableCell>
                  <TableCell>
                    {req.employee
                      ? `${req.employee.firstNameAr} ${req.employee.lastNameAr}`
                      : "—"}
                  </TableCell>
                  <TableCell>{t(`requests.types.${req.type}`)}</TableCell>
                  <TableCell className="max-w-40 truncate">{req.reason}</TableCell>
                  <TableCell><RequestStatusBadge status={req.status} /></TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {(req.status === "PENDING_HR" || req.status === "IN_APPROVAL") && (canApprove || canReject) && (
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
