"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmployees } from "@/lib/hooks/use-employees";

export default function EmployeeCardIndexPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useEmployees({ search: search || undefined, limit: 20 });

  const employees: any[] = (data as any)?.data?.items ?? (data as any)?.items ?? [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">بطاقة الموظف الشهرية</h1>
        <p className="text-sm text-muted-foreground mt-0.5">اختر موظفاً لعرض تفاصيل حضوره يوماً بيوم</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ابحث عن موظف..."
          className="pr-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : employees.length === 0 ? (
            <p className="text-center py-10 text-sm text-muted-foreground">لا توجد نتائج</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">الاسم</th>
                  <th className="px-4 py-3 text-right font-medium">الرقم الوظيفي</th>
                  <th className="px-4 py-3 text-right font-medium">القسم</th>
                  <th className="px-4 py-3 w-28"></th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp: any) => (
                  <tr key={emp.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      {emp.firstNameAr} {emp.lastNameAr}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{emp.employeeNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{emp.department?.nameAr ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/reports/employee-card/${emp.id}`)}
                      >
                        عرض البطاقة
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
