"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, GitBranch, List } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useDepartments, useDepartmentTree, useDeleteDepartment } from "@/lib/hooks/use-departments";
import { DepartmentDialog } from "@/components/features/departments/department-dialog";
import { OrgChart } from "@/components/features/departments/org-chart";
import { Department } from "@/types";

export default function DepartmentsPage() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);

  const { data, isLoading } = useDepartments({ limit: 100, search });
  const { data: treeData, isLoading: treeLoading } = useDepartmentTree();
  const deleteDepartment = useDeleteDepartment();

  const allDepts: Department[] = Array.isArray(data)
    ? data
    : (data as any)?.data?.items || (data as any)?.data || [];

  const handleEdit = (dept: Department) => {
    setSelectedDept(dept);
    setDialogOpen(true);
  };

  const handleDelete = (dept: Department) => {
    setSelectedDept(dept);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedDept) {
      await deleteDepartment.mutateAsync(selectedDept.id);
      setDeleteDialogOpen(false);
      setSelectedDept(null);
    }
  };

  const treeNodes: Department[] = Array.isArray(treeData)
    ? treeData
    : (treeData as any)?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("departments.title")}
        description={t("departments.description")}
        actions={
          <Button onClick={() => { setSelectedDept(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 ml-2" />
            {t("departments.addDepartment")}
          </Button>
        }
      />

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            {t("departments.tabs.list")}
          </TabsTrigger>
          <TabsTrigger value="orgchart" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            {t("departments.tabs.orgChart")}
          </TabsTrigger>
        </TabsList>

        {/* List View */}
        <TabsContent value="list" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("departments.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("departments.fields.code")}</TableHead>
                  <TableHead>{t("departments.fields.nameAr")}</TableHead>
                  <TableHead>{t("departments.fields.nameEn")}</TableHead>
                  <TableHead>{t("departments.fields.parent")}</TableHead>
                  <TableHead>{t("departments.fields.manager")}</TableHead>
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
                ) : allDepts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {t("common.noData")}
                    </TableCell>
                  </TableRow>
                ) : (
                  allDepts.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.code}</TableCell>
                      <TableCell>{dept.nameAr}</TableCell>
                      <TableCell>{dept.nameEn}</TableCell>
                      <TableCell>{dept.parent?.nameAr || "—"}</TableCell>
                      <TableCell>
                        {dept.manager
                          ? `${dept.manager.firstNameAr} ${dept.manager.lastNameAr}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(dept)}>
                              <Pencil className="h-4 w-4 ml-2" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(dept)}
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
        </TabsContent>

        {/* Org Chart View */}
        <TabsContent value="orgchart">
          <div className="rounded-md border min-h-100">
            {treeLoading ? (
              <div className="flex items-center justify-center h-48">
                <Skeleton className="h-8 w-48" />
              </div>
            ) : (
              <OrgChart departments={treeNodes} />
            )}
          </div>
        </TabsContent>
      </Tabs>

      <DepartmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        department={selectedDept || undefined}
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
