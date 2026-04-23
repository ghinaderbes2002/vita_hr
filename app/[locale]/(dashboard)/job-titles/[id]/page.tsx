"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { JobTitleDialog } from "@/components/features/job-titles/job-title-dialog";
import { useJobTitle, useDeleteJobTitle } from "@/lib/hooks/use-job-titles";
import { JobTitle } from "@/types";
import { format } from "date-fns";

export default function JobTitleDetailPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useJobTitle(id);
  const jobTitle: JobTitle | undefined = (data as any)?.data || (data as any);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const deleteJobTitle = useDeleteJobTitle();

  const confirmDelete = async () => {
    if (!jobTitle) return;
    await deleteJobTitle.mutateAsync(jobTitle.id);
    router.replace(`/${locale}/job-titles`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (!jobTitle) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">المسمى الوظيفي غير موجود</p>
        <Button variant="outline" onClick={() => router.replace(`/${locale}/job-titles`)}>
          <ArrowRight className="h-4 w-4 ml-2" />
          العودة للقائمة
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{jobTitle.nameAr}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{jobTitle.code}</Badge>
              {jobTitle.grade && (
                <Badge
                  variant="secondary"
                  style={jobTitle.grade.color ? { backgroundColor: jobTitle.grade.color + "22", color: jobTitle.grade.color, borderColor: jobTitle.grade.color + "44" } : undefined}
                >
                  {jobTitle.grade.nameAr}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 ml-1.5" />
            {t("common.edit")}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 ml-1.5" />
            {t("common.delete")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("jobTitles.fields.nameAr")?.replace("الاسم", "المعلومات") || "معلومات المسمى"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label={t("jobTitles.fields.code")} value={jobTitle.code} />
            <Row label={t("jobTitles.fields.nameAr")} value={jobTitle.nameAr} />
            {jobTitle.nameEn && <Row label={t("jobTitles.fields.nameEn")} value={jobTitle.nameEn} />}
            {jobTitle.nameTr && <Row label="الاسم بالتركية" value={jobTitle.nameTr} />}
            {jobTitle.order != null && <Row label={t("jobTitles.fields.order") || "الترتيب"} value={String(jobTitle.order)} />}
            {jobTitle.description && <Row label={t("jobTitles.fields.description")} value={jobTitle.description} />}
            {jobTitle.createdAt && (
              <Row label={t("common.createdAt") || "تاريخ الإنشاء"} value={format(new Date(jobTitle.createdAt), "yyyy/MM/dd")} />
            )}
          </CardContent>
        </Card>

        {/* Grade Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("jobTitles.fields.grade")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {jobTitle.grade ? (
              <>
                <Row label="الاسم" value={jobTitle.grade.nameAr} />
                {jobTitle.grade.nameEn && <Row label="الاسم بالإنجليزية" value={jobTitle.grade.nameEn} />}
                {jobTitle.grade.code && <Row label="الكود" value={jobTitle.grade.code} />}
                {jobTitle.grade.minSalary != null && (
                  <Row label="الراتب الأدنى" value={Number(jobTitle.grade.minSalary).toLocaleString()} />
                )}
                {jobTitle.grade.maxSalary != null && (
                  <Row label="الراتب الأقصى" value={Number(jobTitle.grade.maxSalary).toLocaleString()} />
                )}
                {jobTitle.grade.color && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">اللون</span>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: jobTitle.grade.color }} />
                      <span className="font-medium">{jobTitle.grade.color}</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">لا يوجد درجة وظيفية مرتبطة</p>
            )}
          </CardContent>
        </Card>
      </div>

      <JobTitleDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
        }}
        jobTitle={jobTitle}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("messages.confirmDelete")}
        description={t("messages.actionCantUndo")}
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-left">{value}</span>
    </div>
  );
}
