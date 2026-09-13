"use client";

// The clinic's time field: a popover of tappable hour/minute chips instead of
// the native `<input type="time">`, whose browser picker ignores the clinic day.
// The value stays "HH:mm"; only what is shown is 12-hour, like the rest of the site.
import { Calendar as CalendarIcon } from "lucide-react";
import { formatClockTime } from "@/lib/utils/date";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** The clinic day — same window the appointment timeline draws. */
const HOURS = Array.from({ length: 9 }, (_, i) => String(10 + i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
/** "13" → "1 م" — the chip keeps its 24-hour value, only the label is 12-hour. */
const hourLabel = (h: string) => {
  const n = Number(h);
  return `${n % 12 === 0 ? 12 : n % 12} ${n < 12 ? "ص" : "م"}`;
};

export function TimePicker({
  value,
  onChange,
  className,
}: {
  /** "HH:mm", or "" when nothing is picked yet. */
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [hour, minute] = (value || "").split(":");
  // A half-picked time is still a time: default the other half rather than
  // leaving the field empty until both chips are tapped.
  const set = (h: string, m: string) => onChange(`${h}:${m}`);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-between font-normal", className)}>
          <span className={value ? "" : "text-muted-foreground"}>{value ? formatClockTime(value) : "--:--"}</span>
          <CalendarIcon className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="text-center text-3xl font-bold tracking-widest mb-3 text-primary">
          {value ? formatClockTime(value) : "--:--"}
        </div>

        <p className="text-[11px] text-muted-foreground mb-1.5 font-medium">الساعة</p>
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {HOURS.map((h) => (
            <button
              key={h}
              type="button"
              className={cn(
                "py-1.5 rounded-md text-sm font-medium transition-colors",
                hour === h ? "bg-primary text-primary-foreground shadow" : "bg-muted hover:bg-muted/70",
              )}
              onClick={() => set(h, minute || "00")}
            >
              {hourLabel(h)}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground mb-1.5 font-medium">الدقيقة</p>
        <div className="grid grid-cols-6 gap-1">
          {MINUTES.map((m) => (
            <button
              key={m}
              type="button"
              className={cn(
                "py-1 rounded text-xs font-medium transition-colors",
                minute === m ? "bg-primary text-primary-foreground shadow" : "bg-muted hover:bg-muted/70",
              )}
              onClick={() => set(hour || "10", m)}
            >
              {m}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
