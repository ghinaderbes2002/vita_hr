"use client";

import { useState } from "react";
import { getDaysInMonth, startOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useHolidays } from "@/lib/hooks/use-holidays";
import { Holiday } from "@/types";

const MONTH_NAMES_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
const DAY_NAMES_AR = ["س", "أح", "اث", "ث", "أر", "خ", "ج"];

const TYPE_COLORS: Record<string, string> = {
  PUBLIC: "bg-blue-500 text-white",
  NATIONAL: "bg-green-500 text-white",
  RELIGIOUS: "bg-amber-500 text-white",
  OTHER: "bg-slate-400 text-white",
};
const DOT_COLORS: Record<string, string> = {
  PUBLIC: "bg-blue-500",
  NATIONAL: "bg-green-500",
  RELIGIOUS: "bg-amber-500",
  OTHER: "bg-slate-400",
};
const TYPE_LABELS: Record<string, string> = {
  PUBLIC: "رسمية",
  NATIONAL: "وطنية",
  RELIGIOUS: "دينية",
  OTHER: "أخرى",
};

function MonthCard({ year, month, holidays }: { year: number; month: number; holidays: Holiday[] }) {
  const firstDay = startOfMonth(new Date(year, month, 1));
  const daysInMonth = getDaysInMonth(firstDay);
  const startOffset = (firstDay.getDay() + 1) % 7; // Sat=0 based

  const holidayDayMap = new Map<number, Holiday>();
  for (const h of holidays) {
    const d = new Date(h.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      holidayDayMap.set(d.getDate(), h);
    }
  }

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 px-4 bg-muted/40">
        <CardTitle className="text-sm font-semibold">{MONTH_NAMES_AR[month]}</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {DAY_NAMES_AR.map((d) => (
            <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-0.5">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const holiday = holidayDayMap.get(day);
            return (
              <div
                key={i}
                title={holiday?.nameAr}
                className={`text-center text-xs py-1 rounded ${
                  holiday
                    ? (TYPE_COLORS[holiday.type] || TYPE_COLORS.OTHER) + " font-bold cursor-default"
                    : "text-foreground"
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>
        {holidayDayMap.size > 0 && (
          <div className="mt-2 space-y-1 border-t pt-2">
            {Array.from(holidayDayMap.entries()).map(([day, h]) => (
              <div key={day} className="flex items-center gap-1.5 text-xs">
                <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${DOT_COLORS[h.type] || DOT_COLORS.OTHER}`} />
                <span className="text-muted-foreground shrink-0">{day}</span>
                <span className="truncate">{h.nameAr}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function HolidaysCalendarView() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const years = Array.from({ length: 4 }, (_, i) => currentYear - 1 + i);

  const { data, isLoading } = useHolidays({ year });
  const holidays: Holiday[] = Array.isArray(data)
    ? data
    : (data as any)?.data?.items || (data as any)?.data || [];

  const totalHolidays = holidays.length;
  const upcomingHolidays = holidays
    .filter((h) => new Date(h.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Controls + stats */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isLoading && (
            <span className="text-sm text-muted-foreground">{totalHolidays} عطلة هذا العام</span>
          )}
        </div>
        {/* Legend */}
        <div className="flex gap-3 text-xs text-muted-foreground">
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <span key={key} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full inline-block ${DOT_COLORS[key]}`} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Upcoming holidays strip */}
      {!isLoading && upcomingHolidays.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {upcomingHolidays.map((h) => (
            <div key={h.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${DOT_COLORS[h.type] || DOT_COLORS.OTHER}`} />
              <span className="font-medium">{h.nameAr}</span>
              <Badge variant="outline" className="text-xs">
                {new Date(h.date).toLocaleDateString("ar-SA", { day: "numeric", month: "long" })}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Calendar grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }, (_, i) => (
            <MonthCard key={i} year={year} month={i} holidays={holidays} />
          ))}
        </div>
      )}
    </div>
  );
}
