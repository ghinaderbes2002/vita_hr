"use client";

import { cn } from "@/lib/utils";

interface PainScaleProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  label?: string;
}

const PAIN_LABELS: Record<number, string> = {
  0: "لا ألم",
  1: "خفيف جداً",
  2: "خفيف",
  3: "خفيف معتدل",
  4: "معتدل",
  5: "معتدل شديد",
  6: "شديد",
  7: "شديد جداً",
  8: "شديد للغاية",
  9: "قريب من الأشد",
  10: "لا يُحتمل",
};

function getPainColor(v: number) {
  if (v === 0) return "bg-emerald-500";
  if (v <= 2) return "bg-green-400";
  if (v <= 4) return "bg-yellow-400";
  if (v <= 6) return "bg-orange-400";
  if (v <= 8) return "bg-red-400";
  return "bg-red-600";
}

export function PainScale({ value, onChange, readonly = false, label }: PainScaleProps) {
  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      <div className="flex gap-1">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(i)}
            className={cn(
              "flex-1 h-8 rounded text-xs font-bold transition-all",
              i === value
                ? `${getPainColor(i)} text-white scale-110 shadow-md`
                : "bg-gray-100 text-gray-500 hover:bg-gray-200",
              readonly && "cursor-default",
            )}
          >
            {i}
          </button>
        ))}
      </div>
      <p className="text-xs text-center text-muted-foreground">
        {value} — {PAIN_LABELS[value]}
      </p>
    </div>
  );
}
