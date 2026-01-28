"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { LeaveRequestForm } from "@/components/features/leave-requests/leave-request-form";
import { useCreateLeaveRequest } from "@/lib/hooks/use-leave-requests";
import { CreateLeaveRequestData } from "@/lib/api/leave-requests";

export default function NewRequestPage() {
  const t = useTranslations();
  const router = useRouter();
  const createRequest = useCreateLeaveRequest();

  const handleSubmit = async (data: CreateLeaveRequestData) => {
    await createRequest.mutateAsync(data);
    router.push("/leaves/my-leaves");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("leaves.newRequest")}
        description="قم بإنشاء طلب إجازة جديد"
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
          <CardDescription>املأ البيانات أدناه لإنشاء طلب إجازة جديد</CardDescription>
        </CardHeader>
        <CardContent>
          <LeaveRequestForm onSubmit={handleSubmit} isLoading={createRequest.isPending} />
        </CardContent>
      </Card>
    </div>
  );
}
