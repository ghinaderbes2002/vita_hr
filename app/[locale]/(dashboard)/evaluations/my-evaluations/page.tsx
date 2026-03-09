"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMyEvaluationForms } from "@/lib/hooks/use-evaluation-forms";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    NOT_STARTED: { label: "لم يبدأ", className: "bg-gray-100 text-gray-700" },
    IN_PROGRESS: { label: "جارٍ", className: "bg-blue-100 text-blue-800" },
    SUBMITTED: { label: "مرسل", className: "bg-green-100 text-green-800" },
    APPROVED: { label: "موافق", className: "bg-green-100 text-green-800" },
    REJECTED: { label: "مرفوض", className: "bg-red-100 text-red-800" },
  };
  const cfg = map[status] || { label: status, className: "bg-gray-100 text-gray-700" };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

export default function MyEvaluationsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { data, isLoading } = useMyEvaluationForms();

  const form = (data as any)?.data || null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("myEvaluations.title")}
        description={t("myEvaluations.description")}
      />

      {isLoading ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : !form ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("common.noData")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              {form.period?.nameAr || form.period?.name || t("myEvaluations.fields.period")}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/evaluations/forms/${form.id}`)}
            >
              <Eye className="h-4 w-4 ml-2" />
              عرض النموذج
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">التقييم الذاتي</p>
                <StatusBadge status={form.selfStatus || "NOT_STARTED"} />
                {form.selfScore != null && (
                  <p className="text-sm font-medium">{form.selfScore}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">تقييم المدير</p>
                <StatusBadge status={form.managerStatus || "NOT_STARTED"} />
                {form.managerScore != null && (
                  <p className="text-sm font-medium">{form.managerScore}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">مراجعة HR</p>
                <StatusBadge status={form.hrStatus || "NOT_STARTED"} />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">موافقة المدير العام</p>
                <StatusBadge status={form.gmStatus || "NOT_STARTED"} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
