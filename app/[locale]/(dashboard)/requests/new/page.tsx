"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarDays, FileText, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { LeaveRequestForm } from "@/components/features/leave-requests/leave-request-form";
import { NewRequestDialog } from "@/components/features/requests/new-request-dialog";
import { useCreateLeaveRequest } from "@/lib/hooks/use-leave-requests";
import { CreateLeaveRequestData } from "@/lib/api/leave-requests";

export default function NewRequestChoicePage() {
  const t = useTranslations();
  const router = useRouter();
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [accidentDialogOpen, setAccidentDialogOpen] = useState(false);
  const createLeaveRequest = useCreateLeaveRequest();

  const handleLeaveSubmit = async (data: CreateLeaveRequestData) => {
    await createLeaveRequest.mutateAsync(data);
    setLeaveDialogOpen(false);
    router.push("/leaves/my-leaves");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("requests.newRequest")}
        description={t("requests.newRequestDescription")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-3xl">
        {/* طلب إجازة */}
        <Card
          className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
          onClick={() => setLeaveDialogOpen(true)}
        >
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-base">{t("leaves.newRequest")}</CardTitle>
              <CardDescription className="text-xs mt-1">
                {t("leaves.newRequestDescription")}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent />
        </Card>

        {/* طلب إداري */}
        <Card
          className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
          onClick={() => setAdminDialogOpen(true)}
        >
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="p-3 rounded-full bg-orange-100 text-orange-600">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-base">{t("requests.adminRequest")}</CardTitle>
              <CardDescription className="text-xs mt-1">
                {t("requests.adminRequestDescription")}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent />
        </Card>

        {/* تقديم حادث عمل */}
        <Card
          className="cursor-pointer hover:border-red-400 hover:shadow-md transition-all"
          onClick={() => setAccidentDialogOpen(true)}
        >
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-base">تقديم حادث عمل</CardTitle>
              <CardDescription className="text-xs mt-1">
                تسجيل وإبلاغ عن حادث عمل طارئ
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent />
        </Card>
      </div>

      {/* ديالوق طلب الإجازة */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("leaves.newRequest")}</DialogTitle>
          </DialogHeader>
          <LeaveRequestForm
            onSubmit={handleLeaveSubmit}
            isLoading={createLeaveRequest.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* ديالوق الطلب الإداري */}
      <NewRequestDialog
        open={adminDialogOpen}
        onOpenChange={setAdminDialogOpen}
      />

      {/* ديالوق تقرير حادث العمل */}
      <NewRequestDialog
        open={accidentDialogOpen}
        onOpenChange={setAccidentDialogOpen}
        defaultType="WORK_ACCIDENT"
        title="تقرير حادث عمل"
      />
    </div>
  );
}
