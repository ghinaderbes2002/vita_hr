"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, MoreHorizontal, Edit, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useEvaluationCriteria,
  useCreateEvaluationCriteria,
  useUpdateEvaluationCriteria,
  useDeleteEvaluationCriteria,
} from "@/lib/hooks/use-evaluation-criteria";
import { EvaluationCriteria, CriteriaCategory } from "@/lib/api/evaluation-criteria";

export default function EvaluationCriteriaPage() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | CriteriaCategory>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCriteria, setSelectedCriteria] = useState<EvaluationCriteria | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    nameAr: "",
    nameEn: "",
    descriptionAr: "",
    weight: 1,
    maxScore: 5,
    category: "PERFORMANCE" as CriteriaCategory,
  });

  const queryParams = activeTab === "all" ? {} : { category: activeTab };
  const { data, isLoading } = useEvaluationCriteria(queryParams);
  const createCriteria = useCreateEvaluationCriteria();
  const updateCriteria = useUpdateEvaluationCriteria();
  const deleteCriteria = useDeleteEvaluationCriteria();

  const criteria = Array.isArray(data)
    ? data
    : (data as any)?.data?.items || (data as any)?.data || [];

  const filteredCriteria = criteria.filter((c: EvaluationCriteria) => {
    const searchLower = search.toLowerCase();
    return (
      c.code?.toLowerCase().includes(searchLower) ||
      c.nameAr?.toLowerCase().includes(searchLower) ||
      c.nameEn?.toLowerCase().includes(searchLower)
    );
  });

  const handleCreate = () => {
    setSelectedCriteria(null);
    setFormData({
      code: "",
      nameAr: "",
      nameEn: "",
      descriptionAr: "",
      weight: 1,
      maxScore: 5,
      category: "PERFORMANCE",
    });
    setDialogOpen(true);
  };

  const handleEdit = (criteria: EvaluationCriteria) => {
    setSelectedCriteria(criteria);
    setFormData({
      code: criteria.code,
      nameAr: criteria.nameAr,
      nameEn: criteria.nameEn,
      descriptionAr: criteria.descriptionAr || "",
      weight: criteria.weight,
      maxScore: criteria.maxScore,
      category: criteria.category,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (selectedCriteria) {
      await updateCriteria.mutateAsync({
        id: selectedCriteria.id,
        data: {
          nameAr: formData.nameAr,
          nameEn: formData.nameEn,
          descriptionAr: formData.descriptionAr,
          weight: formData.weight,
          maxScore: formData.maxScore,
          category: formData.category,
        },
      });
    } else {
      await createCriteria.mutateAsync(formData);
    }
    setDialogOpen(false);
  };

  const handleDelete = (criteria: EvaluationCriteria) => {
    setSelectedCriteria(criteria);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedCriteria) {
      await deleteCriteria.mutateAsync(selectedCriteria.id);
      setDeleteDialogOpen(false);
      setSelectedCriteria(null);
    }
  };

  const getCategoryBadge = (category: CriteriaCategory) => {
    const labels = {
      PERFORMANCE: "الأداء",
      SKILLS: "المهارات",
      BEHAVIOR: "السلوك",
      GOALS: "الأهداف",
    };
    return <Badge variant="outline">{labels[category]}</Badge>;
  };

  const renderTable = (tableCriteria: EvaluationCriteria[]) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الكود</TableHead>
            <TableHead>الاسم (عربي)</TableHead>
            <TableHead>الفئة</TableHead>
            <TableHead>الوزن</TableHead>
            <TableHead>الدرجة القصوى</TableHead>
            <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
              </TableRow>
            ))
          ) : tableCriteria.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                {t("common.noData")}
              </TableCell>
            </TableRow>
          ) : (
            tableCriteria.map((c: EvaluationCriteria) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.code}</TableCell>
                <TableCell>{c.nameAr}</TableCell>
                <TableCell>{getCategoryBadge(c.category)}</TableCell>
                <TableCell>{c.weight}</TableCell>
                <TableCell>{c.maxScore}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(c)}>
                        <Edit className="h-4 w-4 ml-2" />
                        {t("common.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(c)}
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
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="معايير التقييم"
        description="إدارة معايير تقييم الأداء والمهارات"
        actions={
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة معيار
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث بالكود أو الاسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">الكل</TabsTrigger>
          <TabsTrigger value="PERFORMANCE">الأداء</TabsTrigger>
          <TabsTrigger value="SKILLS">المهارات</TabsTrigger>
          <TabsTrigger value="BEHAVIOR">السلوك</TabsTrigger>
          <TabsTrigger value="GOALS">الأهداف</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {renderTable(filteredCriteria)}
        </TabsContent>

        <TabsContent value="PERFORMANCE">
          {renderTable(filteredCriteria.filter((c: EvaluationCriteria) => c.category === "PERFORMANCE"))}
        </TabsContent>

        <TabsContent value="SKILLS">
          {renderTable(filteredCriteria.filter((c: EvaluationCriteria) => c.category === "SKILLS"))}
        </TabsContent>

        <TabsContent value="BEHAVIOR">
          {renderTable(filteredCriteria.filter((c: EvaluationCriteria) => c.category === "BEHAVIOR"))}
        </TabsContent>

        <TabsContent value="GOALS">
          {renderTable(filteredCriteria.filter((c: EvaluationCriteria) => c.category === "GOALS"))}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedCriteria ? "تعديل المعيار" : "إضافة معيار جديد"}
            </DialogTitle>
            <DialogDescription>
              {selectedCriteria
                ? "تعديل بيانات معيار التقييم"
                : "إضافة معيار تقييم جديد"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الكود</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="PERF001"
                disabled={!!selectedCriteria}
              />
            </div>
            <div className="space-y-2">
              <Label>الاسم (عربي)</Label>
              <Input
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                placeholder="جودة العمل"
              />
            </div>
            <div className="space-y-2">
              <Label>الاسم (إنجليزي)</Label>
              <Input
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                placeholder="Work Quality"
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف (عربي)</Label>
              <Textarea
                value={formData.descriptionAr}
                onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                placeholder="مستوى جودة الأعمال المنجزة"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الوزن</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>الدرجة القصوى</Label>
                <Input
                  type="number"
                  value={formData.maxScore}
                  onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>الفئة</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v as CriteriaCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERFORMANCE">الأداء</SelectItem>
                  <SelectItem value="SKILLS">المهارات</SelectItem>
                  <SelectItem value="BEHAVIOR">السلوك</SelectItem>
                  <SelectItem value="GOALS">الأهداف</SelectItem>
                </SelectContent>
              </Select>
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
                createCriteria.isPending ||
                updateCriteria.isPending
              }
            >
              {createCriteria.isPending || updateCriteria.isPending
                ? "جاري الحفظ..."
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
