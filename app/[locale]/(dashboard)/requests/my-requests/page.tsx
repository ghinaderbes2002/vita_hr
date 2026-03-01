"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Send, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useMyRequests, useSubmitRequest, useCancelRequest } from "@/lib/hooks/use-requests";
import { NewRequestDialog } from "@/components/features/requests/new-request-dialog";
import { RequestStatusBadge } from "@/components/features/requests/request-status-badge";
import { RequestActionDialog } from "@/components/features/requests/request-action-dialog";
import { Request } from "@/types";

export default function MyRequestsPage() {
  const t = useTranslations();
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Request | null>(null);

  const { data, isLoading } = useMyRequests();
  const submitRequest = useSubmitRequest();
  const cancelRequest = useCancelRequest();

  const requests: Request[] = Array.isArray(data)
    ? data
    : (data as any)?.data?.items || (data as any)?.data || [];

  const handleSubmit = async (req: Request) => {
    await submitRequest.mutateAsync(req.id);
  };

  const handleCancelConfirm = async (reason: string) => {
    if (selected) {
      await cancelRequest.mutateAsync({ id: selected.id, reason });
      setCancelDialogOpen(false);
      setSelected(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("requests.myRequests")}
        description={t("requests.myRequestsDescription")}
        actions={
          <Button onClick={() => setNewDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            {t("requests.newRequest")}
          </Button>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("requests.fields.requestNumber")}</TableHead>
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
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-sm">{req.requestNumber}</TableCell>
                  <TableCell>{t(`requests.types.${req.type}`)}</TableCell>
                  <TableCell className="max-w-48 truncate">{req.reason}</TableCell>
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
                        {req.status === "DRAFT" && (
                          <DropdownMenuItem onClick={() => handleSubmit(req)}>
                            <Send className="h-4 w-4 ml-2" />
                            {t("requests.actions.submit")}
                          </DropdownMenuItem>
                        )}
                        {(req.status === "DRAFT" || req.status === "PENDING_MANAGER") && (
                          <DropdownMenuItem
                            onClick={() => { setSelected(req); setCancelDialogOpen(true); }}
                            className="text-destructive"
                          >
                            <X className="h-4 w-4 ml-2" />
                            {t("requests.actions.cancel")}
                          </DropdownMenuItem>
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

      <NewRequestDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} />

      <RequestActionDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        action="cancel"
        onConfirm={handleCancelConfirm}
        isLoading={cancelRequest.isPending}
      />
    </div>
  );
}
