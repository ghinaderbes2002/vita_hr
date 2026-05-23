"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { ArrowDownLeft, ArrowUpRight, RotateCcw, Settings2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { useInventoryTransactions } from "@/lib/hooks/use-clinic-inventory";
import { TransactionType } from "@/lib/api/clinic-inventory";

const TYPE_CONFIG: Record<TransactionType, { label: string; className: string; Icon: React.ElementType; sign: string }> = {
  RECEIVE: { label: "استلام",  className: "bg-green-100 text-green-800 border-green-200",   Icon: ArrowDownLeft, sign: "+" },
  ISSUE:   { label: "صرف",     className: "bg-red-100 text-red-800 border-red-200",         Icon: ArrowUpRight,  sign: "-" },
  ADJUST:  { label: "تعديل",   className: "bg-yellow-100 text-yellow-800 border-yellow-200", Icon: Settings2,    sign: "±" },
  RETURN:  { label: "إرجاع",   className: "bg-blue-100 text-blue-800 border-blue-200",      Icon: RotateCcw,    sign: "+" },
};

export default function InventoryTransactionsPage() {
  const locale = useLocale();
  const today = new Date().toISOString().slice(0, 10);
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [from, setFrom] = useState(oneMonthAgo);
  const [to, setTo] = useState(today);
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");

  const { data: allTx = [], isLoading } = useInventoryTransactions({ from, to });

  const transactions = typeFilter === "all" ? allTx : allTx.filter((t) => t.type === typeFilter);

  return (
    <div className="space-y-4">
      <PageHeader
        title="سجل عمليات المخزون"
        description="كل عمليات الاستلام والصرف والتعديل والإرجاع"
      />

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-2">
          <Label className="text-sm shrink-0">من</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm shrink-0">إلى</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TransactionType | "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="كل الأنواع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأنواع</SelectItem>
            {(Object.keys(TYPE_CONFIG) as TransactionType[]).map((t) => (
              <SelectItem key={t} value={t}>{TYPE_CONFIG[t].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isLoading && (
          <span className="text-sm text-muted-foreground">
            {transactions.length} عملية
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <p className="text-sm">لا توجد عمليات في الفترة المحددة</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-right p-3 font-medium">التاريخ</th>
                    <th className="text-right p-3 font-medium">النوع</th>
                    <th className="text-right p-3 font-medium">الصنف</th>
                    <th className="text-right p-3 font-medium">الكمية</th>
                    <th className="text-right p-3 font-medium">المنفّذ</th>
                    <th className="text-right p-3 font-medium">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const cfg = TYPE_CONFIG[tx.type];
                    const Icon = cfg?.Icon;
                    return (
                      <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString(locale)}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className={`gap-1 ${cfg?.className ?? ""}`}>
                            {Icon && <Icon className="h-3 w-3" />}
                            {cfg?.label ?? tx.type}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{tx.item?.name ?? "—"}</p>
                            {tx.item?.code && (
                              <p className="text-xs font-mono text-muted-foreground">{tx.item.code}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-bold tabular-nums">
                          <span className={
                            tx.type === "ISSUE"
                              ? "text-red-600"
                              : tx.type === "ADJUST"
                              ? "text-yellow-700"
                              : "text-green-700"
                          }>
                            {cfg?.sign}{tx.quantity}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{tx.performedByName ?? "—"}</td>
                        <td className="p-3 text-muted-foreground max-w-xs truncate">{tx.notes ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
