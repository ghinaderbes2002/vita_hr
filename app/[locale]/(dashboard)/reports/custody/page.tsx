"use client";

import { useState } from "react";
import { Download, Package, PackageCheck, PackageX, AlertTriangle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { useCustodies } from "@/lib/hooks/use-custodies";
import { downloadExcelMultiSheet } from "@/lib/utils/excel";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  ASSIGNED:  { label: "مُعيَّنة",    badge: "bg-blue-100 text-blue-800" },
  RETURNED:  { label: "مُعادة",      badge: "bg-green-100 text-green-800" },
  DAMAGED:   { label: "تالفة",       badge: "bg-amber-100 text-amber-800" },
  LOST:      { label: "مفقودة",      badge: "bg-red-100 text-red-800" },
};

export default function CustodyReportPage() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useCustodies({ limit: 1000 });

  const rawItems: any[] = (data as any)?.data?.items || (data as any)?.data?.data || (data as any)?.data || [];

  const items = rawItems.filter((c: any) => {
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = `${c.employee?.firstNameAr} ${c.employee?.lastNameAr}`.toLowerCase();
      const itemName = (c.name || "").toLowerCase();
      return name.includes(q) || itemName.includes(q) || (c.serialNumber || "").toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total:    rawItems.length,
    assigned: rawItems.filter((c: any) => c.status === "ASSIGNED").length,
    returned: rawItems.filter((c: any) => c.status === "RETURNED").length,
    damaged:  rawItems.filter((c: any) => c.status === "DAMAGED").length,
    lost:     rawItems.filter((c: any) => c.status === "LOST").length,
  };

  const handleExport = () => {
    const allRows = rawItems.map((c: any) => ({
      "رقم الموظف": c.employee?.employeeNumber || "",
      الموظف: c.employee ? `${c.employee.firstNameAr} ${c.employee.lastNameAr}` : "",
      "اسم العهدة": c.name,
      "الفئة": c.category || "",
      "الرقم التسلسلي": c.serialNumber || "",
      "تاريخ التعيين": c.assignedDate ? format(new Date(c.assignedDate), "yyyy/MM/dd") : "",
      "تاريخ الإعادة": c.returnedDate ? format(new Date(c.returnedDate), "yyyy/MM/dd") : "",
      الحالة: STATUS_CONFIG[c.status]?.label ?? c.status,
      ملاحظات: c.notes || "",
    }));

    const assignedRows = allRows.filter((_, i) => rawItems[i].status === "ASSIGNED");
    const returnedRows = allRows.filter((_, i) => rawItems[i].status === "RETURNED");
    const damagedLostRows = allRows.filter((_, i) => ["DAMAGED", "LOST"].includes(rawItems[i].status));

    downloadExcelMultiSheet([
      { name: "الكل", rows: allRows },
      { name: "مُعيَّنة", rows: assignedRows },
      { name: "مُعادة", rows: returnedRows },
      { name: "تالفة أو مفقودة", rows: damagedLostRows },
    ], `custody-report-${format(new Date(), "yyyy-MM-dd")}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="تقرير العهد"
        description="عرض وتصدير جميع العهد المعيَّنة للموظفين"
        actions={
          <Button onClick={handleExport} disabled={isLoading || rawItems.length === 0}>
            <Download className="h-4 w-4 ml-2" />
            تصدير Excel
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "الإجمالي",    value: stats.total,    icon: Package,      color: "text-foreground" },
          { label: "مُعيَّنة",    value: stats.assigned, icon: Package,      color: "text-blue-500" },
          { label: "مُعادة",      value: stats.returned, icon: PackageCheck, color: "text-green-500" },
          { label: "تالفة",       value: stats.damaged,  icon: AlertTriangle, color: "text-amber-500" },
          { label: "مفقودة",      value: stats.lost,     icon: PackageX,     color: "text-red-500" },
        ].map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <p className="text-2xl font-bold">{c.value}</p>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو رقم المسلسل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">جميع الحالات</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : items.length === 0 ? (
            <p className="text-center py-12 text-sm text-muted-foreground">لا توجد عهد مطابقة</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium">الموظف</th>
                    <th className="px-4 py-3 text-right font-medium">العهدة</th>
                    <th className="px-4 py-3 text-right font-medium">الفئة</th>
                    <th className="px-4 py-3 text-center font-medium">الرقم التسلسلي</th>
                    <th className="px-4 py-3 text-center font-medium">تاريخ التعيين</th>
                    <th className="px-4 py-3 text-center font-medium">تاريخ الإعادة</th>
                    <th className="px-4 py-3 text-center font-medium">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c: any) => {
                    const statusCfg = STATUS_CONFIG[c.status] ?? { label: c.status, badge: "bg-gray-100 text-gray-600" };
                    return (
                      <tr key={c.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3">
                          {c.employee ? (
                            <>
                              <p className="font-medium">{c.employee.firstNameAr} {c.employee.lastNameAr}</p>
                              <p className="text-xs text-muted-foreground">{c.employee.employeeNumber}</p>
                            </>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 font-medium">{c.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.category || "—"}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{c.serialNumber || "—"}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {c.assignedDate ? format(new Date(c.assignedDate), "yyyy/MM/dd") : "—"}
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {c.returnedDate ? format(new Date(c.returnedDate), "yyyy/MM/dd") : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.badge}`}>
                            {statusCfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
