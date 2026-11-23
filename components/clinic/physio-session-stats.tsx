"use client";

// Total physio sessions applied across every patient, optionally within a date
// range. Counted by the API: the case list carries no sessions, and adding them
// up here would mean one request per case.

import { useState } from "react";
import { Activity, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePhysioSessionStats } from "@/lib/hooks/use-clinic-physio";

export function PhysioSessionStatsButton() {
  const [open, setOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data, isLoading, isError } = usePhysioSessionStats(
    { ...(dateFrom ? { dateFrom } : {}), ...(dateTo ? { dateTo } : {}) },
    open,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <Activity className="h-4 w-4" />
          الجلسات المطبقة
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4" dir="rtl">
        <p className="text-sm font-semibold">عدد الجلسات المطبقة لكل المرضى</p>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">من تاريخ</Label>
            <Input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">إلى تاريخ</Label>
            <Input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
        {(dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => { setDateFrom(""); setDateTo(""); }}
          >
            <X className="h-3.5 w-3.5" />
            كل الفترات
          </Button>
        )}

        <div className="rounded-md border bg-muted/40 p-3">
          {isLoading ? (
            <Skeleton className="h-14 w-full" />
          ) : isError || !data ? (
            <p className="text-center text-sm text-muted-foreground">تعذّر جلب عدد الجلسات</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground">إجمالي الجلسات</span>
                <span className="text-3xl font-bold tabular-nums">{data.totalSessions}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>المرضى: <span className="font-semibold tabular-nums text-foreground">{data.patients}</span></span>
                <span>الحالات: <span className="font-semibold tabular-nums text-foreground">{data.cases}</span></span>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
