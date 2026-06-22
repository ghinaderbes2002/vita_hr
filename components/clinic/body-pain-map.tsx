"use client";

import { useState, useRef, useCallback } from "react";
import { PainRegion as PainPoint } from "@/lib/api/clinic-physio";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ─── Pain type colors & labels ────────────────────────────────────────────────

export const PAIN_TYPE_COLORS: Record<string, string> = {
  NORMAL:         "#ef4444",
  NUMBNESS:       "#22c55e",
  DULL_ACHE:      "#f97316",
  HOT_BURNING:    "#fb923c",
  SHARP_STABBING: "#a855f7",
  PINS:           "#eab308",
};

const PAIN_TYPE_LABELS: Record<string, string> = {
  NORMAL:         "عادي",
  NUMBNESS:       "خدر",
  DULL_ACHE:      "ألم خفيف",
  HOT_BURNING:    "حارق",
  SHARP_STABBING: "حاد",
  PINS:           "واخز",
};

const FIXED_PAIN_TYPES = Object.keys(PAIN_TYPE_COLORS);

export interface CustomPainType {
  id: string;
  name: string;
  color: string;
}

function getDotColor(painType?: string, customTypes?: CustomPainType[]) {
  if (painType && customTypes) {
    const custom = customTypes.find((c) => c.id === painType);
    if (custom) return custom.color;
  }
  return PAIN_TYPE_COLORS[painType ?? ""] ?? "#ef4444";
}

// ─── HumanBodyMap ─────────────────────────────────────────────────────────────

interface HumanBodyMapProps {
  points: PainPoint[];
  onAreaClick?: (x: number, y: number) => void;
  onPointClick?: (index: number) => void;
  readonly?: boolean;
  customTypes?: CustomPainType[];
}

function HumanBodyMap({ points, onAreaClick, onPointClick, readonly = false, customTypes }: HumanBodyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (readonly || !onAreaClick || !containerRef.current) return;
    if ((e.target as HTMLElement).closest("[data-pain-marker]")) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onAreaClick(x, y);
  }, [readonly, onAreaClick]);

  return (
    <div
      ref={containerRef}
      className={`relative select-none mx-auto ${readonly ? "" : "cursor-crosshair"}`}
      style={{ width: "520px" }}
      onClick={handleContainerClick}
    >
      <img
        src="/human.svg"
        alt="خريطة جسم الإنسان"
        className="w-full h-auto block"
        draggable={false}
      />
      {points.map((pt, i) => {
        const color = getDotColor(pt.painType, customTypes);
        return (
          <div
            key={i}
            data-pain-marker="1"
            onClick={(e) => { e.stopPropagation(); if (!readonly) onPointClick?.(i); }}
            style={{
              position: "absolute",
              left: `${pt.x}%`,
              top: `${pt.y}%`,
              transform: "translate(-50%, -50%)",
              width: 14,
              height: 14,
              borderRadius: "50%",
              backgroundColor: color,
              border: "2px solid white",
              boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
              cursor: readonly ? "default" : "pointer",
              zIndex: 10,
            }}
          />
        );
      })}
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
  customTypes?: CustomPainType[];
}

export function BodyPainMap({ points, onChange, readonly = false, customTypes = [] }: BodyPainMapProps) {
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);
  const [activePainType, setActivePainType] = useState<string>("DULL_ACHE");

  function handleAdd(x: number, y: number) {
    onChange?.([...points, { side: "front", x, y, intensity: 0, painType: activePainType }]);
  }

  function handleRemove() {
    if (confirmIndex === null) return;
    onChange?.(points.filter((_, i) => i !== confirmIndex));
    setConfirmIndex(null);
  }

  function getColor(type: string) {
    const custom = customTypes.find((c) => c.id === type);
    if (custom) return custom.color;
    return PAIN_TYPE_COLORS[type] ?? "#ef4444";
  }

  function getLabel(type: string) {
    const custom = customTypes.find((c) => c.id === type);
    if (custom) return custom.name || "أخرى";
    return PAIN_TYPE_LABELS[type] ?? type;
  }

  const allTypes = [
    ...FIXED_PAIN_TYPES.map((id) => ({ id, name: PAIN_TYPE_LABELS[id], color: PAIN_TYPE_COLORS[id] })),
    ...customTypes,
  ];

  return (
    <div className="space-y-3">
      {!readonly && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground text-center">اختر نوع الألم قبل التحديد على الجسم</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {allTypes.map(({ id, name, color }) => {
              const active = activePainType === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActivePainType(id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border transition-all"
                  style={{
                    borderColor: active ? color : "#e5e7eb",
                    backgroundColor: active ? color + "20" : "transparent",
                    color: active ? color : "#6b7280",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <HumanBodyMap
        points={points}
        onAreaClick={readonly ? undefined : handleAdd}
        onPointClick={readonly ? undefined : (i) => setConfirmIndex(i)}
        readonly={readonly}
        customTypes={customTypes}
      />

      {readonly && points.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {allTypes.filter(({ id }) => points.some((p) => p.painType === id)).map(({ id, name, color }) => (
            <span key={id} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              {name}
            </span>
          ))}
        </div>
      )}

      {points.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {points.map((pt, i) => {
            const color = getDotColor(pt.painType, customTypes);
            return (
              <button
                key={i}
                type="button"
                onClick={() => !readonly && setConfirmIndex(i)}
                disabled={readonly}
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
          <p className="text-sm text-muted-foreground">
            هل تريد حذف نقطة {confirmIndex !== null ? confirmIndex + 1 : ""}؟
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmIndex(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleRemove}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
