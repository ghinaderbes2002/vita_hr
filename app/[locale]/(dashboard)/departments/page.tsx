"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, GitBranch, List, Upload, Trash, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Pagination } from "@/components/shared/pagination";
import { useDepartments, useDepartmentTree, useDeleteDepartment } from "@/lib/hooks/use-departments";
import { useJobGrades } from "@/lib/hooks/use-job-grades";
import { DepartmentDialog } from "@/components/features/departments/department-dialog";
import { OrgChart } from "@/components/features/departments/org-chart";
import { Department } from "@/types";

const STORAGE_KEY = "dept_grade_map";
const ORG_DOC_KEY = "org_chart_document";

function loadMap(): Record<string, string> {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : {};
  } catch { return {}; }
}

export default function DepartmentsPage() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [deptGradeMap, setDeptGradeMap] = useState<Record<string, string>>({});

  // Load map from localStorage once on mount
  useEffect(() => {
    setDeptGradeMap(loadMap());
  }, []);

  const LIMIT = 10;
  const { data, isLoading } = useDepartments({ page, limit: LIMIT, search });
  const { data: treeData, isLoading: treeLoading } = useDepartmentTree();
  const { data: allDeptsData } = useDepartments({ page: 1, limit: 500 });
  const { data: gradesData } = useJobGrades();
  const deleteDepartment = useDeleteDepartment();

  const allDepartmentsRaw: Department[] = Array.isArray(allDeptsData)
    ? allDeptsData
    : (allDeptsData as any)?.data?.items || (allDeptsData as any)?.data || [];

  const allGrades: any[] = Array.isArray(gradesData)
    ? gradesData
    : (gradesData as any)?.data?.items || (gradesData as any)?.data || [];

  // Merge grade mapping into department objects
  // Priority: 1) grade already populated by API  2) localStorage map  3) dept.gradeId from API
  const allDepartmentsFlat: Department[] = useMemo(() => {
    return allDepartmentsRaw.map((dept) => {
      // If the API already returned the grade object, use it directly
      if (dept.grade) return dept;
      const gradeId = deptGradeMap[dept.id] || dept.gradeId;
      if (!gradeId) return dept;
      const grade = allGrades.find((g) => g.id === gradeId);
      return grade ? { ...dept, gradeId, grade } : dept;
    });
  }, [allDepartmentsRaw, allGrades, deptGradeMap]);

  // Called by dialog after saving grade mapping
  const handleGradeMapped = (deptId: string, gradeId: string) => {
    setDeptGradeMap((prev) => {
      const next = { ...prev };
      if (gradeId) { next[deptId] = gradeId; } else { delete next[deptId]; }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const allDepts: Department[] = Array.isArray(data)
    ? data
    : (data as any)?.data?.items || (data as any)?.data || [];
  const responseData = (data as any)?.data;
  const rawMeta = (data as any)?.meta || responseData?.meta;
  const total = rawMeta?.total ?? responseData?.total ?? 0;
  const totalPages = rawMeta?.totalPages ?? responseData?.totalPages ?? Math.ceil(total / LIMIT);
  const meta = total > 0 ? { total, totalPages } : null;

  const handleEdit = (dept: Department) => {
    setSelectedDept(dept);
    setDialogOpen(true);
  };

  const [deleteDocOpen, setDeleteDocOpen] = useState(false);
  const [orgDoc, setOrgDoc] = useState<{ url: string; name: string; type: string } | null>(() => {
    try { const s = localStorage.getItem(ORG_DOC_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [docUploading, setDocUploading] = useState(false);

  const handleOrgDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setDocUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { fileUrl, fileName } = await res.json();
      const doc = { url: fileUrl, name: fileName || file.name, type: file.type };
      setOrgDoc(doc);
      localStorage.setItem(ORG_DOC_KEY, JSON.stringify(doc));
    } catch {
      alert("فشل رفع الملف");
    } finally {
      setDocUploading(false);
    }
  };

  const removeOrgDoc = () => {
    setOrgDoc(null);
    localStorage.removeItem(ORG_DOC_KEY);
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

  // gradeId: prefer API value, fall back to localStorage
  const selectedDeptWithGrade = selectedDept
    ? { ...selectedDept, gradeId: selectedDept.gradeId || deptGradeMap[selectedDept.id] || "" }
    : null;

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
          <TabsTrigger value="orgdoc" className="flex items-center gap-2">
            <FileImage className="h-4 w-4" />
            وثيقة الهيكل
          </TabsTrigger>
        </TabsList>

        {/* List View */}
        <TabsContent value="list" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("departments.searchPlaceholder")}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
                    <TableCell colSpan={6} className="h-24 text-center">{t("common.noData")}</TableCell>
                  </TableRow>
                ) : (
                  allDepts.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.code}</TableCell>
                      <TableCell>{dept.nameAr}</TableCell>
                      <TableCell>{dept.nameEn}</TableCell>
                      <TableCell>{dept.parent?.nameAr || "—"}</TableCell>
                      <TableCell>
                        {dept.manager ? `${dept.manager.firstNameAr} ${dept.manager.lastNameAr}` : "—"}
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
                            <DropdownMenuItem onClick={() => handleDelete(dept)} className="text-destructive">
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

          {meta && (
            <Pagination
              page={page}
              totalPages={meta.totalPages}
              total={meta.total}
              limit={LIMIT}
              onPageChange={setPage}
            />
          )}
        </TabsContent>

        {/* Org Document Upload */}
        <TabsContent value="orgdoc">
          <div className="rounded-md border min-h-100 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <p className="text-sm font-medium">وثيقة الهيكل التنظيمي (صورة أو PDF)</p>
              <div className="flex items-center gap-2">
                {orgDoc && (
                  <button
                    type="button"
                    onClick={() => setDeleteDocOpen(true)}
                    className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 border border-destructive/30 rounded px-2 py-1"
                  >
                    <Trash className="h-3.5 w-3.5" />
                    حذف
                  </button>
                )}
                <label className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded px-3 py-1.5 cursor-pointer transition-colors">
                  {docUploading ? (
                    <span className="animate-pulse">جاري الرفع...</span>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      {orgDoc ? "تغيير الوثيقة" : "رفع وثيقة"}
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    disabled={docUploading}
                    onChange={handleOrgDocUpload}
                  />
                </label>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-6">
              {!orgDoc ? (
                <div className="text-center space-y-3 text-muted-foreground">
                  <FileImage className="h-12 w-12 mx-auto opacity-30" />
                  <p className="text-sm">لا توجد وثيقة مرفوعة</p>
                  <p className="text-xs">ارفع صورة أو ملف PDF للهيكل التنظيمي</p>
                </div>
              ) : orgDoc.type === "application/pdf" ? (
                <iframe
                  src={orgDoc.url}
                  className="w-full h-[70vh] rounded border"
                  title="وثيقة الهيكل التنظيمي"
                />
              ) : (
                <img
                  src={orgDoc.url}
                  alt="وثيقة الهيكل التنظيمي"
                  className="max-w-full max-h-[70vh] object-contain rounded border"
                />
              )}
            </div>
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
              <OrgChart departments={treeNodes} allDepartments={allDepartmentsFlat} />
            )}
          </div>
        </TabsContent>
      </Tabs>

      <DepartmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        department={selectedDeptWithGrade || undefined}
        onGradeMapped={handleGradeMapped}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("messages.confirmDelete")}
        description={t("messages.actionCantUndo")}
        onConfirm={confirmDelete}
        variant="destructive"
      />

      <ConfirmDialog
        open={deleteDocOpen}
        onOpenChange={setDeleteDocOpen}
        title="حذف وثيقة الهيكل التنظيمي"
        description="هل أنت متأكد من حذف الوثيقة؟ لا يمكن التراجع عن هذا الإجراء."
        onConfirm={removeOrgDoc}
        variant="destructive"
      />
    </div>
  );
}
