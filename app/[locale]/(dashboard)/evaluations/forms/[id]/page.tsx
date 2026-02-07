"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ArrowRight, User, Calendar, Award, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function EvaluationFormDetailsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const t = useTranslations();
  const router = useRouter();
  const { data: form, isLoading } = useEvaluationForm(resolvedParams.id);

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent>
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
            <p className="text-muted-foreground">لم يتم العثور على النموذج</p>
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">تفاصيل نموذج التقييم</h1>
            <p className="text-sm text-muted-foreground">
              عرض وإدارة نموذج التقييم
            </p>
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
                <p className="text-sm text-muted-foreground">الموظف</p>
                <p className="font-medium">
                  {form.employee?.firstNameAr} {form.employee?.lastNameAr}
                </p>
                <p className="text-sm text-muted-foreground">{form.employee?.code}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الفترة</p>
                <p className="font-medium">{form.period?.nameAr}</p>
                <p className="text-sm text-muted-foreground">{form.period?.code}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Award className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الدرجة النهائية</p>
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
                <p className="text-sm text-muted-foreground">الحالة</p>
                <p className="font-medium">{getStatusBadge(form.status)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="self">التقييم الذاتي</TabsTrigger>
          <TabsTrigger value="manager">تقييم المدير</TabsTrigger>
          <TabsTrigger value="goals">الأهداف</TabsTrigger>
          <TabsTrigger value="peers">تقييم الزملاء</TabsTrigger>
          <TabsTrigger value="hr">مراجعة HR</TabsTrigger>
          <TabsTrigger value="gm">موافقة GM</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>ملخص الدرجات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground">درجة التقييم الذاتي</span>
                  <span className="text-xl font-bold text-blue-600">
                    {form.totalSelfScore ? form.totalSelfScore.toFixed(1) : "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground">درجة تقييم المدير</span>
                  <span className="text-xl font-bold text-orange-600">
                    {form.totalManagerScore ? form.totalManagerScore.toFixed(1) : "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-muted-foreground">الدرجة النهائية</span>
                  <span className="text-2xl font-bold text-green-600">
                    {form.finalScore ? form.finalScore.toFixed(1) : "-"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>تفاصيل المعايير</CardTitle>
              </CardHeader>
              <CardContent>
                {form.sections && form.sections.length > 0 ? (
                  <div className="space-y-3">
                    {form.sections.map((section) => (
                      <div key={section.id} className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          {section.criteria?.nameAr || "معيار غير معروف"}
                        </span>
                        <div className="flex gap-3">
                          <span className="text-blue-600">
                            ذاتي: {section.selfScore || "-"}
                          </span>
                          <span className="text-orange-600">
                            مدير: {section.managerScore || "-"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    لا توجد معايير
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Comments Cards */}
          <div className="grid grid-cols-1 gap-6 mt-6">
            {form.selfComments && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-600">ملاحظات التقييم الذاتي</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{form.selfComments}</p>
                </CardContent>
              </Card>
            )}

            {form.managerComments && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-orange-600">ملاحظات تقييم المدير</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">ملاحظات عامة:</p>
                    <p className="text-sm whitespace-pre-wrap">{form.managerComments}</p>
                  </div>
                  {form.managerStrengths && (
                    <div>
                      <p className="text-sm font-medium mb-1">نقاط القوة:</p>
                      <p className="text-sm whitespace-pre-wrap text-green-600">{form.managerStrengths}</p>
                    </div>
                  )}
                  {form.managerWeaknesses && (
                    <div>
                      <p className="text-sm font-medium mb-1">نقاط الضعف:</p>
                      <p className="text-sm whitespace-pre-wrap text-red-600">{form.managerWeaknesses}</p>
                    </div>
                  )}
                  {form.managerRecommendations && (
                    <div>
                      <p className="text-sm font-medium mb-1">التوصيات:</p>
                      <p className="text-sm whitespace-pre-wrap">{form.managerRecommendations}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {form.hrComments && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-purple-600">مراجعة الموارد البشرية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm whitespace-pre-wrap">{form.hrComments}</p>
                  {form.hrRecommendation && (
                    <div className="mt-3">
                      <span className="text-sm font-medium">التوصية: </span>
                      <Badge>{form.hrRecommendation}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {form.gmComments && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-yellow-600">قرار المدير العام</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">الحالة:</span>
                    <Badge className={form.gmStatus === "APPROVED" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {form.gmStatus === "APPROVED" ? "موافق" : "مرفوض"}
                    </Badge>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{form.gmComments}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Other Tabs */}
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
