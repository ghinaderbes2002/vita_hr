"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ArrowRight, User, Calendar, Award, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useEvaluationForm } from "@/lib/hooks/use-evaluation-forms";
import { EvaluationFormStatus } from "@/lib/api/evaluation-forms";
import { SelfEvaluationTab } from "@/components/evaluations/self-evaluation-tab";
import { ManagerEvaluationTab } from "@/components/evaluations/manager-evaluation-tab";
import { EmployeeGoalsTab } from "@/components/evaluations/employee-goals-tab";
import { PeerEvaluationsTab } from "@/components/evaluations/peer-evaluations-tab";
import { HrReviewTab } from "@/components/evaluations/hr-review-tab";
import { GmApprovalTab } from "@/components/evaluations/gm-approval-tab";

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

const STATUS_CLASSES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SELF_EVALUATION: "bg-blue-100 text-blue-800",
  PENDING_SELF: "bg-blue-100 text-blue-800",
  SELF_SUBMITTED: "bg-blue-100 text-blue-800",
  MANAGER_EVALUATION: "bg-orange-100 text-orange-800",
  MANAGER_SUBMITTED: "bg-orange-100 text-orange-800",
  HR_REVIEW: "bg-purple-100 text-purple-800",
  GM_APPROVAL: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
};

export default function EvaluationFormDetailsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const t = useTranslations("evaluationForms");
  const router = useRouter();
  const { data: form, isLoading } = useEvaluationForm(resolvedParams.id);

  const getStatusBadge = (status: EvaluationFormStatus) => {
    const label = t(`statuses.${status}`) || status;
    const cls = STATUS_CLASSES[status] || "bg-gray-100 text-gray-800";
    return <Badge className={cls}>{label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t("detail.notFound")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("detail.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("detail.description")}</p>
          </div>
        </div>
        {getStatusBadge(form.status)}
      </div>

      {/* Employee & Period Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("detail.employee")}</p>
                <p className="font-medium">{form.employee?.firstNameAr} {form.employee?.lastNameAr}</p>
                <p className="text-sm text-muted-foreground">{form.employee?.employeeNumber}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("detail.period")}</p>
                <p className="font-medium">{form.period?.nameAr}</p>
                <p className="text-sm text-muted-foreground">{form.period?.code}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Award className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("detail.finalScore")}</p>
                <p className="text-2xl font-bold text-green-600">
                  {form.finalScore ? form.finalScore.toFixed(1) : "-"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("detail.status")}</p>
                <p className="font-medium">{getStatusBadge(form.status)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">{t("detail.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="self">{t("detail.tabs.self")}</TabsTrigger>
          <TabsTrigger value="manager">{t("detail.tabs.manager")}</TabsTrigger>
          <TabsTrigger value="goals">{t("detail.tabs.goals")}</TabsTrigger>
          <TabsTrigger value="peers">{t("detail.tabs.peers")}</TabsTrigger>
          <TabsTrigger value="hr">{t("detail.tabs.hr")}</TabsTrigger>
          <TabsTrigger value="gm">{t("detail.tabs.gm")}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold">{t("detail.overview.scoresSummary")}</h3>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground">{t("detail.overview.selfScore")}</span>
                  <span className="text-xl font-bold text-blue-600">
                    {form.totalSelfScore ? form.totalSelfScore.toFixed(1) : "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground">{t("detail.overview.managerScore")}</span>
                  <span className="text-xl font-bold text-orange-600">
                    {form.totalManagerScore ? form.totalManagerScore.toFixed(1) : "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground">{t("detail.overview.finalScore")}</span>
                  <span className="text-2xl font-bold text-green-600">
                    {form.finalScore ? form.finalScore.toFixed(1) : "-"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">{t("detail.overview.criteriaDetails")}</h3>
                {form.sections && form.sections.length > 0 ? (
                  <div className="space-y-3">
                    {form.sections.map((section) => (
                      <div key={section.id} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          {section.criteria?.nameAr || t("detail.overview.noCriteria")}
                        </span>
                        <div className="flex gap-3">
                          <span className="text-blue-600">
                            {t("detail.overview.selfPrefix")} {section.selfScore || "-"}
                          </span>
                          <span className="text-orange-600">
                            {t("detail.overview.managerPrefix")} {section.managerScore || "-"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t("detail.overview.noCriteria")}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Comments Cards */}
          <div className="grid grid-cols-1 gap-6 mt-6">
            {form.selfComments && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-blue-600 mb-3">{t("detail.overview.selfCommentsTitle")}</h3>
                  <p className="text-sm whitespace-pre-wrap">{form.selfComments}</p>
                </CardContent>
              </Card>
            )}

            {form.managerComments && (
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <h3 className="font-semibold text-orange-600">{t("detail.overview.managerCommentsTitle")}</h3>
                  <div>
                    <p className="text-sm font-medium mb-1">{t("detail.overview.generalComments")}</p>
                    <p className="text-sm whitespace-pre-wrap">{form.managerComments}</p>
                  </div>
                  {form.managerStrengths && (
                    <div>
                      <p className="text-sm font-medium mb-1">{t("detail.overview.strengths")}</p>
                      <p className="text-sm whitespace-pre-wrap text-green-600">{form.managerStrengths}</p>
                    </div>
                  )}
                  {form.managerWeaknesses && (
                    <div>
                      <p className="text-sm font-medium mb-1">{t("detail.overview.weaknesses")}</p>
                      <p className="text-sm whitespace-pre-wrap text-red-600">{form.managerWeaknesses}</p>
                    </div>
                  )}
                  {form.managerRecommendations && (
                    <div>
                      <p className="text-sm font-medium mb-1">{t("detail.overview.recommendations")}</p>
                      <p className="text-sm whitespace-pre-wrap">{form.managerRecommendations}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {form.hrComments && (
              <Card>
                <CardContent className="pt-6 space-y-2">
                  <h3 className="font-semibold text-purple-600">{t("detail.overview.hrReviewTitle")}</h3>
                  <p className="text-sm whitespace-pre-wrap">{form.hrComments}</p>
                  {form.hrRecommendation && (
                    <div className="mt-3">
                      <span className="text-sm font-medium">{t("detail.overview.hrRecommendation")} </span>
                      <Badge>{form.hrRecommendation}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {form.gmComments && (
              <Card>
                <CardContent className="pt-6 space-y-2">
                  <h3 className="font-semibold text-yellow-600">{t("detail.overview.gmDecisionTitle")}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">{t("detail.overview.gmStatusLabel")}</span>
                    <Badge className={form.gmStatus === "APPROVED" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {form.gmStatus === "APPROVED" ? t("detail.overview.gmApproved") : t("detail.overview.gmRejected")}
                    </Badge>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{form.gmComments}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="self">
          <SelfEvaluationTab form={form} />
        </TabsContent>

        <TabsContent value="manager">
          <ManagerEvaluationTab form={form} />
        </TabsContent>

        <TabsContent value="goals">
          <EmployeeGoalsTab formId={form.id} />
        </TabsContent>

        <TabsContent value="peers">
          <PeerEvaluationsTab formId={form.id} />
        </TabsContent>

        <TabsContent value="hr">
          <HrReviewTab form={form} />
        </TabsContent>

        <TabsContent value="gm">
          <GmApprovalTab form={form} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
