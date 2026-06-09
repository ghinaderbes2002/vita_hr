"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  DollarSign, Play, Eye, ChevronDown, ChevronUp,
  FileSpreadsheet, RotateCcw, UserX, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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
import {
  usePayroll,
  useGeneratePayroll,
  useExportPayrollXlsx,
  useResetMonthPayroll,
} from "@/lib/hooks/use-payroll";
import { PayrollItem, BonusDetail, PenaltyDetail } from "@/lib/api/payroll";
import { useEmployeesBasicList } from "@/lib/hooks/use-employees";
import { ActionGuard } from "@/components/permissions/action-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { isResigned } from "@/lib/utils/employee-labels";
import { formatUSDRounded } from "@/lib/utils";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

function parseMoney(val: string | number | null | undefined): number {
  return Number(val) || 0;
}

function parseBonusDetails(val: string | BonusDetail[] | undefined): BonusDetail[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val as string) || []; } catch { return []; }
}

function parsePenaltyDetails(val: string | PenaltyDetail[] | undefined): PenaltyDetail[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val as string) || []; } catch { return []; }
}

export default function PayrollPage() {
  const t = useTranslations("payroll");
  const locale = useLocale();
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateResult, setGenerateResult] = useState<{ generated: number; skipped: number; errors: number } | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showResigned, setShowResigned] = useState(true);

  const { data, isLoading } = usePayroll({ year, month, limit: 200 });
  const generatePayroll = useGeneratePayroll();
  const exportXlsx = useExportPayrollXlsx();
  const resetMonth = useResetMonthPayroll();
  const { data: empData } = useEmployeesBasicList();

  const allEmployees: any[] = Array.isArray(empData) ? empData : [];
  const empMap = new Map(allEmployees.map((e: any) => [e.id, e]));

  const allItems: PayrollItem[] = data?.items || [];
  const items = showResigned ? allItems : allItems.filter((item) => !isResigned(item));
  const resignedCount = allItems.filter((item) => isResigned(item)).length;

  const MONTHS = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: t(`months.${i + 1}` as any),
  }));

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    const result = await generatePayroll.mutateAsync({ year, month });
    setGenerateResult({
      generated: result.generated,
      skipped: result.skipped ?? 0,
      errors: result.errors ?? 0,
    });
  };

  const handleReset = async () => {
    await resetMonth.mutateAsync({ year, month });
    setResetOpen(false);
  };

  const handleExport = () => {
    exportXlsx.mutate({ year, month });
  };

  const monthLabel = t(`months.${month}` as any);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExport}
              disabled={exportXlsx.isPending || allItems.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {exportXlsx.isPending ? t("exporting") : t("exportExcel")}
            </Button>
            <ActionGuard permission={PERMISSIONS.ATTENDANCE_PAYROLL.GENERATE}>
              <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={() => setResetOpen(true)}>
                <RotateCcw className="h-4 w-4" />
                {t("reset")}
              </Button>
            </ActionGuard>
            <ActionGuard permission={PERMISSIONS.ATTENDANCE_PAYROLL.GENERATE}>
              <Button onClick={() => setGenerateOpen(true)} className="gap-2">
                <Play className="h-4 w-4" />
                {t("generate")}
              </Button>
            </ActionGuard>
          </div>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t("yearLabel")}</span>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t("monthLabel")}</span>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {resignedCount > 0 && (
              <Button
                variant={showResigned ? "secondary" : "outline"}
                size="sm"
                className="gap-2 text-xs"
                onClick={() => setShowResigned((v) => !v)}
              >
                {showResigned ? <Users className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                {showResigned
                  ? t("hideResigned", { count: resignedCount })
                  : t("showResigned", { count: resignedCount })}
              </Button>
            )}

            {items.length > 0 && (
              <span className="text-sm text-muted-foreground">{t("employeeCount", { count: items.length })}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>{t("cols.employee")}</TableHead>
              <TableHead>{t("cols.department")}</TableHead>
              <TableHead>{t("cols.basicSalary")}</TableHead>
              <TableHead>{t("cols.grossSalary")}</TableHead>
              <TableHead className="text-green-700">{t("cols.bonuses")}</TableHead>
              <TableHead className="text-green-700">{t("cols.commissions")}</TableHead>
              <TableHead className="text-red-600">{t("cols.penalties")}</TableHead>
              <TableHead className="text-red-600">{t("cols.advances")}</TableHead>
              <TableHead className="text-red-600">{t("cols.otherDeductions")}</TableHead>
              <TableHead className="font-semibold">{t("cols.netSalary")}</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 12 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                  {t("emptyHint")}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const emp = empMap.get(item.employeeId);
                const bonusDetails = parseBonusDetails(item.bonusDetails);
                const penaltyDetails = parsePenaltyDetails(item.penaltyDetails);
                const bonus = parseMoney(item.bonusAmount);
                const penalty = parseMoney(item.penaltyAmount);
                const commission = parseMoney(item.commissionAmount);
                const advance = parseMoney(item.advanceDeduction);
                const otherDeduction = parseMoney(item.otherDeductionAmount);
                const isExpanded = expandedRows.has(item.id);
                const hasDetails = bonusDetails.length > 0 || penaltyDetails.length > 0;
                const resigned = isResigned(item);
                const netDisplay = item.roundedNetSalary != null
                  ? formatUSDRounded(item.roundedNetSalary)
                  : formatUSDRounded(item.netSalary);

                return (
                  <>
                    <TableRow
                      key={item.id}
                      className={`cursor-pointer hover:bg-muted/30 ${resigned ? "opacity-60" : ""}`}
                    >
                      <TableCell>
                        {hasDetails && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand(item.id)}>
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm flex items-center gap-1.5">
                            {emp
                              ? `${emp.firstNameAr} ${emp.lastNameAr}`
                              : item.employee?.firstNameAr
                              ? `${item.employee.firstNameAr} ${item.employee.lastNameAr}`
                              : "—"}
                            {resigned && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 text-red-600 border-red-300">{t("resigned")}</Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{emp?.employeeNumber || item.employee?.employeeNumber}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {emp?.department?.nameAr || item.employee?.department?.nameAr || "—"}
                      </TableCell>
                      <TableCell className="text-sm font-mono">{formatUSDRounded(item.basicSalary)}</TableCell>
                      <TableCell className="text-sm font-mono">{formatUSDRounded(item.grossSalary)}</TableCell>
                      <TableCell>
                        {bonus > 0 ? (
                          <Badge className="bg-green-50 text-green-700 border-green-200 font-mono text-xs">
                            +{formatUSDRounded(bonus)}
                          </Badge>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        {commission > 0 ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-xs">
                            +{formatUSDRounded(commission)}
                          </Badge>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        {penalty > 0 ? (
                          <Badge className="bg-red-50 text-red-700 border-red-200 font-mono text-xs">
                            -{formatUSDRounded(penalty)}
                          </Badge>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        {advance > 0 ? (
                          <Badge className="bg-orange-50 text-orange-700 border-orange-200 font-mono text-xs">
                            -{formatUSDRounded(advance)}
                          </Badge>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        {otherDeduction > 0 ? (
                          <Badge className="bg-red-50 text-red-700 border-red-200 font-mono text-xs" title={item.otherDeductionNotes || ""}>
                            -{formatUSDRounded(otherDeduction)}
                          </Badge>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell className="font-semibold text-sm font-mono">
                        {netDisplay}
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

                    {isExpanded && hasDetails && (
                      <TableRow key={`${item.id}-details`} className="bg-muted/20">
                        <TableCell />
                        <TableCell colSpan={11} className="py-3">
                          <div className="space-y-3 text-sm">
                            {bonusDetails.length > 0 && (
                              <div>
                                <p className="font-medium text-green-700 mb-1">{t("bonusDetailsLabel")}</p>
                                <div className="space-y-1">
                                  {bonusDetails.map((b, i) => (
                                    <div key={i} className="flex items-center gap-2 text-green-800">
                                      <span className="font-mono text-xs bg-green-100 rounded px-1.5 py-0.5">+{formatUSDRounded(b.amount)}</span>
                                      <span>{b.reason}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {penaltyDetails.length > 0 && (
                              <div>
                                <p className="font-medium text-red-600 mb-1">{t("penaltyDetailsLabel")}</p>
                                <div className="space-y-1">
                                  {penaltyDetails.map((p, i) => (
                                    <div key={i} className="flex items-center gap-2 text-red-700">
                                      <span className="font-mono text-xs bg-red-100 rounded px-1.5 py-0.5">-{formatUSDRounded(p.amount)}</span>
                                      <span>{p.description}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {item.otherDeductionNotes && (
                              <p className="text-xs text-muted-foreground">{t("deductionNoteLabel", { note: item.otherDeductionNotes })}</p>
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

      {/* Generate Dialog */}
      <Dialog
        open={generateOpen}
        onOpenChange={(open) => { setGenerateOpen(open); if (!open) setGenerateResult(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("generateDialog.title", { month: monthLabel, year })}</DialogTitle>
          </DialogHeader>

          {generateResult ? (
            <div className="space-y-2 py-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-600 text-base">✅</span>
                <span>{t("generateDialog.generated", { count: generateResult.generated })}</span>
              </div>
              {generateResult.skipped > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-amber-500 text-base">⏭️</span>
                  <span>{t("generateDialog.skipped", { count: generateResult.skipped })}</span>
                </div>
              )}
              {generateResult.errors > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-destructive text-base">❌</span>
                  <span>{t("generateDialog.errors", { count: generateResult.errors })}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("generateDialog.description", { month: monthLabel, year })}
            </p>
          )}

          <DialogFooter>
            {generateResult ? (
              <Button onClick={() => { setGenerateOpen(false); setGenerateResult(null); }}>{t("generateDialog.close")}</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setGenerateOpen(false)}>{t("generateDialog.close")}</Button>
                <Button onClick={handleGenerate} disabled={generatePayroll.isPending}>
                  {generatePayroll.isPending ? t("generateDialog.generating") : t("generateDialog.confirm")}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("resetDialog.title", { month: monthLabel, year })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("resetDialog.description", { month: monthLabel, year })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>{t("generateDialog.close")}</Button>
            <Button variant="destructive" onClick={handleReset} disabled={resetMonth.isPending}>
              {resetMonth.isPending ? t("resetDialog.resetting") : t("resetDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
