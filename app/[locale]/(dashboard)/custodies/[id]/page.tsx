"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { ArrowRight, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CustodyDialog } from "@/components/features/custodies/custody-dialog";
import { ReturnCustodyDialog } from "@/components/features/custodies/return-custody-dialog";
import { useCustody, useDeleteCustody } from "@/lib/hooks/use-custodies";
import { assetUrl } from "@/lib/utils";
import { Custody, CustodyStatus } from "@/types";

const STATUS_VARIANTS: Record<CustodyStatus, "default" | "secondary" | "destructive" | "outline"> = {
  WITH_EMPLOYEE: "default",
  RETURNED: "secondary",
  DAMAGED: "destructive",
  LOST: "destructive",
};

export default function CustodyDetailPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useCustody(id);
  const custody: Custody | undefined = (data as any)?.data || (data as any);

  const [editOpen, setEditOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const deleteCustody = useDeleteCustody();

  const attachments: { fileUrl: string; fileName: string }[] =
    (custody as any)?.attachments || [];

  const confirmDelete = async () => {
    if (!custody) return;
    await deleteCustody.mutateAsync(custody.id);
    router.replace(`/${locale}/custodies`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!custody) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">العهدة غير موجودة</p>
        <Button variant="outline" onClick={() => router.replace(`/${locale}/custodies`)}>
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
            <h1 className="text-2xl font-bold tracking-tight">{custody.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{t(`custodies.categories.${custody.category}`)}</Badge>
              <Badge variant={STATUS_VARIANTS[custody.status]}>
                {t(`custodies.statuses.${custody.status}`)}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 ml-1.5" />
            {t("common.edit")}
          </Button>
          {custody.status === "WITH_EMPLOYEE" && (
            <Button variant="outline" size="sm" onClick={() => setReturnOpen(true)}>
              <RotateCcw className="h-4 w-4 ml-1.5" />
              {t("custodies.returnCustody")}
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 ml-1.5" />
            {t("common.delete")}
          </Button>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">معلومات العهدة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label={t("custodies.fields.name")} value={custody.name} />
            <Row label={t("custodies.fields.category")} value={t(`custodies.categories.${custody.category}`)} />
            {custody.serialNumber && (
              <Row label={t("custodies.fields.serialNumber")} value={custody.serialNumber} />
            )}
            <Row
              label={t("custodies.fields.assignedDate")}
              value={custody.assignedDate ? format(new Date(custody.assignedDate), "yyyy/MM/dd") : "—"}
            />
            {(custody as any).returnedDate && (
              <Row
                label="تاريخ الإرجاع"
                value={format(new Date((custody as any).returnedDate), "yyyy/MM/dd")}
              />
            )}
            {custody.description && (
              <Row label={t("custodies.fields.description")} value={custody.description} />
            )}
            {custody.notes && (
              <Row label={t("custodies.fields.notes")} value={custody.notes} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">الموظف</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {custody.employee ? (
              <>
                <Row label="الاسم" value={`${custody.employee.firstNameAr} ${custody.employee.lastNameAr}`} />
                {custody.employee.employeeNumber && (
                  <Row label="رقم الموظف" value={custody.employee.employeeNumber} />
                )}
                {custody.employee.department && (
                  <Row label="القسم" value={custody.employee.department.nameAr} />
                )}
                {(custody.employee as any).jobTitle && (
                  <Row label="المسمى الوظيفي" value={(custody.employee as any).jobTitle.nameAr} />
                )}
              </>
            ) : (
              <p className="text-muted-foreground">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">المرفقات ({attachments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {attachments.map((att, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="relative rounded-lg border overflow-hidden bg-muted aspect-square hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {att.fileUrl.startsWith("data:image") || att.fileUrl.startsWith("http") || att.fileUrl.startsWith("/app/") ? (
                    <img src={assetUrl(att.fileUrl)} alt={att.fileName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-2">
                      <span className="text-xs text-muted-foreground truncate text-center">{att.fileName}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            className="absolute top-4 left-4 text-white bg-black/50 rounded-full p-1.5 hover:bg-black/70 transition"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="text-white text-2xl px-3 py-1 bg-black/30 rounded hover:bg-black/50"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => prev !== null ? (prev - 1 + attachments.length) % attachments.length : 0); }}
            >
              ‹
            </button>
            <img
              src={assetUrl(attachments[lightboxIndex].fileUrl)}
              alt={attachments[lightboxIndex].fileName}
              className="max-w-[80vw] max-h-[80vh] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              className="text-white text-2xl px-3 py-1 bg-black/30 rounded hover:bg-black/50"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((prev) => prev !== null ? (prev + 1) % attachments.length : 0); }}
            >
              ›
            </button>
          </div>
          <p className="absolute bottom-6 text-white text-sm opacity-70">
            {lightboxIndex + 1} / {attachments.length} — {attachments[lightboxIndex].fileName}
          </p>
        </div>
      )}

      <CustodyDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        custody={custody}
      />
      <ReturnCustodyDialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        custody={custody}
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
