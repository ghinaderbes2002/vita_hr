"use client";

import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { ArrowRight, Package, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useInventoryItem, useItemHistory } from "@/lib/hooks/use-clinic-inventory";
import { TransactionType } from "@/lib/api/clinic-inventory";

const TYPE_LABEL: Record<string, string> = { COMPONENT: "قطعة", CONSUMABLE: "مستهلك" };
const TX_LABEL: Record<TransactionType, string> = {
  RECEIVE: "استلام", ISSUE: "صرف", ADJUST: "تسوية", RETURN: "إرجاع",
};
const TX_COLOR: Record<TransactionType, string> = {
  RECEIVE: "text-green-600", ISSUE: "text-red-600", ADJUST: "text-blue-600", RETURN: "text-orange-600",
};

export default function InventoryItemPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();

  const { data: item, isLoading } = useInventoryItem(id);
  const { data: history = [] } = useItemHistory(id);

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  if (!item) {
    return <div className="text-center py-20 text-muted-foreground">الصنف غير موجود</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <button
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => router.push(`/${locale}/clinic/inventory`)}
      >
        <ArrowRight className="h-3.5 w-3.5" />
        العودة للمخزون
      </button>

      {/* Item header */}
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{item.name}</h1>
            <Badge variant="outline">{TYPE_LABEL[item.type]}</Badge>
            {item.isLowStock && <Badge className="bg-orange-100 text-orange-800 border-orange-200" variant="outline">مخزون منخفض</Badge>}
          </div>
          <p className="text-muted-foreground font-mono text-sm">{item.code}</p>
          {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground mb-1">المخزون الحالي</p>
            <p className={`text-3xl font-bold ${item.isLowStock ? "text-orange-600" : "text-foreground"}`}>
              {item.currentStock}
            </p>
            <p className="text-xs text-muted-foreground">{item.unit ?? "وحدة"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground mb-1">الحد الأدنى</p>
            <p className="text-3xl font-bold">{item.minStockLevel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground mb-1">سعر الوحدة</p>
            <p className="text-xl font-bold">{item.unitPrice ? `${item.unitPrice.toLocaleString("en-US")} ل.س` : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground mb-1">التصنيف</p>
            <p className="text-sm font-medium">{item.category?.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{item.supplier?.name ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">سجل الحركات ({history.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">لا توجد حركات مسجلة</p>
          ) : (
            <div className="space-y-2">
              {history.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className={`p-1.5 rounded-full ${
                    tx.type === "RECEIVE" || tx.type === "RETURN" ? "bg-green-50" : "bg-red-50"
                  }`}>
                    {tx.type === "RECEIVE" || tx.type === "RETURN"
                      ? <TrendingUp className="h-4 w-4 text-green-600" />
                      : <TrendingDown className="h-4 w-4 text-red-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${TX_COLOR[tx.type]}`}>{TX_LABEL[tx.type]}</span>
                      <span className={`font-bold font-mono ${tx.type === "RECEIVE" || tx.type === "RETURN" ? "text-green-600" : "text-red-600"}`}>
                        {tx.type === "RECEIVE" || tx.type === "RETURN" ? "+" : "-"}{tx.quantity}
                      </span>
                    </div>
                    {tx.notes && <p className="text-xs text-muted-foreground">{tx.notes}</p>}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{new Date(tx.createdAt).toLocaleDateString("ar")}</p>
                    {tx.performedByName && <p>{tx.performedByName}</p>}
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
