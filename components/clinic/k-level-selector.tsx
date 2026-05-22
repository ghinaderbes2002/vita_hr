"use client";

import { cn } from "@/lib/utils";

type KLevel = "K0" | "K1" | "K2" | "K3" | "K4";

interface KLevelSelectorProps {
  value?: KLevel | null;
  onChange?: (value: KLevel) => void;
  readonly?: boolean;
}

const K_LEVELS: Array<{ value: KLevel; label: string; desc: string }> = [
  { value: "K0", label: "K0", desc: "غير قادر على المشي" },
  { value: "K1", label: "K1", desc: "مشي محدود في المنزل" },
  { value: "K2", label: "K2", desc: "مشي محدود مجتمعياً" },
  { value: "K3", label: "K3", desc: "مشي مجتمعي بدون قيود" },
  { value: "K4", label: "K4", desc: "نشاط رياضي عالي" },
];

export function KLevelSelector({ value, onChange, readonly = false }: KLevelSelectorProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {K_LEVELS.map((k) => (
        <button
          key={k.value}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(k.value)}
          className={cn(
            "flex flex-col items-center px-3 py-2 rounded-lg border-2 text-sm transition-all min-w-[70px]",
            value === k.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background hover:border-primary/50",
            readonly && "cursor-default opacity-75",
          )}
        >
          <span className="font-bold text-base">{k.label}</span>
          <span className={cn("text-xs text-center leading-tight mt-0.5", value === k.value ? "text-primary-foreground/80" : "text-muted-foreground")}>
            {k.desc}
          </span>
        </button>
      ))}
    </div>
  );
}
