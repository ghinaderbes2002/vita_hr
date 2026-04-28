"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Clock, ExternalLink, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useProbationReport } from "@/lib/hooks/use-employees";
import { usePermissions } from "@/lib/hooks/use-permissions";

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  FIXED_TERM: "محدد المدة",
  INDEFINITE: "غير محدد",
  TEMPORARY: "مؤقت",
  TRAINEE: "متدرب",
  CONSULTANT: "استشاري",
  SERVICE_PROVIDER: "مزود خدمة",
  UNSPECIFIED: "غير محدد",
};

function rowColor(days: number) {
  if (days <= 7) return "bg-red-50 border-red-200";
  if (days <= 14) return "bg-amber-50 border-amber-200";
  return "bg-green-50 border-green-200";
}

function daysBadge(days: number) {
  if (days <= 7) return <Badge className="bg-red-500 text-white">{days} يوم</Badge>;
  if (days <= 14) return <Badge className="bg-amber-500 text-white">{days} يوم</Badge>;
  return <Badge className="bg-green-600 text-white">{days} يوم</Badge>;
}

export default function ProbationEndingPage() {
  const locale = useLocale();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [days, setDays] = useState(30);

  const { data, isLoading } = useProbationReport(days);
  const items: any[] = Array.isArray(data) ? data : [];

  if (!hasPermission("employees:probation-report:read")) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">ليس لديك صلاحية عرض هذا التقرير</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-orange-500" />
            تقرير اقتراب انتهاء فترة التجربة
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            الموظفون الذين تنتهي فترة تجربتهم خلال الفترة القادمة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">خلال:</span>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 أيام</SelectItem>
              <SelectItem value="14">14 يوم</SelectItem>
              <SelectItem value="30">30 يوم</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-3 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> أقل من 7 أيام</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> 7–14 يوم</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-600 inline-block" /> أكثر من 14 يوم</span>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            النتائج
            {!isLoading && <Badge variant="secondary" className="ms-auto">{items.length} موظف</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              لا يوجد موظفون تنتهي فترة تجربتهم خلال {days} يوم القادمة
            </div>
          ) : (
            <div className="divide-y">
              {/* Header */}
              <div className="grid grid-cols-7 gap-2 px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/40">
                <span>الرقم الوظيفي</span>
                <span className="col-span-2">الاسم</span>
                <span>القسم</span>
                <span>تاريخ التوظيف</span>
                <span>تاريخ الانتهاء</span>
                <span>الأيام المتبقية</span>
              </div>
              {items.map((item: any) => (
                <div
                  key={item.id}
                  className={`grid grid-cols-7 gap-2 px-4 py-3 items-center border-r-4 ${rowColor(item.daysRemaining)}`}
                >
                  <span className="text-xs font-mono text-muted-foreground">{item.employeeNumber}</span>
                  <div className="col-span-2 flex items-center gap-2">
                    <div>
                      <p className="text-sm font-medium">{item.firstNameAr} {item.lastNameAr}</p>
                      {item.jobTitle?.nameAr && (
                        <p className="text-xs text-muted-foreground">{item.jobTitle.nameAr}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm">{item.department?.nameAr || "—"}</span>
                  <span className="text-sm">{item.hireDate ? new Date(item.hireDate).toLocaleDateString("en-GB") : "—"}</span>
                  <span className="text-sm">{item.probationEndDate ? new Date(item.probationEndDate).toLocaleDateString("en-GB") : "—"}</span>
                  <div className="flex items-center gap-2">
                    {daysBadge(item.daysRemaining)}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => router.push(`/${locale}/employees/${item.id}`)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
