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
import { useJobGrades, useDeleteJobGrade } from "@/lib/hooks/use-job-grades";
import { JobGradeDialog } from "@/components/features/job-grades/job-grade-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { JobGrade } from "@/lib/api/job-grades";

export default function JobGradesPage() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<JobGrade | null>(null);

  const { data, isLoading } = useJobGrades();
  const deleteJobGrade = useDeleteJobGrade();

  const allGrades: JobGrade[] = Array.isArray(data)
    ? data
    : (data as any)?.data?.items || (data as any)?.data || [];

  const grades = allGrades.filter((g) =>
    !search ||
    g.nameAr?.toLowerCase().includes(search.toLowerCase()) ||
    g.nameEn?.toLowerCase().includes(search.toLowerCase()) ||
    g.code?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (grade: JobGrade) => {
    setSelectedGrade(grade);
    setDialogOpen(true);
  };

  const handleDelete = (grade: JobGrade) => {
    setSelectedGrade(grade);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedGrade) {
      await deleteJobGrade.mutateAsync(selectedGrade.id);
      setDeleteDialogOpen(false);
      setSelectedGrade(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("jobGrades.title")}
        description={t("jobGrades.description")}
        actions={
          <Button onClick={() => { setSelectedGrade(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 ml-2" />
            {t("jobGrades.addGrade")}
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("jobGrades.searchPlaceholder")}
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
              <TableHead>{t("jobGrades.fields.code")}</TableHead>
              <TableHead>{t("jobGrades.fields.nameAr")}</TableHead>
              <TableHead>{t("jobGrades.fields.nameEn")}</TableHead>
              <TableHead>{t("jobGrades.fields.minSalary")}</TableHead>
              <TableHead>{t("jobGrades.fields.maxSalary")}</TableHead>
              <TableHead>{t("jobGrades.fields.isActive")}</TableHead>
              <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                </TableRow>
              ))
            ) : grades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              grades.map((grade) => (
                <TableRow key={grade.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {grade.color && (
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: grade.color }}
                        />
                      )}
                      <span className="font-medium">{grade.code}</span>
                    </div>
                  </TableCell>
                  <TableCell>{grade.nameAr}</TableCell>
                  <TableCell>{grade.nameEn}</TableCell>
                  <TableCell>{Number(grade.minSalary).toLocaleString()}</TableCell>
                  <TableCell>{Number(grade.maxSalary).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={grade.isActive ? "default" : "secondary"}>
                      {grade.isActive ? t("common.yes") : t("common.no")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(grade)}>
                          <Pencil className="h-4 w-4 ml-2" />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(grade)}
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

      <JobGradeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        jobGrade={selectedGrade || undefined}
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
