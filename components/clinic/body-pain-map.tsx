"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { PainRegion as PainPoint } from "@/lib/api/clinic-physio";
import { PainScale } from "./pain-scale";
import { BodyMap, BONES } from "./body-map";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// ─── Approximate bone centers (% of 200×490 viewBox) for backend storage ──────
const BONE_CENTERS: Record<string, { x: number; y: number }> = {
  skull:          { x: 50, y:  4 },
  mandible:       { x: 50, y: 10 },
  cervical:       { x: 50, y: 17 },
  clavicle_r:     { x: 61, y: 15 },
  clavicle_l:     { x: 39, y: 15 },
  scapula_r:      { x: 61, y: 18 },
  scapula_l:      { x: 40, y: 18 },
  sternum:        { x: 50, y: 19 },
  ribs:           { x: 50, y: 26 },
  thoracic:       { x: 50, y: 25 },
  lumbar:         { x: 50, y: 40 },
  sacrum:         { x: 50, y: 48 },
  coccyx:         { x: 50, y: 54 },
  ilium_r:        { x: 58, y: 50 },
  ilium_l:        { x: 42, y: 50 },
  pubis:          { x: 50, y: 55 },
  humerus_r:      { x: 68, y: 25 },
  humerus_l:      { x: 32, y: 25 },
  radius_r:       { x: 72, y: 40 },
  ulna_r:         { x: 66, y: 40 },
  radius_l:       { x: 28, y: 40 },
  ulna_l:         { x: 34, y: 40 },
  carpals_r:      { x: 69, y: 46 },
  carpals_l:      { x: 31, y: 46 },
  metacarpals_r:  { x: 68, y: 49 },
  metacarpals_l:  { x: 30, y: 49 },
  phalanges_r:    { x: 68, y: 53 },
  phalanges_l:    { x: 29, y: 53 },
  femur_r:        { x: 57, y: 70 },
  femur_l:        { x: 44, y: 70 },
  patella_r:      { x: 56, y: 80 },
  patella_l:      { x: 44, y: 80 },
  tibia_r:        { x: 55, y: 88 },
  tibia_l:        { x: 46, y: 88 },
  fibula_r:       { x: 60, y: 89 },
  fibula_l:       { x: 41, y: 89 },
  talus_r:        { x: 56, y: 97 },
  talus_l:        { x: 45, y: 97 },
  calcaneus_r:    { x: 52, y: 98 },
  calcaneus_l:    { x: 48, y: 98 },
  metatarsals_r:  { x: 58, y: 96 },
  metatarsals_l:  { x: 45, y: 96 },
  toephalanges_r: { x: 59, y: 93 },
  toephalanges_l: { x: 41, y: 93 },
};

const PAIN_TYPES = [
  "Numbness", "Dull Ache", "Hot Burning", "Sharp Stabbing", "Pins", "Other",
];
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

interface BodyPainMapProps {
  points: PainPoint[];
  onChange?: (points: PainPoint[]) => void;
  readonly?: boolean;
}

export function BodyPainMap({ points, onChange, readonly = false }: BodyPainMapProps) {
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [pendingBoneId, setPendingBoneId] = useState<string | null>(null);
  const [editingPoint, setEditingPoint] = useState<PainPoint | null>(null);
  const [form, setForm] = useState({ intensity: 5, painType: "Dull Ache", notes: "" });

  // boneId → max intensity (for coloring)
  const markedBones: Record<string, number> = {};
  points.forEach((p) => {
    if (p.label) markedBones[p.label] = Math.max(markedBones[p.label] ?? 0, p.intensity);
  });

  const handleBoneClick = (id: string) => {
    const existing = points.find((p) => p.label === id);
    setPendingBoneId(id);
    if (existing) {
      setEditingPoint(existing);
      setForm({ intensity: existing.intensity, painType: existing.painType ?? "Dull Ache", notes: existing.notes ?? "" });
    } else {
      setEditingPoint(null);
      setForm({ intensity: 5, painType: "Dull Ache", notes: "" });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!pendingBoneId) return;
    const center = BONE_CENTERS[pendingBoneId] ?? { x: 50, y: 50 };
    if (editingPoint) {
      onChange?.(points.map((p) => p === editingPoint
        ? { ...p, ...form, label: pendingBoneId }
        : p
      ));
    } else {
      const newPoint: PainPoint = {
        side: "front",
        x: center.x,
        y: center.y,
        label: pendingBoneId,
        ...form,
      };
      onChange?.([...points, newPoint]);
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (editingPoint) onChange?.(points.filter((p) => p !== editingPoint));
    setDialogOpen(false);
  };

  const boneName = pendingBoneId ? (BONES[pendingBoneId]?.ar ?? pendingBoneId) : "";

  return (
    <div className="space-y-4">
      <BodyMap
        markedBones={markedBones}
        onBoneClick={readonly ? undefined : handleBoneClick}
        readonly={readonly}
      />

      {!readonly && (
        <p className="text-xs text-center text-muted-foreground">
          انقر على أي عظمة لتسجيل ألم — العظام الملوّنة تحتوي على ألم مسجّل
        </p>
      )}

      {/* List of marked bones */}
      {points.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {points.map((p, i) => (
            <button
              key={i}
              onClick={() => !readonly && handleBoneClick(p.label ?? "")}
              disabled={readonly}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${painBadgeColor(p.intensity)} ${!readonly ? "hover:opacity-80 cursor-pointer" : "cursor-default"}`}
            >
              {BONES[p.label ?? ""]?.ar ?? p.label}
              <span className="opacity-70">· {p.intensity}/10</span>
              {p.painType && <span className="opacity-60">· {PAIN_TYPE_AR[p.painType] ?? p.painType}</span>}
            </button>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingPoint ? `تعديل ألم: ${boneName}` : `إضافة ألم: ${boneName}`}
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
            {editingPoint && (
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
