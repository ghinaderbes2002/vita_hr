"use client";

import { useState } from "react";
import { Download, Star, BarChart2, Users, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  useGradeDistributionReport,
  useDepartmentComparisonReport,
  useRecommendationsReport,
} from "@/lib/hooks/use-evaluation-reports";
import { useEvaluationPeriods } from "@/lib/hooks/use-evaluation-periods";
import { downloadCsv } from "@/lib/api/reports";

const GRADE_COLORS = ["#22c55e", "#84cc16", "#f59e0b", "#f97316", "#ef4444"];

const RECOMMENDATION_LABELS: Record<string, { label: string; color: string }> = {
  SALARY_INCREASE: { label: "زيادة راتب", color: "bg-green-100 text-green-700" },
  PROMOTION: { label: "ترقية", color: "bg-blue-100 text-blue-700" },
  TRAINING: { label: "تدريب", color: "bg-amber-100 text-amber-700" },
  WARNING: { label: "إنذار", color: "bg-orange-100 text-orange-700" },
  TERMINATION: { label: "إنهاء خدمة", color: "bg-red-100 text-red-700" },
  NO_ACTION: { label: "لا إجراء", color: "bg-gray-100 text-gray-600" },
};

const tabs = [
  { key: "grades", label: "توزيع الدرجات", icon: Star },
  { key: "departments", label: "مقارنة الأقسام", icon: BarChart2 },
  { key: "recommendations", label: "التوصيات", icon: ClipboardCheck },
] as const;

