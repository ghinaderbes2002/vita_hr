"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, MoreHorizontal, Edit, Trash2, PlayCircle, StopCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useEvaluationPeriods,
  useCreateEvaluationPeriod,
  useUpdateEvaluationPeriod,
  useOpenEvaluationPeriod,
  useCloseEvaluationPeriod,
  useDeleteEvaluationPeriod,
  useGenerateEvaluationForms,
} from "@/lib/hooks/use-evaluation-periods";
import { EvaluationPeriod, PeriodStatus } from "@/lib/api/evaluation-periods";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function EvaluationPeriodsPage() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<EvaluationPeriod | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    nameAr: "",
    nameEn: "",
    startDate: "",
    endDate: "",
  });

  const { data, isLoading } = useEvaluationPeriods();
  const createPeriod = useCreateEvaluationPeriod();
  const updatePeriod = useUpdateEvaluationPeriod();
  const openPeriod = useOpenEvaluationPeriod();
  const closePeriod = useCloseEvaluationPeriod();
  const deletePeriod = useDeleteEvaluationPeriod();
  const generateForms = useGenerateEvaluationForms();

  const periods = Array.isArray(data)
    ? data
    : (data as any)?.data?.items || (data as any)?.data || [];

  const filteredPeriods = periods.filter((period: EvaluationPeriod) => {
    const searchLower = search.toLowerCase();
    return (
      period.code?.toLowerCase().includes(searchLower) ||
      period.nameAr?.toLowerCase().includes(searchLower) ||
      period.nameEn?.toLowerCase().includes(searchLower)
    );
  });

  const handleCreate = () => {
    setSelectedPeriod(null);
    setFormData({
      code: "",
      nameAr: "",
      nameEn: "",
      startDate: "",
      endDate: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (period: EvaluationPeriod) => {
    setSelectedPeriod(period);
    setFormData({
      code: period.code,
      nameAr: period.nameAr,
      nameEn: period.nameEn,
      startDate: period.startDate.split("T")[0],
      endDate: period.endDate.split("T")[0],
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (selectedPeriod) {
      await updatePeriod.mutateAsync({
        id: selectedPeriod.id,
        data: {
          nameAr: formData.nameAr,
          nameEn: formData.nameEn,
          startDate: formData.startDate,
          endDate: formData.endDate,
        },
      });
    } else {
      await createPeriod.mutateAsync(formData);
    }
    setDialogOpen(false);
  };

  const handleDelete = (period: EvaluationPeriod) => {
    setSelectedPeriod(period);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedPeriod) {
      await deletePeriod.mutateAsync(selectedPeriod.id);
      setDeleteDialogOpen(false);
      setSelectedPeriod(null);
    }
  };

  const handleOpen = async (period: EvaluationPeriod) => {
    await openPeriod.mutateAsync(period.id);
  };

  const handleClose = async (period: EvaluationPeriod) => {
    await closePeriod.mutateAsync(period.id);
  };

  const handleGenerateForms = async (period: EvaluationPeriod) => {
    // Generate forms for all employees (empty array means all)
    await generateForms.mutateAsync({
      id: period.id,
      data: { employeeIds: [] }
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ar });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: PeriodStatus) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="secondary">{t("evaluationPeriods.statuses.draft")}</Badge>;
      case "OPEN":
        return <Badge className="bg-green-100 text-green-800">{t("evaluationPeriods.statuses.open")}</Badge>;
      case "CLOSED":
        return <Badge variant="destructive">{t("evaluationPeriods.statuses.closed")}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("evaluationPeriods.title")}
        description={t("evaluationPeriods.description")}
        actions={
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 ml-2" />
            {t("evaluationPeriods.addPeriod")}
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("evaluationPeriods.searchPlaceholder")}
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
              <TableHead>{t("evaluationPeriods.fields.code")}</TableHead>
              <TableHead>{t("evaluationPeriods.fields.nameAr")}</TableHead>
              <TableHead>{t("evaluationPeriods.fields.startDate")}</TableHead>
              <TableHead>{t("evaluationPeriods.fields.endDate")}</TableHead>
              <TableHead>{t("evaluationPeriods.fields.status")}</TableHead>
              <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                </TableRow>
              ))
            ) : filteredPeriods.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              filteredPeriods.map((period: EvaluationPeriod) => (
                <TableRow key={period.id}>
                  <TableCell className="font-medium">{period.code}</TableCell>
                  <TableCell>{period.nameAr}</TableCell>
                  <TableCell>{formatDate(period.startDate)}</TableCell>
                  <TableCell>{formatDate(period.endDate)}</TableCell>
                  <TableCell>{getStatusBadge(period.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(period)}>
                          <Edit className="h-4 w-4 ml-2" />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        {period.status === "DRAFT" && (
                          <DropdownMenuItem onClick={() => handleOpen(period)}>
                            <PlayCircle className="h-4 w-4 ml-2" />
                            {t("evaluationPeriods.openPeriod")}
                          </DropdownMenuItem>
                        )}
                        {(period.status === "DRAFT" || period.status === "OPEN") && (
                          <DropdownMenuItem onClick={() => handleGenerateForms(period)}>
                            <FileText className="h-4 w-4 ml-2" />
                            {t("evaluationPeriods.generateForms")}
                          </DropdownMenuItem>
                        )}
                        {period.status === "OPEN" && (
                          <DropdownMenuItem onClick={() => handleClose(period)}>
                            <StopCircle className="h-4 w-4 ml-2" />
                            {t("evaluationPeriods.closePeriod")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(period)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedPeriod ? t("evaluationPeriods.editPeriod") : t("evaluationPeriods.createPeriod")}
            </DialogTitle>
            <DialogDescription>
              {selectedPeriod
                ? t("evaluationPeriods.editDescription")
                : t("evaluationPeriods.createDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("evaluationPeriods.fields.code")}</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder={t("evaluationPeriods.placeholders.code")}
                disabled={!!selectedPeriod}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("evaluationPeriods.fields.nameAr")}</Label>
              <Input
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                placeholder={t("evaluationPeriods.placeholders.nameAr")}
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("evaluationPeriods.fields.nameEn")}</Label>
              <Input
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                placeholder={t("evaluationPeriods.placeholders.nameEn")}
                dir="ltr"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("evaluationPeriods.fields.startDate")}</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("evaluationPeriods.fields.endDate")}</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.code ||
                !formData.nameAr ||
                !formData.nameEn ||
                !formData.startDate ||
                !formData.endDate ||
                createPeriod.isPending ||
                updatePeriod.isPending
              }
            >
              {createPeriod.isPending || updatePeriod.isPending
                ? t("evaluationPeriods.saving")
                : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
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
