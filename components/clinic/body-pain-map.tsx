"use client";

import { useState, useRef, useCallback } from "react";
import { PainRegion as PainPoint } from "@/lib/api/clinic-physio";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface HumanBodyMapProps {
  points: PainPoint[];
  onAreaClick?: (x: number, y: number) => void;
  onPointClick?: (index: number) => void;
  readonly?: boolean;
}

function HumanBodyMap({ points, onAreaClick, onPointClick, readonly = false }: HumanBodyMapProps) {
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

      {points.map((pt, i) => (
        <div
          key={i}
          data-pain-marker="1"
          onClick={(e) => { e.stopPropagation(); if (!readonly) onPointClick?.(i); }}
          style={{
            position: "absolute",
            left: `${pt.x}%`,
            top: `${pt.y}%`,
            transform: "translate(-50%, -50%)",
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            backgroundColor: "#ef4444",
            border: "1.5px solid white",
            boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
            cursor: readonly ? "default" : "pointer",
            zIndex: 10,
          }}
        />
      ))}

      {!readonly && (
        <p className="text-[10px] text-muted-foreground text-center mt-1 select-none pointer-events-none">
          انقر على الجسم لتحديد موقع الألم · انقر على النقطة لحذفها
        </p>
      )}
    </div>
  );
}

interface BodyPainMapProps {
  points: PainPoint[];
  onChange?: (points: PainPoint[]) => void;
  readonly?: boolean;
}

export function BodyPainMap({ points, onChange, readonly = false }: BodyPainMapProps) {
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);

  function handleAdd(x: number, y: number) {
    onChange?.([...points, { side: "front", x, y, intensity: 0 }]);
  }

  function handleRemove() {
    if (confirmIndex === null) return;
    onChange?.(points.filter((_, i) => i !== confirmIndex));
    setConfirmIndex(null);
  }

  return (
    <div className="space-y-3">
      <HumanBodyMap
        points={points}
        onAreaClick={readonly ? undefined : handleAdd}
        onPointClick={readonly ? undefined : (i) => setConfirmIndex(i)}
        readonly={readonly}
      />

      {points.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {points.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => !readonly && setConfirmIndex(i)}
              disabled={readonly}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border bg-red-50 text-red-700 border-red-200 hover:bg-red-100 disabled:cursor-default"
            >
              <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
              نقطة {i + 1}
              {!readonly && <span className="opacity-60 text-[10px]">×</span>}
            </button>
          ))}
        </div>
      )}

      <Dialog open={confirmIndex !== null} onOpenChange={(o) => !o && setConfirmIndex(null)}>
        <DialogContent className="max-w-xs" dir="rtl">
          <DialogHeader>
            <DialogTitle>حذف نقطة الألم</DialogTitle>
          </DialogHeader>
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
