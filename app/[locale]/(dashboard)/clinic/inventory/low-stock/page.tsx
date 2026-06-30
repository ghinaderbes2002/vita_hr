"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { AlertTriangle, Package, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { useLowStockAlerts } from "@/lib/hooks/use-clinic-inventory";

export default function LowStockPage() {
  const router = useRouter();
  const locale = useLocale();

  const { data: items = [], isLoading } = useLowStockAlerts();

  const criticalCount = items.filter((i) => i.currentStock === 0).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="تنبيهات نقص المخزون"
        description={
          isLoading
            ? "جاري التحميل..."
            : items.length === 0
            ? "لا توجد تنبيهات حالياً"
            : `${items.length} صنف تحت الحد الأدنى${criticalCount > 0 ? ` — ${criticalCount} نافد تماماً` : ""}`
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <Package className="h-14 w-14 opacity-20" />
          <p className="font-medium">المخزون كافٍ</p>
          <p className="text-sm">لا توجد أصناف تحت الحد الأدنى</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items
            .sort((a, b) => a.currentStock - b.currentStock)
            .map((item) => {
              const pct = Math.min(
                Math.round((item.currentStock / Math.max(item.minStockLevel ?? 1, 1)) * 100),
                100
              );
              const critical = item.currentStock === 0;

              return (
                <Card
                  key={item.id}
                  className={critical ? "border-red-300 bg-red-50" : "border-orange-200 bg-orange-50"}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <AlertTriangle
                          className={`h-5 w-5 shrink-0 ${critical ? "text-red-500" : "text-orange-500"}`}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold truncate">{item.name}</p>
                            {critical && (
                              <Badge variant="destructive" className="text-xs px-1.5 py-0 shrink-0">
                                نافد
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="font-mono">{item.code}</span>
                            {item.category && <span>· {item.category.name}</span>}
                            {item.supplier && <span>· {item.supplier.name}</span>}
                            {item.unit && <span>· {item.unit}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-5 shrink-0">
                        <div className="text-center">
                          <p className={`text-2xl font-bold tabular-nums ${critical ? "text-red-700" : "text-orange-700"}`}>
                            {item.currentStock}
                          </p>
                          <p className="text-xs text-muted-foreground">متوفر</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold tabular-nums text-muted-foreground">
                            {item.minStockLevel}
                          </p>
                          <p className="text-xs text-muted-foreground">الحد الأدنى</p>
                        </div>
                        <div className="w-20">
                          <div className="h-2 rounded-full bg-white/60 overflow-hidden border">
                            <div
                              className={`h-full rounded-full transition-all ${
                                critical ? "bg-red-500" : pct < 50 ? "bg-orange-400" : "bg-yellow-400"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-xs text-center text-muted-foreground mt-0.5">{pct}%</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => router.push(`/${locale}/clinic/inventory/${item.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          عرض
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}
