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
import { useDepartments, useDeleteDepartment } from "@/lib/hooks/use-departments";
import { DepartmentDialog } from "@/components/features/departments/department-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export default function DepartmentsPage() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);

  const { data, isLoading } = useDepartments({ search });
  const deleteDepartment = useDeleteDepartment();

  const departments = (data as any)?.data?.items || [];

  const handleEdit = (department: any) => {
    setSelectedDepartment(department);
    setDialogOpen(true);
  };

  const handleDelete = (department: any) => {
    setSelectedDepartment(department);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedDepartment) {
      await deleteDepartment.mutateAsync(selectedDepartment.id);
      setDeleteDialogOpen(false);
      setSelectedDepartment(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("departments.title")}
        description={t("departments.description")}
        actions={
          <Button onClick={() => { setSelectedDepartment(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 ml-2" />
            {t("departments.addDepartment")}
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("departments.searchPlaceholder")}
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
              <TableHead>{t("departments.fields.code")}</TableHead>
              <TableHead>{t("departments.fields.nameAr")}</TableHead>
              <TableHead>{t("departments.fields.nameEn")}</TableHead>
              <TableHead>{t("departments.fields.nameTr")}</TableHead>
              <TableHead>{t("departments.fields.parent")}</TableHead>
              <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                </TableRow>
              ))
            ) : departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              departments.map((department: any) => (
                <TableRow key={department.id}>
                  <TableCell className="font-medium">
                    <Badge variant="outline">{department.code}</Badge>
                  </TableCell>
                  <TableCell>{department.nameAr}</TableCell>
                  <TableCell>{department.nameEn}</TableCell>
                  <TableCell>{department.nameTr}</TableCell>
                  <TableCell>
                    {department.parent?.nameAr ? (
                      <span className="text-sm text-muted-foreground">
                        {department.parent.nameAr}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(department)}>
                          <Pencil className="h-4 w-4 ml-2" />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(department)}
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

      <DepartmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        department={selectedDepartment}
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
