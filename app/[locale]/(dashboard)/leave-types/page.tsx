"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeaveTypes, useDeleteLeaveType } from "@/lib/hooks/use-leave-types";
import { LeaveTypeDialog } from "@/components/features/leave-types/leave-type-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { LeaveType } from "@/types";

export default function LeaveTypesPage() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);

  const { data, isLoading } = useLeaveTypes({ search });
  const deleteLeaveType = useDeleteLeaveType();

  // Debug: log API response
  console.log("Leave Types API response:", data);

  // API returns array directly
  const leaveTypes = Array.isArray(data) ? data : [];

  const handleEdit = (leaveType: LeaveType) => {
    setSelectedLeaveType(leaveType);
    setDialogOpen(true);
  };

  const handleDelete = (leaveType: LeaveType) => {
    setSelectedLeaveType(leaveType);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedLeaveType) {
      await deleteLeaveType.mutateAsync(selectedLeaveType.id);
      setDeleteDialogOpen(false);
      setSelectedLeaveType(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("leaveTypes.title")}
        description={t("leaveTypes.description")}
        actions={
          <Button onClick={() => { setSelectedLeaveType(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 ml-2" />
            {t("leaveTypes.addLeaveType")}
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("leaveTypes.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("leaveTypes.fields.code")}</TableHead>
              <TableHead>{t("leaveTypes.fields.nameAr")}</TableHead>
              <TableHead>{t("leaveTypes.fields.nameEn")}</TableHead>
              <TableHead>{t("leaveTypes.fields.defaultDays")}</TableHead>
              <TableHead>{t("leaveTypes.fields.isPaid")}</TableHead>
              <TableHead>{t("leaveTypes.fields.requiresApproval")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                </TableRow>
              ))
            ) : leaveTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              leaveTypes.map((leaveType: LeaveType) => (
                <TableRow key={leaveType.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {leaveType.color && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: leaveType.color }}
                        />
                      )}
                      <span className="font-medium">{leaveType.code}</span>
                    </div>
                  </TableCell>
                  <TableCell>{leaveType.nameAr}</TableCell>
                  <TableCell>{leaveType.nameEn}</TableCell>
                  <TableCell>{leaveType.defaultDays} {t("leaveTypes.days")}</TableCell>
                  <TableCell>
                    <Badge variant={leaveType.isPaid ? "default" : "secondary"}>
                      {leaveType.isPaid ? t("common.yes") : t("common.no")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={leaveType.requiresApproval ? "default" : "secondary"}>
                      {leaveType.requiresApproval ? t("common.yes") : t("common.no")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={leaveType.isActive !== false ? "default" : "secondary"}>
                      {leaveType.isActive !== false ? t("leaveTypes.active") : t("leaveTypes.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(leaveType)}>
                          <Pencil className="h-4 w-4 ml-2" />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(leaveType)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 ml-2" />
                          {t("common.delete")}
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

      <LeaveTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        leaveType={selectedLeaveType || undefined}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("messages.confirmDelete")}
        description={t("messages.actionCantUndo")}
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}
