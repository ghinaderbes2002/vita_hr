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
      form.employee?.employeeNumber?.toLowerCase().includes(searchLower);

    if (activeTab === "all") return matchesSearch;
    return matchesSearch && form.status === activeTab;
  });

  const getStatusBadge = (status: EvaluationFormStatus) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      DRAFT: { label: t("myEvaluations.statuses.draft"), className: "bg-gray-100 text-gray-800" },
      SELF_EVALUATION: { label: t("myEvaluations.statuses.selfEvaluation"), className: "bg-blue-100 text-blue-800" },
      PENDING_SELF: { label: t("myEvaluations.statuses.pendingSelf"), className: "bg-blue-100 text-blue-800" },
      SELF_SUBMITTED: { label: t("myEvaluations.statuses.selfSubmitted"), className: "bg-blue-100 text-blue-800" },
      MANAGER_EVALUATION: { label: t("myEvaluations.statuses.managerEvaluation"), className: "bg-orange-100 text-orange-800" },
      MANAGER_SUBMITTED: { label: t("myEvaluations.statuses.managerSubmitted"), className: "bg-orange-100 text-orange-800" },
      HR_REVIEW: { label: t("myEvaluations.statuses.hrReview"), className: "bg-purple-100 text-purple-800" },
      GM_APPROVAL: { label: t("myEvaluations.statuses.gmApproval"), className: "bg-yellow-100 text-yellow-800" },
      COMPLETED: { label: t("myEvaluations.statuses.completed"), className: "bg-green-100 text-green-800" },
    };

    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const renderTable = (tableForms: EvaluationForm[]) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("allForms.fields.employee")}</TableHead>
            <TableHead>{t("allForms.fields.code")}</TableHead>
            <TableHead>{t("allForms.fields.period")}</TableHead>
            <TableHead>{t("allForms.fields.status")}</TableHead>
            <TableHead>{t("allForms.fields.employeeScore")}</TableHead>
            <TableHead>{t("allForms.fields.managerScore")}</TableHead>
            <TableHead>{t("allForms.fields.finalScore")}</TableHead>
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
                <TableCell>{form.employee?.employeeNumber}</TableCell>
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
        title={t("allForms.title")}
        description={t("allForms.description")}
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("allForms.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">{t("allForms.tabs.all")}</TabsTrigger>
          <TabsTrigger value="SELF_EVALUATION">{t("allForms.tabs.selfEvaluation")}</TabsTrigger>
          <TabsTrigger value="MANAGER_EVALUATION">{t("allForms.tabs.managerEvaluation")}</TabsTrigger>
          <TabsTrigger value="HR_REVIEW">{t("allForms.tabs.hrReview")}</TabsTrigger>
          <TabsTrigger value="GM_APPROVAL">{t("allForms.tabs.gmApproval")}</TabsTrigger>
          <TabsTrigger value="COMPLETED">{t("allForms.tabs.completed")}</TabsTrigger>
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
