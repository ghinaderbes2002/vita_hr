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

function StatusBadge({ status, label }: { status: string; label?: string }) {
  const map: Record<string, { className: string }> = {
    NOT_STARTED: { className: "bg-gray-100 text-gray-700" },
    IN_PROGRESS: { className: "bg-blue-100 text-blue-800" },
    SUBMITTED: { className: "bg-green-100 text-green-800" },
    APPROVED: { className: "bg-green-100 text-green-800" },
    REJECTED: { className: "bg-red-100 text-red-800" },
  };
  const cfg = map[status] || { className: "bg-gray-100 text-gray-700" };
  return <Badge className={cfg.className}>{label || status}</Badge>;
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

      {/* Maintenance Notice */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">{t("myEvaluations.maintenanceTitle")}</p>
            <p className="text-sm text-amber-700 mt-1">
              {t("myEvaluations.maintenanceDesc")}
            </p>
          </div>
        </div>
      </div>

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
              {t("myEvaluations.viewForm")}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("myEvaluations.selfEvaluation")}</p>
                <StatusBadge 
                  status={form.selfStatus || "NOT_STARTED"} 
                  label={t(`evaluationForms.statuses.${form.selfStatus || "NOT_STARTED"}`)} 
                />
                {form.selfScore != null && (
                  <p className="text-sm font-medium">{form.selfScore}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("myEvaluations.managerEvaluation")}</p>
                <StatusBadge 
                  status={form.managerStatus || "NOT_STARTED"} 
                  label={t(`evaluationForms.statuses.${form.managerStatus || "NOT_STARTED"}`)} 
                />
                {form.managerScore != null && (
                  <p className="text-sm font-medium">{form.managerScore}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("myEvaluations.hrReviewTab")}</p>
                <StatusBadge 
                  status={form.hrStatus || "NOT_STARTED"} 
                  label={t(`evaluationForms.statuses.${form.hrStatus || "NOT_STARTED"}`)} 
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("myEvaluations.gmApprovalTab")}</p>
                <StatusBadge 
                  status={form.gmStatus || "NOT_STARTED"} 
                  label={t(`evaluationForms.statuses.${form.gmStatus || "NOT_STARTED"}`)} 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
