"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useMyEvaluationForms } from "@/lib/hooks/use-evaluation-forms";
import { useAuthStore } from "@/lib/stores/auth-store";
import { EvaluationForm, EvaluationFormStatus } from "@/lib/api/evaluation-forms";

export default function MyEvaluationsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { data, isLoading } = useMyEvaluationForms();
  const user = useAuthStore((state) => state.user);

  // Filter forms to show only current user's evaluations
  const allForms = Array.isArray(data)
    ? data
    : (data as any)?.data?.items || (data as any)?.data || [];

  const forms = user?.employeeId
    ? allForms.filter((form: EvaluationForm) => form.employeeId === user.employeeId)
    : allForms;

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="تقييماتي"
        description="عرض نماذج التقييم الخاصة بي"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الفترة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>درجتي</TableHead>
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
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                </TableRow>
              ))
            ) : forms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            ) : (
              forms.map((form: EvaluationForm) => (
                <TableRow key={form.id}>
                  <TableCell className="font-medium">
                    {form.period?.nameAr}
                  </TableCell>
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
    </div>
  );
}