export default function EvaluationReportsPage() {
  const [activeTab, setActiveTab] = useState<"grades" | "departments" | "recommendations">("grades");
  const [periodId, setPeriodId] = useState<string>("");

  const { data: periodsData } = useEvaluationPeriods();
  const periods = Array.isArray((periodsData as any)?.data)
    ? (periodsData as any).data
    : Array.isArray((periodsData as any)?.data?.items)
    ? (periodsData as any).data.items
    : [];

  const params = { periodId: periodId || undefined };

  const { data: gradeData, isLoading: gradeLoading } = useGradeDistributionReport(params);
  const { data: deptData, isLoading: deptLoading } = useDepartmentComparisonReport(params);
  const { data: recData, isLoading: recLoading } = useRecommendationsReport(params);

  const grades = gradeData as any;
  const depts = deptData as any;
  const recs = recData as any;

  const PeriodFilter = () => (
    <select
      value={periodId}
      onChange={(e) => setPeriodId(e.target.value)}
      className="h-8 rounded-md border bg-background px-2 text-sm min-w-[180px]"
    >
      <option value="">كل الفترات</option>
      {periods.map((p: any) => (
        <option key={p.id} value={p.id}>{p.nameAr}</option>
      ))}
    </select>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">تقارير التقييم</h1>
        <p className="text-muted-foreground text-sm mt-0.5">إحصائيات وتحليلات نتائج التقييمات</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border p-1 w-fit flex-wrap">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ─── توزيع الدرجات ─────────────────────────────────────── */}
      {activeTab === "grades" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-semibold">توزيع الدرجات النهائية</h2>
            <div className="flex items-center gap-2">
              <PeriodFilter />
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                onClick={() => downloadCsv(`/evaluation-reports/grade-distribution${periodId ? `?periodId=${periodId}` : ""}`, "grade-distribution")}>
                <Download className="h-3.5 w-3.5" />CSV
              </Button>
            </div>
          </div>

          {gradeLoading ? <Skeleton className="h-64 w-full" /> : !grades ? (
            <p className="text-center py-12 text-sm text-muted-foreground">لا توجد بيانات</p>
          ) : (
            <>
              {/* KPI */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-5 text-center">
                    <p className="text-3xl font-bold text-primary">{grades.totalForms ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">إجمالي النماذج</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5 text-center">
                    <p className="text-3xl font-bold text-green-600">{grades.completed ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">مكتمل</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5 text-center">
                    <p className="text-3xl font-bold text-amber-600">{grades.avgScore?.toFixed(1) ?? "—"}</p>
                    <p className="text-xs text-muted-foreground mt-1">متوسط الدرجات</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              {(grades.gradeDistribution || []).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pie */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">توزيع التقييمات</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={grades.gradeDistribution}
                            dataKey="count"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ label, percentage }: any) => `${label} (${percentage?.toFixed(0)}%)`}
                          >
                            {grades.gradeDistribution.map((_: any, i: number) => (
                              <Cell key={i} fill={GRADE_COLORS[i % GRADE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Bar */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">عدد الموظفين لكل درجة</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                          data={grades.gradeDistribution}
                          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="count" name="عدد الموظفين" radius={[4, 4, 0, 0]}>
                            {grades.gradeDistribution.map((_: any, i: number) => (
                              <Cell key={i} fill={GRADE_COLORS[i % GRADE_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Table */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-right font-medium">التقدير</th>
                          <th className="px-4 py-3 text-center font-medium">عدد الموظفين</th>
                          <th className="px-4 py-3 text-center font-medium">النسبة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(grades.gradeDistribution || []).map((g: any, i: number) => (
                          <tr key={i} className="border-t hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: GRADE_COLORS[i % GRADE_COLORS.length] }} />
                                {g.label}
                                <span className="text-xs text-muted-foreground">({g.grade})</span>
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-semibold">{g.count}</td>
                            <td className="px-4 py-3 text-center text-muted-foreground">{g.percentage?.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ─── مقارنة الأقسام ─────────────────────────────────────── */}
      {activeTab === "departments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-semibold">مقارنة أداء الأقسام</h2>
            <div className="flex items-center gap-2">
              <PeriodFilter />
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                onClick={() => downloadCsv(`/evaluation-reports/department-comparison${periodId ? `?periodId=${periodId}` : ""}`, "dept-comparison")}>
                <Download className="h-3.5 w-3.5" />CSV
              </Button>
            </div>
          </div>

          {deptLoading ? <Skeleton className="h-64 w-full" /> : !depts?.departments?.length ? (
            <p className="text-center py-12 text-sm text-muted-foreground">لا توجد بيانات</p>
          ) : (
            <>
              {/* Bar chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">متوسط الدرجات بالقسم</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={depts.departments.map((d: any) => ({
                        name: d.departmentAr?.slice(0, 12),
                        "متوسط الدرجة": d.avgScore,
                        "أعلى درجة": d.topScore,
                      }))}
                      margin={{ top: 5, right: 10, left: 0, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="متوسط الدرجة" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="أعلى درجة" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Table */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-right font-medium">القسم</th>
                          <th className="px-4 py-3 text-center font-medium">إجمالي النماذج</th>
                          <th className="px-4 py-3 text-center font-medium">مكتمل</th>
                          <th className="px-4 py-3 text-center font-medium">متوسط الدرجة</th>
                          <th className="px-4 py-3 text-center font-medium">أعلى درجة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {depts.departments.map((d: any) => (
                          <tr key={d.departmentId} className="border-t hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium">{d.departmentAr}</td>
                            <td className="px-4 py-3 text-center">{d.totalForms}</td>
                            <td className="px-4 py-3 text-center">{d.completed}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`font-semibold ${d.avgScore >= 80 ? "text-green-600" : d.avgScore >= 60 ? "text-amber-600" : "text-red-600"}`}>
                                {d.avgScore?.toFixed(1)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-primary font-semibold">{d.topScore?.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ─── التوصيات ─────────────────────────────────────────────── */}
      {activeTab === "recommendations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-semibold">توصيات الموارد البشرية</h2>
            <div className="flex items-center gap-2">
              <PeriodFilter />
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                onClick={() => downloadCsv(`/evaluation-reports/recommendations${periodId ? `?periodId=${periodId}` : ""}`, "recommendations")}>
                <Download className="h-3.5 w-3.5" />CSV
              </Button>
            </div>
          </div>

          {recLoading ? <Skeleton className="h-64 w-full" /> : !recs ? (
            <p className="text-center py-12 text-sm text-muted-foreground">لا توجد بيانات</p>
          ) : (
            <>
              {/* Summary badges */}
              {(recs.summary || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {recs.summary.map((s: any) => {
                    const meta = RECOMMENDATION_LABELS[s.recommendation] || { label: s.recommendation, color: "bg-gray-100 text-gray-600" };
                    return (
                      <div key={s.recommendation} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${meta.color}`}>
                        <Users className="h-3.5 w-3.5" />
                        {meta.label}: <span className="font-bold">{s.count}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bar chart of recommendations */}
              {(recs.summary || []).length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={(recs.summary || []).map((s: any) => ({
                          name: RECOMMENDATION_LABELS[s.recommendation]?.label || s.recommendation,
                          عدد: s.count,
                        }))}
                        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="عدد" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Table */}
              <Card>
                <CardContent className="p-0">
                  {!(recs.items?.length) ? (
                    <p className="text-center py-8 text-sm text-muted-foreground">لا توجد بيانات</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-right font-medium">الموظف</th>
                            <th className="px-4 py-3 text-center font-medium">الدرجة النهائية</th>
                            <th className="px-4 py-3 text-center font-medium">توصية الموارد البشرية</th>
                            <th className="px-4 py-3 text-center font-medium">قرار المدير العام</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recs.items.map((it: any) => {
                            const recMeta = RECOMMENDATION_LABELS[it.hrRecommendation] || { label: it.hrRecommendation || "—", color: "bg-gray-100 text-gray-600" };
                            return (
                              <tr key={it.employee?.id} className="border-t hover:bg-muted/30">
                                <td className="px-4 py-3">
                                  <p className="font-medium">{it.employee?.firstNameAr} {it.employee?.lastNameAr}</p>
                                  <p className="text-xs text-muted-foreground">{it.employee?.employeeNumber}</p>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`font-bold text-base ${it.finalScore >= 80 ? "text-green-600" : it.finalScore >= 60 ? "text-amber-600" : "text-red-600"}`}>
                                    {it.finalScore?.toFixed(1)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Badge className={`text-xs ${recMeta.color}`}>{recMeta.label}</Badge>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {it.gmStatus === "APPROVED" ? (
                                    <Badge className="text-xs bg-green-100 text-green-700">موافق</Badge>
                                  ) : it.gmStatus === "REJECTED" ? (
                                    <Badge className="text-xs bg-red-100 text-red-700">مرفوض</Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">—</span>
                                  )}
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
