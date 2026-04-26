"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { DollarSign, Play, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { usePayroll, useGeneratePayroll } from "@/lib/hooks/use-payroll";
import { PayrollItem, BonusDetail, PenaltyDetail } from "@/lib/api/payroll";
import { useEmployees } from "@/lib/hooks/use-employees";

const MONTHS = [
  { value: 1, label: "يناير" }, { value: 2, label: "فبراير" },
  { value: 3, label: "مارس" }, { value: 4, label: "أبريل" },
  { value: 5, label: "مايو" }, { value: 6, label: "يونيو" },
  { value: 7, label: "يوليو" }, { value: 8, label: "أغسطس" },
  { value: 9, label: "سبتمبر" }, { value: 10, label: "أكتوبر" },
  { value: 11, label: "نوفمبر" }, { value: 12, label: "ديسمبر" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

function parseMoney(val: string | number): number {
  return Number(val) || 0;
}

function parseBonusDetails(val: string | BonusDetail[]): BonusDetail[] {
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val as string) || []; } catch { return []; }
}

function parsePenaltyDetails(val: string | PenaltyDetail[]): PenaltyDetail[] {
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val as string) || []; } catch { return []; }
}

export default function PayrollPage() {
  const locale = useLocale();
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateResult, setGenerateResult] = useState<{ generated: number; skipped: number; errors: number } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data, isLoading } = usePayroll({ year, month, limit: 100 });
  const generatePayroll = useGeneratePayroll();
  const { data: empData } = useEmployees({ limit: 500 });

  const allEmployees: any[] = (empData as any)?.data?.items || (empData as any)?.items || (empData as any)?.data || [];
  const empMap = new Map(allEmployees.map((e: any) => [e.id, e]));

  const items: PayrollItem[] = data?.items || [];

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    const result = await generatePayroll.mutateAsync({ year, month });
    setGenerateResult({ generated: result.generated, skipped: result.skipped ?? 0, errors: result.errors ?? 0 });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="كشوف الرواتب"
        description="عرض وتوليد رواتب الموظفين"
        actions={
          <Button onClick={() => setGenerateOpen(true)} className="gap-2">
            <Play className="h-4 w-4" />
            توليد الرواتب
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">السنة:</span>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">الشهر:</span>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-sm text-muted-foreground">
              {items.length > 0 ? `${items.length} موظف` : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>الموظف</TableHead>
              <TableHead>القسم</TableHead>
              <TableHead>الراتب الأساسي</TableHead>
              <TableHead>الراتب الإجمالي</TableHead>
              <TableHead className="text-green-700">المكافآت</TableHead>
              <TableHead className="text-red-600">الجزاءات</TableHead>
              <TableHead className="font-semibold">صافي الراتب</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  لا توجد بيانات — اضغط "توليد الرواتب" لإنشاء كشوف هذا الشهر
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const emp = empMap.get(item.employeeId);
                const bonusDetails = parseBonusDetails(item.bonusDetails);
                const penaltyDetails = parsePenaltyDetails(item.penaltyDetails);
                const bonus = parseMoney(item.bonusAmount);
                const penalty = parseMoney(item.penaltyAmount);
                const isExpanded = expandedRows.has(item.id);
                const hasDetails = bonusDetails.length > 0 || penaltyDetails.length > 0;

                return (
                  <>
                    <TableRow key={item.id} className="cursor-pointer hover:bg-muted/30">
                      <TableCell>
                        {hasDetails && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand(item.id)}>
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {emp ? `${emp.firstNameAr} ${emp.lastNameAr}` : item.employee?.firstNameAr ? `${item.employee.firstNameAr} ${item.employee.lastNameAr}` : "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">{emp?.employeeNumber || item.employee?.employeeNumber}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {emp?.department?.nameAr || item.employee?.department?.nameAr || "—"}
                      </TableCell>
                      <TableCell className="text-sm">${parseMoney(item.basicSalary).toLocaleString("en-US")}</TableCell>
                      <TableCell className="text-sm">${parseMoney(item.grossSalary).toLocaleString("en-US")}</TableCell>
                      <TableCell>
                        {bonus > 0 ? (
                          <Badge className="bg-green-50 text-green-700 border-green-200 font-mono text-xs">
                            +${bonus.toLocaleString("en-US")}
                          </Badge>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        {penalty > 0 ? (
                          <Badge className="bg-red-50 text-red-700 border-red-200 font-mono text-xs">
                            -${penalty.toLocaleString("en-US")}
                          </Badge>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell className="font-semibold text-sm">
                        ${parseMoney(item.netSalary).toLocaleString("en-US")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/${locale}/payroll/${item.employeeId}/${year}/${month}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Expanded details */}
                    {isExpanded && hasDetails && (
                      <TableRow key={`${item.id}-details`} className="bg-muted/20">
                        <TableCell />
                        <TableCell colSpan={8} className="py-3">
                          <div className="space-y-3 text-sm">
                            {bonusDetails.length > 0 && (
                              <div>
                                <p className="font-medium text-green-700 mb-1">تفاصيل المكافآت:</p>
                                <div className="space-y-1">
                                  {bonusDetails.map((b, i) => (
                                    <div key={i} className="flex items-center gap-2 text-green-800">
                                      <span className="font-mono text-xs bg-green-100 rounded px-1.5 py-0.5">+${b.amount.toLocaleString("en-US")}</span>
                                      <span>{b.reason}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {penaltyDetails.length > 0 && (
                              <div>
                                <p className="font-medium text-red-600 mb-1">تفاصيل الجزاءات:</p>
                                <div className="space-y-1">
                                  {penaltyDetails.map((p, i) => (
                                    <div key={i} className="flex items-center gap-2 text-red-700">
                                      <span className="font-mono text-xs bg-red-100 rounded px-1.5 py-0.5">-${p.amount.toLocaleString("en-US")}</span>
                                      <span>{p.description}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Generate Confirm Dialog */}
      <Dialog open={generateOpen} onOpenChange={(open) => { setGenerateOpen(open); if (!open) setGenerateResult(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>توليد رواتب {MONTHS.find((m) => m.value === month)?.label} {year}</DialogTitle>
          </DialogHeader>

          {generateResult ? (
            <div className="space-y-2 py-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-600 text-base">✅</span>
                <span>تم توليد: <span className="font-semibold">{generateResult.generated}</span> موظف</span>
              </div>
              {generateResult.skipped > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-amber-500 text-base">⏭️</span>
                  <span>تم تخطي: <span className="font-semibold">{generateResult.skipped}</span> موظف (كشوفهم معتمدة مسبقاً)</span>
                </div>
              )}
              {generateResult.errors > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-destructive text-base">❌</span>
                  <span>أخطاء: <span className="font-semibold">{generateResult.errors}</span> موظف</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              سيتم توليد كشوف رواتب جميع الموظفين النشطين لشهر{" "}
              <span className="font-medium">{MONTHS.find((m) => m.value === month)?.label} {year}</span>.
              إذا كانت الرواتب معتمدة مسبقاً فلن يُعاد توليدها.
            </p>
          )}

          <DialogFooter>
            {generateResult ? (
              <Button onClick={() => { setGenerateOpen(false); setGenerateResult(null); }}>إغلاق</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setGenerateOpen(false)}>إلغاء</Button>
                <Button onClick={handleGenerate} disabled={generatePayroll.isPending}>
                  {generatePayroll.isPending ? "جاري التوليد..." : "توليد الرواتب"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
