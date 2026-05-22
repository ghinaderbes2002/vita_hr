"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const UPPER_LEVELS = [
  { value: "SD", label: "Shoulder Disarticulation (SD) — مفصلة الكتف" },
  { value: "TH", label: "Transhumeral (TH) — فوق المرفق" },
  { value: "ED", label: "Elbow Disarticulation (ED) — مفصلة المرفق" },
  { value: "TR", label: "Transradial (TR) — تحت المرفق" },
  { value: "WD", label: "Wrist Disarticulation (WD) — مفصلة الرسغ" },
  { value: "PF", label: "Partial Hand — جزء من الكف" },
];

const LOWER_LEVELS = [
  { value: "PH", label: "Hemipelvectomy (PH) — ما فوق الورك" },
  { value: "HD", label: "Hip Disarticulation (HD) — مفصلة الورك" },
  { value: "TF", label: "Transfemoral (TF) — فوق الركبة" },
  { value: "KD", label: "Knee Disarticulation (KD) — مفصلة الركبة" },
  { value: "TT", label: "Transtibial (TT) — تحت الركبة" },
  { value: "CHOPART", label: "Chopart — مفصلة شوبار" },
  { value: "PF", label: "Partial Foot — جزء من القدم" },
];

interface AmputationLevelSelectorProps {
  type: "upper" | "lower";
  value?: string | null;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export function AmputationLevelSelector({ type, value, onChange, disabled }: AmputationLevelSelectorProps) {
  const levels = type === "upper" ? UPPER_LEVELS : LOWER_LEVELS;
  return (
    <Select value={value ?? ""} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="اختر مستوى البتر" />
      </SelectTrigger>
      <SelectContent>
        {levels.map((l) => (
          <SelectItem key={l.value} value={l.value}>
            {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
