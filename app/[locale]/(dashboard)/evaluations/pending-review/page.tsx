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
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { usePendingMyReview } from "@/lib/hooks/use-evaluation-forms";
import { EvaluationForm, EvaluationFormStatus } from "@/lib/api/evaluation-forms";

export default function PendingReviewPage() {
  const t = useTranslations();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data, isLoading } = usePendingMyReview();

  const forms = Array.isArray(data)
    ? data
    : (data as any)?.data?.items || (data as any)?.data || [];

  const filteredForms = forms.filter((form: EvaluationForm) => {
    const searchLower = search.toLowerCase();
    return (
      form.employee?.firstNameAr?.toLowerCase().includes(searchLower) ||
      form.employee?.lastNameAr?.toLowerCase().includes(searchLower) ||
      form.employee?.employeeNumber?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: EvaluationFormStatus) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      DRAFT: { label: "مسودة", className: "bg-gray-100 text-gray-800" },
      SELF_EVALUATION: { label: "تقييم ذاتي", className: "bg-blue-100 text-blue-800" },
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="بانتظار مراجعتي"
        description="نماذج التقييم التي تحتاج لمراجعتك"
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الموظف</TableHead>
              <TableHead>الكود</TableHead>
              <TableHead>الفترة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>درجة الموظف</TableHead>
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
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                </TableRow>
              ))
            ) : filteredForms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              filteredForms.map((form: EvaluationForm) => (
                <TableRow key={form.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {form.employee?.firstNameAr} {form.employee?.lastNameAr}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{form.employee?.employeeNumber}</TableCell>
                  <TableCell>{form.period?.nameAr}</TableCell>
                  <TableCell>{getStatusBadge(form.status)}</TableCell>
                  <TableCell>
                    {form.totalSelfScore ? form.totalSelfScore.toFixed(1) : "-"}
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
    </div>
  );
}
