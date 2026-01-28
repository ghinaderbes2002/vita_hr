"use client";

import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { LeaveRequestForm } from "@/components/features/leave-requests/leave-request-form";
import { useLeaveRequest, useUpdateLeaveRequest } from "@/lib/hooks/use-leave-requests";
import { UpdateLeaveRequestData } from "@/lib/api/leave-requests";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditLeaveRequestPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: request, isLoading } = useLeaveRequest(id);
  const updateRequest = useUpdateLeaveRequest();

  const handleSubmit = async (data: UpdateLeaveRequestData) => {
    await updateRequest.mutateAsync({ id, data });
    router.push("/leaves/my-leaves");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("leaves.editRequest")}
          description="تعديل بيانات طلب الإجازة"
        />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("leaves.editRequest")}
          description="تعديل بيانات طلب الإجازة"
        />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t("common.noData")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("leaves.editRequest")}
        description="تعديل بيانات طلب الإجازة"
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowRight className="h-4 w-4 ml-2" />
            {t("common.back")}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>بيانات طلب الإجازة</CardTitle>
          <CardDescription>قم بتعديل البيانات أدناه</CardDescription>
        </CardHeader>
        <CardContent>
          <LeaveRequestForm
            onSubmit={handleSubmit}
            initialData={request}
            isLoading={updateRequest.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
