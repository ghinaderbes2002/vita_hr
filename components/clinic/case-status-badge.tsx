"use client";

import { Badge } from "@/components/ui/badge";
import { ProstheticsStatus } from "@/lib/api/clinic-prosthetics";
import { PhysioStatus } from "@/lib/api/clinic-physio";

type CaseStatus = ProstheticsStatus | PhysioStatus;

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  // Prosthetics
  INTAKE:               { label: "استقبال",         className: "bg-blue-100 text-blue-800 border-blue-200" },
  ASSESSMENT:           { label: "تقييم",            className: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  COMMITTEE_REVIEW:     { label: "مراجعة اللجنة",    className: "bg-purple-100 text-purple-800 border-purple-200" },
  COMMITTEE_APPROVED:   { label: "اعتمدت اللجنة",   className: "bg-purple-100 text-purple-800 border-purple-200" },
  APPROVED:             { label: "موافق عليه",       className: "bg-purple-100 text-purple-800 border-purple-200" },
  SOCKET_TRIAL:         { label: "تجربة الغلاف",     className: "bg-orange-100 text-orange-800 border-orange-200" },
  FITTING:              { label: "تركيب",            className: "bg-orange-100 text-orange-800 border-orange-200" },
  GAIT_ANALYSIS:        { label: "تحليل مشي",        className: "bg-amber-100 text-amber-800 border-amber-200" },
  GAIT_TRAINING:        { label: "تدريب مشي",        className: "bg-amber-100 text-amber-800 border-amber-200" },
  FINAL_EVALUATION:     { label: "تقييم نهائي",      className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  FINAL_REVIEW:         { label: "مراجعة نهائية",    className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  DELIVERED:            { label: "تم التسليم",       className: "bg-green-100 text-green-800 border-green-200" },
  FOLLOW_UP:            { label: "متابعة",           className: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  CLOSED:               { label: "مغلقة",            className: "bg-gray-100 text-gray-600 border-gray-200" },
  CANCELLED:            { label: "ملغاة",            className: "bg-red-100 text-red-600 border-red-200" },
  // Physio
  COMPLAINT:            { label: "شكوى",             className: "bg-blue-100 text-blue-800 border-blue-200" },
  PAIN_MAP:             { label: "خريطة الألم",       className: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  MEDICAL_HISTORY:      { label: "التاريخ الطبي",     className: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  GOALS:                { label: "الأهداف",           className: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  POSTURAL_ASSESSMENT:  { label: "تقييم وضعي",       className: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  TREATMENT_PLAN:       { label: "خطة العلاج",       className: "bg-orange-100 text-orange-800 border-orange-200" },
  ACTIVE_SESSIONS:      { label: "جلسات نشطة",       className: "bg-amber-100 text-amber-800 border-amber-200" },
  COMPLETED:            { label: "مكتملة",           className: "bg-green-100 text-green-800 border-green-200" },
};

interface CaseStatusBadgeProps {
  status: CaseStatus;
  size?: "sm" | "default";
}

export function CaseStatusBadge({ status, size = "default" }: CaseStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-gray-100 text-gray-700" };
  return (
    <Badge
      variant="outline"
      className={`${cfg.className} border ${size === "sm" ? "text-xs px-1.5 py-0" : ""}`}
    >
      {cfg.label}
    </Badge>
  );
}
