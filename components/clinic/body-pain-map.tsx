"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PainRegion as PainPoint } from "@/lib/api/clinic-physio";
import { PainScale } from "./pain-scale";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

const PAIN_TYPES = [
  "Numbness", "Dull Ache", "Hot Burning", "Sharp Stabbing", "Pins", "Other",
];

const PAIN_TYPE_AR: Record<string, string> = {
  "Numbness": "خدر",
  "Dull Ache": "ألم خفيف",
  "Hot Burning": "حرقة",
  "Sharp Stabbing": "وخز حاد",
  "Pins": "إبر",
  "Other": "أخرى",
};

function getPainPointColor(intensity: number): string {
  if (intensity <= 2) return "#10b981";
  if (intensity <= 4) return "#f59e0b";
  if (intensity <= 6) return "#f97316";
  if (intensity <= 8) return "#ef4444";
  return "#991b1b";
}

function getPainPointSize(intensity: number): number {
  return 8 + intensity * 1.5;
}

interface BodyPainMapProps {
  points: PainPoint[];
  onChange?: (points: PainPoint[]) => void;
  readonly?: boolean;
}

export function BodyPainMap({ points, onChange, readonly = false }: BodyPainMapProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clickedSide, setClickedSide] = useState<"front" | "back">("front");
  const [clickedPos, setClickedPos] = useState({ x: 0, y: 0 });
  const [editingPoint, setEditingPoint] = useState<PainPoint | null>(null);
  const [form, setForm] = useState({ intensity: 5, painType: "Dull Ache", notes: "" });

  const handleBodyClick = (e: React.MouseEvent<SVGElement>, side: "front" | "back") => {
    if (readonly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setClickedSide(side);
    setClickedPos({ x, y });
    setEditingPoint(null);
    setForm({ intensity: 5, painType: "Dull Ache", notes: "" });
    setDialogOpen(true);
  };

  const handlePointClick = (e: React.MouseEvent, point: PainPoint) => {
    if (readonly) return;
    e.stopPropagation();
    setEditingPoint(point);
    setClickedSide(point.side);
    setForm({ intensity: point.intensity, painType: point.painType ?? "", notes: point.notes ?? "" });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingPoint) {
      onChange?.(points.map((p) => p === editingPoint ? { ...p, ...form } : p));
    } else {
      const newPoint: PainPoint = { side: clickedSide, x: clickedPos.x, y: clickedPos.y, ...form };
      onChange?.([...points, newPoint]);
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (editingPoint) onChange?.(points.filter((p) => p !== editingPoint));
    setDialogOpen(false);
  };

  const renderPoints = (side: "front" | "back") =>
    points.filter((p) => p.side === side).map((p, i) => (
      <circle
        key={i}
        cx={`${p.x}%`}
        cy={`${p.y}%`}
        r={getPainPointSize(p.intensity)}
        fill={getPainPointColor(p.intensity)}
        fillOpacity={0.7}
        stroke="white"
        strokeWidth={2}
        className={cn("cursor-pointer transition-all hover:fillOpacity-90", readonly && "cursor-default")}
        onClick={(e) => handlePointClick(e, p)}
      />
    ));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {(["front", "back"] as const).map((side) => (
          <div key={side} className="space-y-1">
            <p className="text-xs text-center text-muted-foreground font-medium">
              {side === "front" ? "الأمام" : "الخلف"}
            </p>
            <svg
              viewBox="0 0 200 400"
              className="w-full border rounded-lg bg-gray-50 cursor-crosshair"
              onClick={(e) => handleBodyClick(e, side)}
            >
              {/* Simple human body silhouette */}
              <ellipse cx="100" cy="40" rx="25" ry="32" fill="#d1d5db" stroke="#9ca3af" strokeWidth="1.5" />
              <path d="M75 72 Q65 85 60 110 L80 115 Q90 90 100 88 Q110 90 120 115 L140 110 Q135 85 125 72 Z" fill="#d1d5db" stroke="#9ca3af" strokeWidth="1.5" />
              <rect x="55" y="73" width="15" height="80" rx="7" fill="#d1d5db" stroke="#9ca3af" strokeWidth="1.5" />
              <rect x="130" y="73" width="15" height="80" rx="7" fill="#d1d5db" stroke="#9ca3af" strokeWidth="1.5" />
              <path d="M80 115 Q75 150 78 185 L95 185 Q98 150 100 130 Q102 150 105 185 L122 185 Q125 150 120 115 Z" fill="#d1d5db" stroke="#9ca3af" strokeWidth="1.5" />
              <rect x="78" y="182" width="17" height="60" rx="7" fill="#d1d5db" stroke="#9ca3af" strokeWidth="1.5" />
              <rect x="105" y="182" width="17" height="60" rx="7" fill="#d1d5db" stroke="#9ca3af" strokeWidth="1.5" />
              {renderPoints(side)}
            </svg>
          </div>
        ))}
      </div>

      {points.length > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          {points.length} نقطة ألم مسجلة — انقر على نقطة للتعديل أو على الجسم لإضافة جديدة
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingPoint ? "تعديل نقطة الألم" : "إضافة نقطة ألم"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>نوع الألم</Label>
              <Select value={form.painType} onValueChange={(v) => setForm((f) => ({ ...f, painType: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
            {editingPoint && (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <X className="h-4 w-4 ml-1" />
                حذف
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
