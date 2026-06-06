"use client";

import { useState, useRef, useCallback } from "react";
import { X, MapPin } from "lucide-react";
import { PainRegion as PainPoint } from "@/lib/api/clinic-physio";
import { PainScale } from "./pain-scale";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// ─── Pain intensity → color ───────────────────────────────────────────────────
const PAIN_COLORS = [
  "#22c55e","#4ade80","#a3e635","#facc15",
  "#fb923c","#f97316","#ef4444","#dc2626","#b91c1c","#7f1d1d","#450a0a",
];
function painColor(intensity: number) {
  return PAIN_COLORS[Math.min(10, Math.max(0, Math.round(intensity)))];
}

const PAIN_TYPES = ["Numbness","Dull Ache","Hot Burning","Sharp Stabbing","Pins","Other"];
const PAIN_TYPE_AR: Record<string, string> = {
  Numbness:       "خدر",
  "Dull Ache":    "ألم خفيف",
  "Hot Burning":  "حرقة",
  "Sharp Stabbing":"وخز حاد",
  Pins:           "إبر",
  Other:          "أخرى",
};

function painBadgeColor(intensity: number) {
  if (intensity <= 2) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (intensity <= 4) return "bg-amber-100   text-amber-800   border-amber-200";
  if (intensity <= 6) return "bg-orange-100  text-orange-800  border-orange-200";
  if (intensity <= 8) return "bg-red-100     text-red-800     border-red-200";
  return                      "bg-red-200     text-red-900     border-red-300";
}

// ─── Human body image with pain-point overlay ─────────────────────────────────
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
    // Ignore if clicked on a pain point marker
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
      style={{ width: "320px" }}
      onClick={handleContainerClick}
    >
      {/* The actual SVG image */}
      <img
        src="/human.svg"
        alt="خريطة جسم الإنسان"
        className="w-full h-auto block"
        draggable={false}
      />

      {/* Pain point markers */}
      {points.map((pt, i) => (
        <div
          key={i}
          data-pain-marker="1"
          title={`شدة: ${pt.intensity}/10${pt.painType ? ` · ${PAIN_TYPE_AR[pt.painType] ?? pt.painType}` : ""}${pt.notes ? `\n${pt.notes}` : ""}`}
          onClick={(e) => { e.stopPropagation(); if (!readonly) onPointClick?.(i); }}
          style={{
            position: "absolute",
            left: `${pt.x}%`,
            top: `${pt.y}%`,
            transform: "translate(-50%, -50%)",
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            backgroundColor: painColor(pt.intensity),
            border: "2.5px solid white",
            boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
            cursor: readonly ? "default" : "pointer",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "9px",
            fontWeight: "bold",
            color: "white",
          }}
        >
          {pt.intensity}
        </div>
      ))}

      {!readonly && (
        <p className="text-[10px] text-muted-foreground text-center mt-1 select-none pointer-events-none">
          انقر على الجسم لتحديد موقع الألم
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface BodyPainMapProps {
  points: PainPoint[];
  onChange?: (points: PainPoint[]) => void;
  readonly?: boolean;
}

export function BodyPainMap({ points, onChange, readonly = false }: BodyPainMapProps) {
  const [dialogOpen, setDialogOpen]       = useState(false);
  const [pendingPos, setPendingPos]       = useState<{ x: number; y: number } | null>(null);
  const [editingIndex, setEditingIndex]   = useState<number | null>(null);
  const [form, setForm] = useState({ intensity: 5, painType: "Dull Ache", notes: "" });

  function openAdd(x: number, y: number) {
    setPendingPos({ x, y });
    setEditingIndex(null);
    setForm({ intensity: 5, painType: "Dull Ache", notes: "" });
    setDialogOpen(true);
  }

  function openEdit(index: number) {
    const pt = points[index];
    setPendingPos({ x: pt.x, y: pt.y });
    setEditingIndex(index);
    setForm({ intensity: pt.intensity, painType: pt.painType ?? "Dull Ache", notes: pt.notes ?? "" });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!pendingPos) return;
    if (editingIndex !== null) {
      onChange?.(points.map((p, i) => i === editingIndex ? { ...p, ...form } : p));
    } else {
      const newPoint: PainPoint = {
        side: "front",
        x: pendingPos.x,
        y: pendingPos.y,
        ...form,
      };
      onChange?.([...points, newPoint]);
    }
    setDialogOpen(false);
  }

  function handleDelete() {
    if (editingIndex !== null) onChange?.(points.filter((_, i) => i !== editingIndex));
    setDialogOpen(false);
  }

  const isEditing = editingIndex !== null;

  return (
    <div className="space-y-4">
      <HumanBodyMap
        points={points}
        onAreaClick={readonly ? undefined : openAdd}
        onPointClick={readonly ? undefined : openEdit}
        readonly={readonly}
      />

      {/* Pain point list */}
      {points.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {points.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => !readonly && openEdit(i)}
              disabled={readonly}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${painBadgeColor(p.intensity)} ${!readonly ? "hover:opacity-80 cursor-pointer" : "cursor-default"}`}
            >
              <MapPin className="h-3 w-3 opacity-70" />
              <span>نقطة {i + 1}</span>
              <span className="opacity-70">· {p.intensity}/10</span>
              {p.painType && <span className="opacity-60">· {PAIN_TYPE_AR[p.painType] ?? p.painType}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "تعديل نقطة ألم" : "إضافة نقطة ألم"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>نوع الألم</Label>
              <Select value={form.painType} onValueChange={(v) => setForm((f) => ({ ...f, painType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAIN_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{PAIN_TYPE_AR[t] ?? t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <PainScale
              label="شدة الألم"
              value={form.intensity}
              onChange={(v) => setForm((f) => ({ ...f, intensity: v }))}
            />
            <div>
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="وصف إضافي..."
              />
            </div>
          </div>
          <DialogFooter>
            {isEditing && (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <X className="h-4 w-4 ml-1" />حذف
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
