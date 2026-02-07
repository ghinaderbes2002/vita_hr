"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Search, Eye } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllEvaluationForms } from "@/lib/hooks/use-evaluation-forms";
import { EvaluationForm, EvaluationFormStatus } from "@/lib/api/evaluation-forms";

export default function AllEvaluationFormsPage() {
  const t = useTranslations();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | EvaluationFormStatus>("all");
  const { data, isLoading } = useAllEvaluationForms();

  const forms = Array.isArray(data)
    ? data
    : (data as any)?.data?.items || (data as any)?.data || [];

  const filteredForms = forms.filter((form: EvaluationForm) => {
    // إذا ما في بحث، نتحقق بس من التاب
    if (!search) {
      if (activeTab === "all") return true;
      return form.status === activeTab;
    }

    const searchLower = search.toLowerCase();
    const matchesSearch =
      form.employee?.firstNameAr?.toLowerCase().includes(searchLower) ||
      form.employee?.lastNameAr?.toLowerCase().includes(searchLower) ||
      form.employee?.code?.toLowerCase().includes(searchLower);

    if (activeTab === "all") return matchesSearch;
    return matchesSearch && form.status === activeTab;
  });

  const getStatusBadge = (status: EvaluationFormStatus) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      DRAFT: { label: "مسودة", className: "bg-gray-100 text-gray-800" },
      SELF_EVALUATION: { label: "تقييم ذاتي", className: "bg-blue-100 text-blue-800" },
      PENDING_SELF: { label: "بانتظار التقييم الذاتي", className: "bg-blue-100 text-blue-800" },
      SELF_SUBMITTED: { label: "تم تقديم التقييم الذاتي", className: "bg-blue-100 text-blue-800" },
      MANAGER_EVALUATION: { label: "تقييم المدير", className: "bg-orange-100 text-orange-800" },
      MANAGER_SUBMITTED: { label: "تم تقديم تقييم المدير", className: "bg-orange-100 text-orange-800" },
      HR_REVIEW: { label: "مراجعة HR", className: "bg-purple-100 text-purple-800" },
      GM_APPROVAL: { label: "موافقة المدير العام", className: "bg-yellow-100 text-yellow-800" },
      COMPLETED: { label: "مكتمل", className: "bg-green-100 text-green-800" },
    };

    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const renderTable = (tableForms: EvaluationForm[]) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الموظف</TableHead>
            <TableHead>الكود</TableHead>
            <TableHead>الفترة</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>درجة الموظف</TableHead>
            <TableHead>درجة المدير</TableHead>
            <TableHead>الدرجة النهائية</TableHead>
            <TableHead className="w-[70px]">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
              </TableRow>
            ))
          ) : tableForms.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                {t("common.noData")}
              </TableCell>
            </TableRow>
          ) : (
            tableForms.map((form: EvaluationForm) => (
              <TableRow key={form.id}>
                <TableCell>
                  <div className="font-medium">
                    {form.employee?.firstNameAr} {form.employee?.lastNameAr}
                  </div>
                </TableCell>
                <TableCell>{form.employee?.code}</TableCell>
                <TableCell>{form.period?.nameAr}</TableCell>
                <TableCell>{getStatusBadge(form.status)}</TableCell>
                <TableCell>
                  {form.totalSelfScore ? form.totalSelfScore.toFixed(1) : "-"}
                </TableCell>
                <TableCell>
                  {form.totalManagerScore ? form.totalManagerScore.toFixed(1) : "-"}
                </TableCell>
                <TableCell className="font-bold">
                  {form.finalScore ? form.finalScore.toFixed(1) : "-"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push(`/evaluations/forms/${form.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
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
        title="جميع التقييمات"
        description="عرض جميع نماذج التقييم في النظام"
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث بالاسم أو الكود..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">الكل</TabsTrigger>
          <TabsTrigger value="SELF_EVALUATION">تقييم ذاتي</TabsTrigger>
          <TabsTrigger value="MANAGER_EVALUATION">تقييم المدير</TabsTrigger>
          <TabsTrigger value="HR_REVIEW">مراجعة HR</TabsTrigger>
          <TabsTrigger value="GM_APPROVAL">موافقة المدير العام</TabsTrigger>
          <TabsTrigger value="COMPLETED">مكتمل</TabsTrigger>
        </TabsList>

        <TabsContent value="all">{renderTable(filteredForms)}</TabsContent>
        <TabsContent value="SELF_EVALUATION">{renderTable(filteredForms)}</TabsContent>
        <TabsContent value="MANAGER_EVALUATION">{renderTable(filteredForms)}</TabsContent>
        <TabsContent value="HR_REVIEW">{renderTable(filteredForms)}</TabsContent>
        <TabsContent value="GM_APPROVAL">{renderTable(filteredForms)}</TabsContent>
        <TabsContent value="COMPLETED">{renderTable(filteredForms)}</TabsContent>
      </Tabs>
    </div>
  );
}
