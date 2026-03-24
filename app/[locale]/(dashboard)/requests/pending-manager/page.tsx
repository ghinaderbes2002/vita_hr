"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, MoreHorizontal, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { usePendingMyApproval, useApproveRequest, useRejectRequest } from "@/lib/hooks/use-requests";
import { RequestStatusBadge } from "@/components/features/requests/request-status-badge";
import { RequestActionDialog } from "@/components/features/requests/request-action-dialog";
import { Request } from "@/types";

export default function PendingManagerPage() {
  const t = useTranslations();
  const router = useRouter();
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Request | null>(null);

  const { data, isLoading } = usePendingMyApproval({ limit: 50 });
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();

  const requests: Request[] = (data as any)?.data?.items || (data as any)?.data || [];

  const handleApproveConfirm = async (notes: string) => {
    if (selected) {
      await approveRequest.mutateAsync({ id: selected.id, notes: notes || undefined });
      setApproveDialogOpen(false);
      setSelected(null);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (selected) {
      await rejectRequest.mutateAsync({ id: selected.id, reason });
      setRejectDialogOpen(false);
      setSelected(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("requests.pendingManagerApproval")}
        description={t("requests.pendingManagerDescription") || "الطلبات التي تنتظر موافقتك"}
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
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/requests/${req.id}`)}>
                          <Eye className="h-4 w-4 ml-2" />
                          {t("common.view")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => { setSelected(req); setApproveDialogOpen(true); }}
                        >
                          <CheckCircle className="h-4 w-4 ml-2 text-green-600" />
                          {t("requests.actions.approve")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => { setSelected(req); setRejectDialogOpen(true); }}
                          className="text-destructive"
                        >
                          <XCircle className="h-4 w-4 ml-2" />
                          {t("requests.actions.reject")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
        isLoading={approveRequest.isPending}
      />
      <RequestActionDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        action="reject"
        onConfirm={handleRejectConfirm}
        isLoading={rejectRequest.isPending}
      />
    </div>
  );
}
