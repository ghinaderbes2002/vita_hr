"use client";

import { useState, useRef, useCallback } from "react";
import { PainRegion as PainPoint } from "@/lib/api/clinic-physio";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ─── Pain type colors & labels (from GET /api/v1/physio/cases/pain-types) ─────

export const PAIN_TYPE_COLORS: Record<string, string> = {
  NORMAL:         "#F44336",
  NUMBNESS:       "#4CAF50",
  DULL_ACHE:      "#FF9800",
  HOT_BURNING:    "#E91E63",
  SHARP_STABBING: "#9C27B0",
  PINS:           "#FFEB3B",
  OTHER:          "#3b82f6", // frontend-defined default
};

const PAIN_TYPE_LABELS: Record<string, string> = {
  NORMAL:         "عادي",
  NUMBNESS:       "خدر",
  DULL_ACHE:      "ألم خفيف",
  HOT_BURNING:    "حارق",
  SHARP_STABBING: "حاد",
  PINS:           "واخز",
  OTHER:          "أخرى",
};

const PAIN_TYPES = Object.keys(PAIN_TYPE_COLORS);

function getDotColor(painType?: string, customPainTypes?: { name: string; color: string }[]) {
  if (painType?.startsWith("CUSTOM_")) {
    const idx = parseInt(painType.replace("CUSTOM_", ""), 10);
    return customPainTypes?.[idx]?.color ?? "#3b82f6";
  }
  if (painType === "OTHER") return customPainTypes?.[0]?.color ?? "#3b82f6";
  return PAIN_TYPE_COLORS[painType ?? ""] ?? "#ef4444";
}

// ─── HumanBodyMap ─────────────────────────────────────────────────────────────

interface HumanBodyMapProps {
  points: PainPoint[];
  onAreaClick?: (x: number, y: number) => void;
  onPointClick?: (index: number) => void;
  readonly?: boolean;
  customPainTypes?: { name: string; color: string }[];
}

function HumanBodyMap({ points, onAreaClick, onPointClick, readonly = false, customPainTypes }: HumanBodyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (readonly || !onAreaClick || !imgRef.current) return;
    if ((e.target as HTMLElement).closest("[data-pain-marker]")) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    onAreaClick(x, y);
  }, [readonly, onAreaClick]);

  return (
    <div className="select-none mx-auto" style={{ width: "520px" }}>
      <div
        ref={containerRef}
        className={`relative ${readonly ? "" : "cursor-crosshair"}`}
        onClick={handleContainerClick}
      >
        <img ref={imgRef} src="/human.svg" alt="خريطة جسم الإنسان" className="w-full h-auto block" draggable={false} />
        {points.map((pt, i) => {
          const color = getDotColor(pt.painType, customPainTypes);
          return (
            <div
              key={i}
              data-pain-marker="1"
              onClick={(e) => { e.stopPropagation(); if (!readonly) onPointClick?.(i); }}
              style={{
                position: "absolute",
                left: `${pt.x}%`, top: `${pt.y}%`,
                transform: "translate(-50%, -50%)",
                width: 14, height: 14, borderRadius: "50%",
                backgroundColor: color,
                border: "2px solid white",
                boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
                cursor: readonly ? "default" : "pointer",
                zIndex: 10,
              }}
            />
          );
        })}
      </div>
      {!readonly && (
        <p className="text-[10px] text-muted-foreground text-center mt-1 select-none pointer-events-none">
          انقر على الجسم لتحديد موقع الألم · انقر على النقطة لحذفها
        </p>
      )}
    </div>
  );
}

// ─── BodyPainMap ──────────────────────────────────────────────────────────────

interface BodyPainMapProps {
  points: PainPoint[];
  onChange?: (points: PainPoint[]) => void;
  readonly?: boolean;
  customPainTypes?: { name: string; color: string }[];
  otherColor?: string;
  otherLabel?: string;
}

export function BodyPainMap({ points, onChange, readonly = false, customPainTypes = [], otherColor, otherLabel }: BodyPainMapProps) {
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);
  const [activePainType, setActivePainType] = useState<string>("DULL_ACHE");

  const effectiveCustom = customPainTypes.length > 0
    ? customPainTypes
    : otherColor || otherLabel ? [{ name: otherLabel || "أخرى", color: otherColor || "#3b82f6" }] : [];

  function getColor(type: string) {
    if (type.startsWith("CUSTOM_")) {
      const idx = parseInt(type.replace("CUSTOM_", ""), 10);
      return effectiveCustom[idx]?.color ?? "#3b82f6";
    }
    return PAIN_TYPE_COLORS[type] ?? "#ef4444";
  }

  function getLabel(type: string) {
    if (type.startsWith("CUSTOM_")) {
      const idx = parseInt(type.replace("CUSTOM_", ""), 10);
      return effectiveCustom[idx]?.name || "أخرى";
    }
    return PAIN_TYPE_LABELS[type] ?? type;
  }

  const standardTypes = PAIN_TYPES.filter((t) => t !== "OTHER");
  const allTypes = [...standardTypes, ...effectiveCustom.map((_, i) => `CUSTOM_${i}`)];

  return (
    <div className="space-y-3">
      {!readonly && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground text-center">اختر نوع الألم قبل التحديد على الجسم</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {allTypes.map((type) => {
              const color = getColor(type);
              const active = activePainType === type;
              return (
                <button key={type} type="button" onClick={() => setActivePainType(type)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border transition-all"
                  style={{
                    borderColor: active ? color : "#e5e7eb",
                    backgroundColor: active ? color + "20" : "transparent",
                    color: active ? color : "#6b7280",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  {getLabel(type)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <HumanBodyMap
        points={points}
        onAreaClick={readonly ? undefined : (x, y) => onChange?.([...points, { side: "front", x, y, intensity: 0, painType: activePainType }])}
        onPointClick={readonly ? undefined : (i) => setConfirmIndex(i)}
        readonly={readonly}
        customPainTypes={effectiveCustom}
      />

      {readonly && points.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {allTypes.filter((t) => points.some((p) => p.painType === t)).map((type) => (
            <span key={type} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getColor(type) }} />
              {getLabel(type)}
            </span>
          ))}
        </div>
      )}

      {points.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {points.map((pt, i) => {
            const color = getDotColor(pt.painType, effectiveCustom);
            return (
              <button key={i} type="button" onClick={() => !readonly && setConfirmIndex(i)} disabled={readonly}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border transition-colors disabled:cursor-default"
                style={{ borderColor: color + "60", backgroundColor: color + "15", color }}
              >
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                نقطة {i + 1}
                {pt.painType && <span className="opacity-70">· {getLabel(pt.painType)}</span>}
                {!readonly && <span className="opacity-60 text-[10px]">×</span>}
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={confirmIndex !== null} onOpenChange={(o) => !o && setConfirmIndex(null)}>
        <DialogContent className="max-w-xs" dir="rtl">
          <DialogHeader><DialogTitle>حذف نقطة الألم</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">هل تريد حذف نقطة {confirmIndex !== null ? confirmIndex + 1 : ""}؟</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmIndex(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => {
              if (confirmIndex === null) return;
              onChange?.(points.filter((_, i) => i !== confirmIndex));
              setConfirmIndex(null);
            }}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
