"use client";

import { useState } from "react";
import { getDaysInMonth, startOfMonth, format } from "date-fns";
import { ar, enUS, tr, type Locale } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useHolidays } from "@/lib/hooks/use-holidays";
import { Holiday } from "@/types";

const TYPE_COLORS: Record<string, string> = {
  PUBLIC:   "bg-blue-500 text-white",
  NATIONAL: "bg-green-500 text-white",
  RELIGIOUS:"bg-amber-500 text-white",
  OTHER:    "bg-slate-400 text-white",
};
const DOT_COLORS: Record<string, string> = {
  PUBLIC:   "bg-blue-500",
  NATIONAL: "bg-green-500",
  RELIGIOUS:"bg-amber-500",
  OTHER:    "bg-slate-400",
};

// Saturday-first week: Jan 6 2024 = Sat
const SAT_FIRST_DATES = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 6 + i));

function MonthCard({
  year, month, holidays, dateLocale, holidayName,
}: {
  year: number;
  month: number;
  holidays: Holiday[];
  dateLocale: Locale;
  holidayName: (h: Holiday) => string;
}) {
  const firstDay = startOfMonth(new Date(year, month, 1));
  const daysInMonth = getDaysInMonth(firstDay);
  const startOffset = (firstDay.getDay() + 1) % 7;

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

  const monthName = format(firstDay, "MMMM", { locale: dateLocale });
  const dayNames = SAT_FIRST_DATES.map((d) => format(d, "EEEEE", { locale: dateLocale }));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 px-4 bg-muted/40">
        <CardTitle className="text-sm font-semibold">{monthName}</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {dayNames.map((d, i) => (
            <div key={i} className="text-center text-[10px] text-muted-foreground font-medium py-0.5">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const holiday = holidayDayMap.get(day);
            return (
              <div
                key={i}
                title={holiday ? holidayName(holiday) : undefined}
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
                <span className="truncate">{holidayName(h)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function HolidaysCalendarView() {
  const t = useTranslations();
  const locale = useLocale();
  const dateLocale = locale === "ar" ? ar : locale === "tr" ? tr : enUS;

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const years = Array.from({ length: 4 }, (_, i) => currentYear - 1 + i);

  const { data, isLoading } = useHolidays({ year });
  const holidays: Holiday[] = Array.isArray(data)
    ? data
    : (data as any)?.data?.items || (data as any)?.data || [];

  const holidayName = (h: Holiday) => locale === "ar" ? h.nameAr : (h.nameEn || h.nameAr);

  const totalHolidays = holidays.length;
  const upcomingHolidays = holidays
    .filter((h) => new Date(h.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const TYPE_KEYS: Record<string, string> = {
    PUBLIC: "public", NATIONAL: "national", RELIGIOUS: "religious", OTHER: "other",
  };

  return (
    <div className="space-y-4">
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
            <span className="text-sm text-muted-foreground">
              {t("holidays.holidaysCount", { count: totalHolidays })}
            </span>
          )}
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground">
          {Object.entries(TYPE_KEYS).map(([key, labelKey]) => (
            <span key={key} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full inline-block ${DOT_COLORS[key]}`} />
              {t(`holidays.types.${labelKey}` as any)}
            </span>
          ))}
        </div>
      </div>

      {!isLoading && upcomingHolidays.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {upcomingHolidays.map((h) => (
            <div key={h.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${DOT_COLORS[h.type] || DOT_COLORS.OTHER}`} />
              <span className="font-medium">{holidayName(h)}</span>
              <Badge variant="outline" className="text-xs">
                {format(new Date(h.date), "d MMMM", { locale: dateLocale })}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }, (_, i) => (
            <MonthCard
              key={i}
              year={year}
              month={i}
              holidays={holidays}
              dateLocale={dateLocale}
              holidayName={holidayName}
            />
          ))}
        </div>
      )}
    </div>
  );
}
