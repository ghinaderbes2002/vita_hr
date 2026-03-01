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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useJobTitles, useDeleteJobTitle } from "@/lib/hooks/use-job-titles";
import { JobTitleDialog } from "@/components/features/job-titles/job-title-dialog";
import { JobTitle } from "@/types";

export default function JobTitlesPage() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState<JobTitle | null>(null);

  const { data, isLoading } = useJobTitles();
  const deleteJobTitle = useDeleteJobTitle();

  const allTitles: JobTitle[] = Array.isArray(data)
    ? data
    : (data as any)?.data?.items || (data as any)?.data || [];

  const titles = allTitles.filter(
    (t) =>
      !search ||
      t.nameAr?.toLowerCase().includes(search.toLowerCase()) ||
      t.nameEn?.toLowerCase().includes(search.toLowerCase()) ||
      t.code?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (title: JobTitle) => {
    setSelectedTitle(title);
    setDialogOpen(true);
  };

  const handleDelete = (title: JobTitle) => {
    setSelectedTitle(title);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedTitle) {
      await deleteJobTitle.mutateAsync(selectedTitle.id);
      setDeleteDialogOpen(false);
      setSelectedTitle(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("jobTitles.title")}
        description={t("jobTitles.description")}
        actions={
          <Button onClick={() => { setSelectedTitle(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 ml-2" />
            {t("jobTitles.addTitle")}
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("jobTitles.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("jobTitles.fields.code")}</TableHead>
              <TableHead>{t("jobTitles.fields.nameAr")}</TableHead>
              <TableHead>{t("jobTitles.fields.nameEn")}</TableHead>
              <TableHead>{t("jobTitles.fields.grade")}</TableHead>
              <TableHead>{t("jobTitles.fields.description")}</TableHead>
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
            ) : titles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              titles.map((title) => (
                <TableRow key={title.id}>
                  <TableCell className="font-medium">{title.code}</TableCell>
                  <TableCell>{title.nameAr}</TableCell>
                  <TableCell>{title.nameEn}</TableCell>
                  <TableCell>
                    {title.grade ? (
                      <Badge variant="outline">{title.grade.nameAr}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="max-w-48 truncate text-muted-foreground">
                    {title.description || "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(title)}>
                          <Pencil className="h-4 w-4 ml-2" />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(title)}
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

      <JobTitleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        jobTitle={selectedTitle || undefined}
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
