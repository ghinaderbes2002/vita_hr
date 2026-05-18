"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ScoreEntry {
  criteriaId: string;
  score: number | null;
  selfScore: number | null;
  criteria?: { id: string; nameAr: string; displayOrder?: number };
}

interface FinalScoreCardProps {
  finalScorePercent?: number | null;
  managerScorePercent?: number | null;
  selfScorePercent?: number | null;
  managerWeight?: number;
  selfWeight?: number;
  scores: ScoreEntry[];
}

function CircleProgress({
  value,
  size = 120,
  stroke = 10,
}: {
  value: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(Math.max(value, 0), 100) / 100) * circ;
  const color = value >= 70 ? "#16a34a" : value >= 50 ? "#d97706" : "#dc2626";

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FinalScoreCard({
  finalScorePercent,
  managerScorePercent,
  selfScorePercent,
  managerWeight = 70,
  selfWeight = 30,
  scores,
}: FinalScoreCardProps) {
  if (finalScorePercent == null && managerScorePercent == null && selfScorePercent == null) return null;

  const final = finalScorePercent ?? 0;
  const manager = managerScorePercent ?? 0;
  const self = selfScorePercent ?? 0;

  const finalColor =
    final >= 70 ? "text-green-700" : final >= 50 ? "text-amber-600" : "text-red-600";
  const cardBorder =
    final >= 70
      ? "border-green-200 bg-green-50/40"
      : final >= 50
      ? "border-amber-200 bg-amber-50/40"
      : "border-red-200 bg-red-50/40";

  const sorted = [...scores].sort(
    (a, b) => (a.criteria?.displayOrder ?? 99) - (b.criteria?.displayOrder ?? 99)
  );

  const hasBreakdown = sorted.some((s) => s.score != null || s.selfScore != null);

  return (
    <Card className={cardBorder}>
      <CardHeader className="pb-3">
        <CardTitle className={`text-base ${finalColor}`}>النتيجة النهائية للتقييم</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Circular progress row */}
        <div className="flex items-center gap-8 flex-wrap">
          {/* Big circle — final */}
          <div className="relative flex items-center justify-center shrink-0">
            <CircleProgress value={final} size={120} stroke={10} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className={`text-2xl font-bold leading-none ${finalColor}`}>
                {final.toFixed(1)}%
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">المجموع</span>
            </div>
          </div>

          {/* Sub-score mini-circles */}
          <div className="flex flex-col gap-3">
            {managerScorePercent != null && (
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center shrink-0">
                  <CircleProgress value={manager} size={64} stroke={6} />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-[11px] font-bold">{manager.toFixed(0)}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-700">تقييم المدير</p>
                  <p className="text-xs text-muted-foreground">وزن {managerWeight}%</p>
                </div>
              </div>
            )}
            {selfScorePercent != null && (
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center shrink-0">
                  <CircleProgress value={self} size={64} stroke={6} />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-[11px] font-bold">{self.toFixed(0)}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-indigo-700">التقييم الذاتي</p>
                  <p className="text-xs text-muted-foreground">وزن {selfWeight}%</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Criteria breakdown table */}
        {hasBreakdown && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">تفصيل المعايير</p>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right p-2 font-medium">المعيار</th>
                    <th className="text-center p-2 font-medium text-blue-700">مدير</th>
                    <th className="text-center p-2 font-medium text-indigo-700">ذاتي</th>
                    <th className="text-center p-2 font-medium w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s) => {
                    const diff =
                      s.score != null && s.selfScore != null
                        ? Math.abs(s.score - s.selfScore)
                        : null;
                    const indicator =
                      diff == null ? null : diff < 1 ? "✓" : diff >= 2 ? "⚠️" : null;
                    return (
                      <tr key={s.criteriaId} className="border-t">
                        <td className="p-2">{s.criteria?.nameAr || s.criteriaId}</td>
                        <td className="p-2 text-center font-medium text-blue-700">
                          {s.score != null ? s.score : <span className="text-muted-foreground font-normal">—</span>}
                        </td>
                        <td className="p-2 text-center font-medium text-indigo-700">
                          {s.selfScore != null ? s.selfScore : <span className="text-muted-foreground font-normal">—</span>}
                        </td>
                        <td className="p-2 text-center">
                          {indicator && (
                            <span
                              title={
                                diff != null && diff >= 2
                                  ? "فارق كبير بين التقييمين"
                                  : "تقييمان متقاربان"
                              }
                            >
                              {indicator}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
