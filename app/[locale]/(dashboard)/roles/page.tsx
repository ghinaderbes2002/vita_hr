"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, MoreHorizontal, Pencil, Trash2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useRoles, useDeleteRole } from "@/lib/hooks/use-roles";
import { RoleDialog } from "@/components/features/roles/role-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export default function RolesPage() {
  const t = useTranslations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);

  const { data: roles, isLoading } = useRoles();
  const deleteRole = useDeleteRole();

  const handleEdit = (role: any) => {
    setSelectedRole(role);
    setDialogOpen(true);
  };

  const handleDelete = (role: any) => {
    setSelectedRole(role);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedRole) {
      await deleteRole.mutateAsync(selectedRole.id);
      setDeleteDialogOpen(false);
      setSelectedRole(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("roles.title")}
        description={t("roles.description")}
        actions={
          <Button onClick={() => { setSelectedRole(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 ml-2" />
            {t("roles.addRole")}
          </Button>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("roles.fields.name")}</TableHead>
              <TableHead>{t("roles.fields.displayNameAr")}</TableHead>
              <TableHead>{t("roles.fields.displayNameEn")}</TableHead>
              <TableHead>{t("roles.fields.description")}</TableHead>
              <TableHead>{t("roles.fields.permissions")}</TableHead>
              <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                </TableRow>
              ))
            ) : !roles || roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role: any) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">
                    <Badge variant="outline" className="gap-1">
                      <Shield className="h-3 w-3" />
                      {role.name}
                    </Badge>
                  </TableCell>
                  <TableCell>{role.displayNameAr}</TableCell>
                  <TableCell>{role.displayNameEn}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {role.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {role._count?.permissions || role.permissions?.length || 0} {t("roles.permissionsCount")}
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
                        <DropdownMenuItem onClick={() => handleEdit(role)}>
                          <Pencil className="h-4 w-4 ml-2" />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(role)}
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

      <RoleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        role={selectedRole}
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
