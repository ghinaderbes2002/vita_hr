"use client";

import { useState } from "react";
import { Download, Star, BarChart2, Users, ClipboardCheck } from "lucide-react";
import { useTranslations } from "next-intl";
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
const RECOMMENDATION_COLORS: Record<string, string> = {
  SALARY_INCREASE: "bg-green-100 text-green-700",
  PROMOTION: "bg-blue-100 text-blue-700",
  TRAINING: "bg-amber-100 text-amber-700",
  WARNING: "bg-orange-100 text-orange-700",
  TERMINATION: "bg-red-100 text-red-700",
  NO_ACTION: "bg-gray-100 text-gray-600",
};

const TAB_ICONS = {
  grades: Star,
  departments: BarChart2,
  recommendations: ClipboardCheck,
} as const;

export default function EvaluationReportsPage() {
  const t = useTranslations("reports");
  const tEval = useTranslations("reports.evaluation");

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

  const avgScoreKey = tEval("departments.avgScoreKey");
  const topScoreKey = tEval("departments.topScoreKey");
  const countKey = tEval("recommendations.countKey");

  const PeriodFilter = () => (
    <select
      value={periodId}
      onChange={(e) => setPeriodId(e.target.value)}
      className="h-8 rounded-md border bg-background px-2 text-sm min-w-[180px]"
    >
      <option value="">{tEval("allPeriods")}</option>
      {periods.map((p: any) => (
        <option key={p.id} value={p.id}>{p.nameAr}</option>
      ))}
    </select>
  );

  const tabs = (["grades", "departments", "recommendations"] as const);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{tEval("title")}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{tEval("description")}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border p-1 w-fit flex-wrap">
        {tabs.map((key) => {
          const Icon = TAB_ICONS[key];
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />{tEval(`tabs.${key}`)}
            </button>
          );
        })}
      </div>

      {/* ─── Grade Distribution ─────────────────────────────────────── */}
      {activeTab === "grades" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-semibold">{tEval("grades.title")}</h2>
            <div className="flex items-center gap-2">
              <PeriodFilter />
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                onClick={() => downloadCsv(`/evaluation-reports/grade-distribution${periodId ? `?periodId=${periodId}` : ""}`, "grade-distribution")}>
                <Download className="h-3.5 w-3.5" />CSV
              </Button>
            </div>
          </div>

          {gradeLoading ? <Skeleton className="h-64 w-full" /> : !grades ? (
            <p className="text-center py-12 text-sm text-muted-foreground">{tEval("noData")}</p>
          ) : (
            <>
              {/* KPI */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-5 text-center">
                    <p className="text-3xl font-bold text-primary">{grades.totalForms ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">{tEval("grades.totalForms")}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5 text-center">
                    <p className="text-3xl font-bold text-green-600">{grades.completed ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">{tEval("grades.completed")}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5 text-center">
                    <p className="text-3xl font-bold text-amber-600">{grades.avgScore?.toFixed(1) ?? "—"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{tEval("grades.avgScore")}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              {(grades.gradeDistribution || []).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pie */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">{tEval("grades.pieTitle")}</CardTitle>
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
                      <CardTitle className="text-sm font-medium">{tEval("grades.barTitle")}</CardTitle>
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
                          <Bar dataKey="count" name={tEval("grades.countKey")} radius={[4, 4, 0, 0]}>
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
                          <th className="px-4 py-3 text-right font-medium">{tEval("grades.grade")}</th>
                          <th className="px-4 py-3 text-center font-medium">{tEval("grades.count")}</th>
                          <th className="px-4 py-3 text-center font-medium">{tEval("grades.percentage")}</th>
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

      {/* ─── Department Comparison ─────────────────────────────────────── */}
      {activeTab === "departments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-semibold">{tEval("departments.title")}</h2>
            <div className="flex items-center gap-2">
              <PeriodFilter />
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                onClick={() => downloadCsv(`/evaluation-reports/department-comparison${periodId ? `?periodId=${periodId}` : ""}`, "dept-comparison")}>
                <Download className="h-3.5 w-3.5" />CSV
              </Button>
            </div>
          </div>

          {deptLoading ? <Skeleton className="h-64 w-full" /> : !depts?.departments?.length ? (
            <p className="text-center py-12 text-sm text-muted-foreground">{tEval("noData")}</p>
          ) : (
            <>
              {/* Bar chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{tEval("departments.chartTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={depts.departments.map((d: any) => ({
                        name: d.departmentAr?.slice(0, 12),
                        [avgScoreKey]: d.avgScore,
                        [topScoreKey]: d.topScore,
                      }))}
                      margin={{ top: 5, right: 10, left: 0, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey={avgScoreKey} fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey={topScoreKey} fill="#22c55e" radius={[4, 4, 0, 0]} />
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
                          <th className="px-4 py-3 text-right font-medium">{tEval("departments.department")}</th>
                          <th className="px-4 py-3 text-center font-medium">{tEval("departments.totalForms")}</th>
                          <th className="px-4 py-3 text-center font-medium">{tEval("departments.completed")}</th>
                          <th className="px-4 py-3 text-center font-medium">{tEval("departments.avgScore")}</th>
                          <th className="px-4 py-3 text-center font-medium">{tEval("departments.topScore")}</th>
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

      {/* ─── Recommendations ─────────────────────────────────────────────── */}
      {activeTab === "recommendations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-semibold">{tEval("recommendations.title")}</h2>
            <div className="flex items-center gap-2">
              <PeriodFilter />
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                onClick={() => downloadCsv(`/evaluation-reports/recommendations${periodId ? `?periodId=${periodId}` : ""}`, "recommendations")}>
                <Download className="h-3.5 w-3.5" />CSV
              </Button>
            </div>
          </div>

          {recLoading ? <Skeleton className="h-64 w-full" /> : !recs ? (
            <p className="text-center py-12 text-sm text-muted-foreground">{tEval("noData")}</p>
          ) : (
            <>
              {/* Summary badges */}
              {(recs.summary || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {recs.summary.map((s: any) => {
                    const color = RECOMMENDATION_COLORS[s.recommendation] || "bg-gray-100 text-gray-600";
                    const label = tEval(`recommendation.${s.recommendation}`) || s.recommendation;
                    return (
                      <div key={s.recommendation} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${color}`}>
                        <Users className="h-3.5 w-3.5" />
                        {label}: <span className="font-bold">{s.count}</span>
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
                          name: tEval(`recommendation.${s.recommendation}`) || s.recommendation,
                          [countKey]: s.count,
                        }))}
                        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey={countKey} fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Table */}
              <Card>
                <CardContent className="p-0">
                  {!(recs.items?.length) ? (
                    <p className="text-center py-8 text-sm text-muted-foreground">{tEval("noData")}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-right font-medium">{tEval("recommendations.employee")}</th>
                            <th className="px-4 py-3 text-center font-medium">{tEval("recommendations.finalScore")}</th>
                            <th className="px-4 py-3 text-center font-medium">{tEval("recommendations.hrRecommendation")}</th>
                            <th className="px-4 py-3 text-center font-medium">{tEval("recommendations.gmDecision")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recs.items.map((it: any) => {
                            const recColor = RECOMMENDATION_COLORS[it.hrRecommendation] || "bg-gray-100 text-gray-600";
                            const recLabel = it.hrRecommendation ? tEval(`recommendation.${it.hrRecommendation}`) || it.hrRecommendation : "—";
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
                                  <Badge className={`text-xs ${recColor}`}>{recLabel}</Badge>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {it.gmStatus === "APPROVED" ? (
                                    <Badge className="text-xs bg-green-100 text-green-700">{tEval("recommendations.gmApproved")}</Badge>
                                  ) : it.gmStatus === "REJECTED" ? (
                                    <Badge className="text-xs bg-red-100 text-red-700">{tEval("recommendations.gmRejected")}</Badge>
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
