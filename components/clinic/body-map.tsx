"use client";

import { useCallback, useState } from "react";

// ─── Bone metadata ────────────────────────────────────────────────────────────
export const BONES: Record<string, { ar: string; en: string }> = {
  skull:             { ar: "الجمجمة",                    en: "Cranium" },
  mandible:          { ar: "الفك السفلي",                en: "Mandible" },
  cervical:          { ar: "فقرات العنق",                en: "Cervical C1–C7" },
  clavicle_r:        { ar: "الترقوة اليمنى",             en: "Right Clavicle" },
  clavicle_l:        { ar: "الترقوة اليسرى",             en: "Left Clavicle" },
  scapula_r:         { ar: "لوح الكتف الأيمن",           en: "Right Scapula" },
  scapula_l:         { ar: "لوح الكتف الأيسر",           en: "Left Scapula" },
  sternum:           { ar: "عظمة القص",                  en: "Sternum" },
  ribs:              { ar: "الأضلاع",                    en: "Ribs 1–12" },
  thoracic:          { ar: "الفقرات الصدرية",            en: "Thoracic T1–T12" },
  lumbar:            { ar: "الفقرات القطنية",            en: "Lumbar L1–L5" },
  sacrum:            { ar: "العجز",                      en: "Sacrum" },
  coccyx:            { ar: "العصعص",                     en: "Coccyx" },
  ilium_r:           { ar: "الحرقفة اليمنى",             en: "Right Ilium" },
  ilium_l:           { ar: "الحرقفة اليسرى",             en: "Left Ilium" },
  pubis:             { ar: "عظمة العانة",                en: "Pubic Symphysis" },
  humerus_r:         { ar: "عظمة العضد الأيمن",          en: "Right Humerus" },
  humerus_l:         { ar: "عظمة العضد الأيسر",          en: "Left Humerus" },
  radius_r:          { ar: "الكعبرة اليمنى",             en: "Right Radius" },
  radius_l:          { ar: "الكعبرة اليسرى",             en: "Left Radius" },
  ulna_r:            { ar: "الزند الأيمن",               en: "Right Ulna" },
  ulna_l:            { ar: "الزند الأيسر",               en: "Left Ulna" },
  carpals_r:         { ar: "عظام الرسغ الأيمن",          en: "Right Carpals" },
  carpals_l:         { ar: "عظام الرسغ الأيسر",          en: "Left Carpals" },
  metacarpals_r:     { ar: "عظام المشط الأيمن",          en: "Right Metacarpals" },
  metacarpals_l:     { ar: "عظام المشط الأيسر",          en: "Left Metacarpals" },
  phalanges_r:       { ar: "سلاميات الأصابع اليمنى",     en: "Right Phalanges" },
  phalanges_l:       { ar: "سلاميات الأصابع اليسرى",     en: "Left Phalanges" },
  femur_r:           { ar: "عظمة الفخذ اليمنى",          en: "Right Femur" },
  femur_l:           { ar: "عظمة الفخذ اليسرى",          en: "Left Femur" },
  patella_r:         { ar: "الرضفة اليمنى",              en: "Right Patella" },
  patella_l:         { ar: "الرضفة اليسرى",              en: "Left Patella" },
  tibia_r:           { ar: "القصبة اليمنى",              en: "Right Tibia" },
  tibia_l:           { ar: "القصبة اليسرى",              en: "Left Tibia" },
  fibula_r:          { ar: "الشظية اليمنى",              en: "Right Fibula" },
  fibula_l:          { ar: "الشظية اليسرى",              en: "Left Fibula" },
  talus_r:           { ar: "عظمة الكاحل الأيمن",         en: "Right Talus" },
  talus_l:           { ar: "عظمة الكاحل الأيسر",         en: "Left Talus" },
  calcaneus_r:       { ar: "عظمة العقب الأيمن",          en: "Right Calcaneus" },
  calcaneus_l:       { ar: "عظمة العقب الأيسر",          en: "Left Calcaneus" },
  metatarsals_r:     { ar: "مشط القدم اليمنى",           en: "Right Metatarsals" },
  metatarsals_l:     { ar: "مشط القدم اليسرى",           en: "Left Metatarsals" },
  toephalanges_r:    { ar: "سلاميات أصابع القدم اليمنى", en: "Right Toe Phalanges" },
  toephalanges_l:    { ar: "سلاميات أصابع القدم اليسرى", en: "Left Toe Phalanges" },
};

// ─── SVG Helpers ──────────────────────────────────────────────────────────────
const SK = {
  cortical: "#d4c9b0",
  inner:    "#e8dfc8",
  joint:    "#c8dde8",
  dark:     "#a89880",
  mid:      "#bfb09a",
  light:    "#ede3d0",
};

const BODY_FRONT = "M100,8 Q118,12 124,28 Q128,45 124,62 Q138,70 142,90 Q145,112 138,130 Q148,138 150,160 Q148,182 138,188 Q132,210 126,240 Q128,265 126,290 Q124,315 122,340 Q120,365 118,400 L112,400 Q114,372 116,340 Q118,315 120,290 Q118,265 120,240 Q114,210 108,188 Q104,182 102,165 Q98,165 96,165 Q94,182 92,188 Q86,210 80,240 Q82,265 80,290 Q82,315 84,340 Q86,372 88,400 L82,400 Q80,365 78,340 Q76,315 74,290 Q72,265 74,240 Q68,210 62,188 Q52,182 50,160 Q48,138 52,130 Q45,112 48,90 Q52,70 66,62 Q62,45 66,28 Q72,12 100,8 Z";
const BODY_BACK  = "M100,8 Q118,12 124,28 Q128,45 122,62 Q136,70 140,90 Q143,112 136,130 Q146,138 148,160 Q146,182 136,188 Q130,210 124,240 Q126,265 124,290 Q122,315 120,340 Q118,365 116,400 L110,400 Q112,372 114,340 Q116,315 118,290 Q116,265 118,240 Q112,210 106,188 Q102,182 100,165 Q98,165 96,165 Q94,182 90,188 Q84,210 82,240 Q84,265 82,290 Q84,315 86,340 Q88,372 90,400 L84,400 Q82,365 80,340 Q78,315 76,290 Q74,265 76,240 Q70,210 64,188 Q54,182 52,160 Q50,138 54,130 Q47,112 50,90 Q54,70 68,62 Q64,45 68,28 Q74,12 100,8 Z";

function painFilter(intensity: number): string {
  const c =
    intensity <= 2 ? "#10b981" :
    intensity <= 4 ? "#f59e0b" :
    intensity <= 6 ? "#f97316" :
    intensity <= 8 ? "#ef4444" :
                     "#7f1d1d";
  return `drop-shadow(0 0 6px ${c}) brightness(1.15)`;
}

// ─── Front Skeleton ───────────────────────────────────────────────────────────
function FrontSkeleton({ markedBones, onBoneClick, showBody }: {
  markedBones: Record<string, number>;
  onBoneClick: (id: string) => void;
  showBody: boolean;
}) {
  const bg = useCallback(
    (id: string) => {
      const pain = markedBones[id];
      return {
        onClick: () => onBoneClick(id),
        style: {
          cursor: "pointer",
          filter: pain != null ? painFilter(pain) : undefined,
        } as React.CSSProperties,
      };
    },
    [markedBones, onBoneClick]
  );

  return (
    <svg viewBox="0 0 200 490" width="100%" style={{ maxWidth: 200, display: "block" }}>
      {showBody && <path d={BODY_FRONT} fill="#f0e4d4" stroke="#d4b896" strokeWidth="1" />}

      <g {...bg("skull")}>
        <ellipse cx={100} cy={20} rx={22} ry={24} fill={SK.light} stroke={SK.dark} strokeWidth="1" />
        <path d="M78,30 Q100,45 122,30 L122,38 Q100,52 78,38 Z" fill={SK.cortical} stroke={SK.dark} strokeWidth="0.6" />
        <ellipse cx={100} cy={19} rx={14} ry={10} fill={SK.inner} stroke={SK.mid} strokeWidth="0.4" />
        <path d="M85,8 Q100,5 115,8" fill="none" stroke={SK.mid} strokeWidth="0.5" />
        <line x1={100} y1={6} x2={100} y2={38} stroke={SK.mid} strokeWidth="0.4" />
      </g>

      <g {...bg("mandible")}>
        <path d="M83,40 Q100,48 117,40 L115,50 Q100,57 85,50 Z" fill={SK.cortical} stroke={SK.dark} strokeWidth="0.8" />
      </g>

      <g {...bg("cervical")}>
        {Array.from({ length: 7 }, (_, i) => (
          <g key={i}>
            <rect x={94} y={58 + i * 7} width={12} height={6} rx={2} fill={i === 0 ? SK.light : SK.inner} stroke={SK.dark} strokeWidth="0.7" />
            <line x1={86} y1={58 + i * 7 + 3} x2={94} y2={58 + i * 7 + 3} stroke={SK.mid} strokeWidth="0.5" />
            <line x1={106} y1={58 + i * 7 + 3} x2={114} y2={58 + i * 7 + 3} stroke={SK.mid} strokeWidth="0.5" />
          </g>
        ))}
      </g>

      <g {...bg("clavicle_r")}>
        <path d="M106,68 Q120,66 130,70 Q136,72 138,76" fill="none" stroke={SK.cortical} strokeWidth="5" strokeLinecap="round" />
        <path d="M106,68 Q120,66 130,70 Q136,72 138,76" fill="none" stroke={SK.dark} strokeWidth="0.8" />
      </g>
      <g {...bg("clavicle_l")}>
        <path d="M94,68 Q80,66 70,70 Q64,72 62,76" fill="none" stroke={SK.cortical} strokeWidth="5" strokeLinecap="round" />
        <path d="M94,68 Q80,66 70,70 Q64,72 62,76" fill="none" stroke={SK.dark} strokeWidth="0.8" />
      </g>

      <g {...bg("sternum")}>
        <rect x={95} y={68} width={10} height={8} rx={2} fill={SK.light} stroke={SK.dark} strokeWidth="0.8" />
        <rect x={96} y={76} width={8} height={30} rx={1} fill={SK.inner} stroke={SK.dark} strokeWidth="0.8" />
        <polygon points="96,106 104,106 103,114 97,114" fill={SK.cortical} stroke={SK.dark} strokeWidth="0.7" />
      </g>

      <g {...bg("thoracic")}>
        {Array.from({ length: 12 }, (_, i) => (
          <g key={i}>
            <rect x={94} y={76 + i * 8} width={12} height={7} rx={1.5} fill={SK.inner} stroke={SK.dark} strokeWidth="0.7" />
            <rect x={90} y={76 + i * 8 + 1} width={4} height={5} rx={1} fill={SK.cortical} stroke={SK.dark} strokeWidth="0.5" />
            <rect x={106} y={76 + i * 8 + 1} width={4} height={5} rx={1} fill={SK.cortical} stroke={SK.dark} strokeWidth="0.5" />
          </g>
        ))}
      </g>

      <g {...bg("ribs")}>
        {Array.from({ length: 12 }, (_, i) => {
          const y = 78 + i * 8;
          const rLen = i < 7 ? 28 - i * 1.5 : 18 - i * 0.5;
          const sw = i < 7 ? 3 : 2.2;
          return (
            <g key={i}>
              <path d={`M94,${y+3} Q${94-rLen*0.5},${y+3+i*0.3} ${94-rLen},${y+8+i*0.5}`} fill="none" stroke={SK.cortical} strokeWidth={sw} />
              <path d={`M106,${y+3} Q${106+rLen*0.5},${y+3+i*0.3} ${106+rLen},${y+8+i*0.5}`} fill="none" stroke={SK.cortical} strokeWidth={sw} />
            </g>
          );
        })}
      </g>

      <g {...bg("lumbar")}>
        {Array.from({ length: 5 }, (_, i) => (
          <g key={i}>
            <rect x={93} y={172 + i * 9} width={14} height={8} rx={2} fill={SK.light} stroke={SK.dark} strokeWidth="0.8" />
            <rect x={88} y={172 + i * 9 + 1} width={5} height={6} rx={1} fill={SK.cortical} stroke={SK.dark} strokeWidth="0.5" />
            <rect x={107} y={172 + i * 9 + 1} width={5} height={6} rx={1} fill={SK.cortical} stroke={SK.dark} strokeWidth="0.5" />
          </g>
        ))}
      </g>

      <g {...bg("humerus_r")}>
        <ellipse cx={138} cy={80} rx={8} ry={8} fill={SK.joint} stroke={SK.dark} strokeWidth="0.8" />
        <path d="M134,86 Q132,90 133,120 Q135,140 136,158" fill="none" stroke={SK.cortical} strokeWidth="10" strokeLinecap="round" />
        <path d="M134,86 Q132,90 133,120 Q135,140 136,158" fill="none" stroke={SK.dark} strokeWidth="0.8" />
        <ellipse cx={136} cy={160} rx={10} ry={6} fill={SK.joint} stroke={SK.dark} strokeWidth="0.8" />
      </g>
      <g {...bg("humerus_l")}>
        <ellipse cx={62} cy={80} rx={8} ry={8} fill={SK.joint} stroke={SK.dark} strokeWidth="0.8" />
        <path d="M66,86 Q68,90 67,120 Q65,140 64,158" fill="none" stroke={SK.cortical} strokeWidth="10" strokeLinecap="round" />
        <path d="M66,86 Q68,90 67,120 Q65,140 64,158" fill="none" stroke={SK.dark} strokeWidth="0.8" />
        <ellipse cx={64} cy={160} rx={10} ry={6} fill={SK.joint} stroke={SK.dark} strokeWidth="0.8" />
      </g>

      <g {...bg("radius_r")}>
        <path d="M144,165 Q146,190 145,220" fill="none" stroke={SK.cortical} strokeWidth="7" strokeLinecap="round" />
        <path d="M144,165 Q146,190 145,220" fill="none" stroke={SK.dark} strokeWidth="0.7" />
      </g>
      <g {...bg("ulna_r")}>
        <path d="M132,162 Q130,190 132,222" fill="none" stroke={SK.inner} strokeWidth="5" strokeLinecap="round" />
        <path d="M132,162 Q130,190 132,222" fill="none" stroke={SK.dark} strokeWidth="0.7" />
      </g>
      <g {...bg("radius_l")}>
        <path d="M56,165 Q54,190 55,220" fill="none" stroke={SK.cortical} strokeWidth="7" strokeLinecap="round" />
        <path d="M56,165 Q54,190 55,220" fill="none" stroke={SK.dark} strokeWidth="0.7" />
      </g>
      <g {...bg("ulna_l")}>
        <path d="M68,162 Q70,190 68,222" fill="none" stroke={SK.inner} strokeWidth="5" strokeLinecap="round" />
        <path d="M68,162 Q70,190 68,222" fill="none" stroke={SK.dark} strokeWidth="0.7" />
      </g>

      <g {...bg("carpals_r")}>
        {Array.from({ length: 4 }, (_, i) => (
          <g key={i}>
            <rect x={128+i*5} y={222} width={4} height={4} rx={1.5} fill={SK.light} stroke={SK.dark} strokeWidth="0.6" />
            <rect x={129+i*5} y={227} width={4} height={4} rx={1.5} fill={SK.inner} stroke={SK.dark} strokeWidth="0.6" />
          </g>
        ))}
      </g>
      <g {...bg("carpals_l")}>
        {Array.from({ length: 4 }, (_, i) => (
          <g key={i}>
            <rect x={52+i*5} y={222} width={4} height={4} rx={1.5} fill={SK.light} stroke={SK.dark} strokeWidth="0.6" />
            <rect x={53+i*5} y={227} width={4} height={4} rx={1.5} fill={SK.inner} stroke={SK.dark} strokeWidth="0.6" />
          </g>
        ))}
      </g>

      <g {...bg("metacarpals_r")}>
        {Array.from({ length: 5 }, (_, i) => (
          <rect key={i} x={126+i*5} y={232} width={3.5} height={12} rx={1.5} fill={SK.inner} stroke={SK.dark} strokeWidth="0.6" />
        ))}
      </g>
      <g {...bg("phalanges_r")}>
        {Array.from({ length: 5 }, (_, i) => (
          <g key={i}>
            <rect x={126.5+i*5} y={245} width={3} height={6} rx={1} fill={SK.light} stroke={SK.dark} strokeWidth="0.5" />
            {i > 0 && <rect x={126.5+i*5} y={252} width={3} height={5} rx={1} fill={SK.cortical} stroke={SK.dark} strokeWidth="0.5" />}
            <rect x={126.5+i*5} y={i>0?258:252} width={3} height={4} rx={1} fill={SK.light} stroke={SK.dark} strokeWidth="0.5" />
          </g>
        ))}
      </g>
      <g {...bg("metacarpals_l")}>
        {Array.from({ length: 5 }, (_, i) => (
          <rect key={i} x={50+i*5} y={232} width={3.5} height={12} rx={1.5} fill={SK.inner} stroke={SK.dark} strokeWidth="0.6" />
        ))}
      </g>
      <g {...bg("phalanges_l")}>
        {Array.from({ length: 5 }, (_, i) => (
          <g key={i}>
            <rect x={50.5+i*5} y={245} width={3} height={6} rx={1} fill={SK.light} stroke={SK.dark} strokeWidth="0.5" />
            {i > 0 && <rect x={50.5+i*5} y={252} width={3} height={5} rx={1} fill={SK.cortical} stroke={SK.dark} strokeWidth="0.5" />}
            <rect x={50.5+i*5} y={i>0?258:252} width={3} height={4} rx={1} fill={SK.light} stroke={SK.dark} strokeWidth="0.5" />
          </g>
        ))}
      </g>

      <g {...bg("ilium_l")}>
        <path d="M100,218 Q86,215 76,220 Q68,228 70,242 Q72,254 80,258 Q90,262 100,260" fill={SK.light} stroke={SK.dark} strokeWidth="1" />
      </g>
      <g {...bg("ilium_r")}>
        <path d="M100,218 Q114,215 124,220 Q132,228 130,242 Q128,254 120,258 Q110,262 100,260" fill={SK.light} stroke={SK.dark} strokeWidth="1" />
      </g>
      <g {...bg("pubis")}>
        <path d="M80,258 Q100,268 120,258 Q116,274 100,276 Q84,274 80,258 Z" fill={SK.inner} stroke={SK.dark} strokeWidth="0.8" />
      </g>
      <g {...bg("sacrum")}>
        <path d="M94,218 Q100,215 106,218 L108,250 Q100,256 92,250 Z" fill={SK.cortical} stroke={SK.dark} strokeWidth="0.8" />
      </g>

      <g {...bg("femur_r")}>
        <ellipse cx={118} cy={282} rx={10} ry={10} fill={SK.joint} stroke={SK.dark} strokeWidth="0.8" />
        <path d="M118,290 Q116,300 112,320 Q110,350 112,385" fill="none" stroke={SK.cortical} strokeWidth="12" strokeLinecap="round" />
        <path d="M118,290 Q116,300 112,320 Q110,350 112,385" fill="none" stroke={SK.dark} strokeWidth="0.8" />
        <ellipse cx={112} cy={386} rx={13} ry={8} fill={SK.joint} stroke={SK.dark} strokeWidth="0.8" />
      </g>
      <g {...bg("femur_l")}>
        <ellipse cx={82} cy={282} rx={10} ry={10} fill={SK.joint} stroke={SK.dark} strokeWidth="0.8" />
        <path d="M82,290 Q84,300 88,320 Q90,350 88,385" fill="none" stroke={SK.cortical} strokeWidth="12" strokeLinecap="round" />
        <path d="M82,290 Q84,300 88,320 Q90,350 88,385" fill="none" stroke={SK.dark} strokeWidth="0.8" />
        <ellipse cx={88} cy={386} rx={13} ry={8} fill={SK.joint} stroke={SK.dark} strokeWidth="0.8" />
      </g>

      <g {...bg("patella_r")}><ellipse cx={112} cy={390} rx={8} ry={6} fill={SK.light} stroke={SK.dark} strokeWidth="0.8" /></g>
      <g {...bg("patella_l")}><ellipse cx={88} cy={390} rx={8} ry={6} fill={SK.light} stroke={SK.dark} strokeWidth="0.8" /></g>

      <g {...bg("tibia_r")}>
        <path d="M108,396 Q110,420 110,450 Q110,460 108,468" fill="none" stroke={SK.cortical} strokeWidth="9" strokeLinecap="round" />
        <ellipse cx={108} cy={469} rx={9} ry={5} fill={SK.joint} stroke={SK.dark} strokeWidth="0.7" />
      </g>
      <g {...bg("fibula_r")}>
        <path d="M118,400 Q120,430 120,460 Q120,466 119,470" fill="none" stroke={SK.inner} strokeWidth="4" strokeLinecap="round" />
        <ellipse cx={119} cy={471} rx={5} ry={4} fill={SK.joint} stroke={SK.dark} strokeWidth="0.6" />
      </g>
      <g {...bg("tibia_l")}>
        <path d="M92,396 Q90,420 90,450 Q90,460 92,468" fill="none" stroke={SK.cortical} strokeWidth="9" strokeLinecap="round" />
        <ellipse cx={92} cy={469} rx={9} ry={5} fill={SK.joint} stroke={SK.dark} strokeWidth="0.7" />
      </g>
      <g {...bg("fibula_l")}>
        <path d="M82,400 Q80,430 80,460 Q80,466 81,470" fill="none" stroke={SK.inner} strokeWidth="4" strokeLinecap="round" />
        <ellipse cx={81} cy={471} rx={5} ry={4} fill={SK.joint} stroke={SK.dark} strokeWidth="0.6" />
      </g>

      <g {...bg("talus_r")}><ellipse cx={111} cy={474} rx={8} ry={5} fill={SK.light} stroke={SK.dark} strokeWidth="0.7" /></g>
      <g {...bg("calcaneus_r")}>
        <path d="M104,474 Q98,476 95,474 Q90,472 90,478 Q90,484 100,486 Q110,485 114,480 Q112,478 104,474" fill={SK.cortical} stroke={SK.dark} strokeWidth="0.8" />
      </g>
      <g {...bg("talus_l")}><ellipse cx={89} cy={474} rx={8} ry={5} fill={SK.light} stroke={SK.dark} strokeWidth="0.7" /></g>
      <g {...bg("calcaneus_l")}>
        <path d="M96,474 Q102,476 105,474 Q110,472 110,478 Q110,484 100,486 Q90,485 86,480 Q88,478 96,474" fill={SK.cortical} stroke={SK.dark} strokeWidth="0.8" />
      </g>

      <g {...bg("metatarsals_r")}>
        {Array.from({ length: 5 }, (_, i) => (
          <path key={i} d={`M${103+i*4},474 L${104+i*4.5},464 L${106+i*4.5},464 L${105+i*4},474`} fill={SK.inner} stroke={SK.dark} strokeWidth="0.6" />
        ))}
      </g>
      <g {...bg("toephalanges_r")}>
        {Array.from({ length: 5 }, (_, i) => (
          <g key={i}>
            <rect x={103+i*4.5} y={458} width={3} height={5} rx={1.5} fill={SK.light} stroke={SK.dark} strokeWidth="0.5" />
            {i > 0 && <rect x={103.5+i*4.5} y={452} width={2.5} height={5} rx={1} fill={SK.cortical} stroke={SK.dark} strokeWidth="0.4" />}
          </g>
        ))}
      </g>
      <g {...bg("metatarsals_l")}>
        {Array.from({ length: 5 }, (_, i) => (
          <path key={i} d={`M${93-i*4},474 L${92-i*4.5},464 L${90-i*4.5},464 L${91-i*4},474`} fill={SK.inner} stroke={SK.dark} strokeWidth="0.6" />
        ))}
      </g>
      <g {...bg("toephalanges_l")}>
        {Array.from({ length: 5 }, (_, i) => (
          <g key={i}>
            <rect x={90-i*4.5} y={458} width={3} height={5} rx={1.5} fill={SK.light} stroke={SK.dark} strokeWidth="0.5" />
            {i > 0 && <rect x={90.5-i*4.5} y={452} width={2.5} height={5} rx={1} fill={SK.cortical} stroke={SK.dark} strokeWidth="0.4" />}
          </g>
        ))}
      </g>
    </svg>
  );
}

// ─── Back Skeleton ────────────────────────────────────────────────────────────
function BackSkeleton({ markedBones, onBoneClick, showBody }: {
  markedBones: Record<string, number>;
  onBoneClick: (id: string) => void;
  showBody: boolean;
}) {
  const bg = useCallback(
    (id: string) => {
      const pain = markedBones[id];
      return {
        onClick: () => onBoneClick(id),
        style: {
          cursor: "pointer",
          filter: pain != null ? painFilter(pain) : undefined,
        } as React.CSSProperties,
      };
    },
    [markedBones, onBoneClick]
  );

  return (
    <svg viewBox="0 0 200 490" width="100%" style={{ maxWidth: 200, display: "block" }}>
      {showBody && <path d={BODY_BACK} fill="#ede0cf" stroke="#d4b896" strokeWidth="1" />}

      <g {...bg("skull")}>
        <ellipse cx={100} cy={20} rx={22} ry={24} fill={SK.light} stroke={SK.dark} strokeWidth="1" />
        <ellipse cx={100} cy={20} rx={12} ry={9} fill={SK.inner} stroke={SK.mid} strokeWidth="0.4" />
        <line x1={100} y1={8} x2={100} y2={42} stroke={SK.mid} strokeWidth="0.4" />
        <path d="M82,34 Q100,30 118,34 Q100,44 82,34 Z" fill={SK.cortical} stroke={SK.dark} strokeWidth="0.6" />
      </g>

      <g {...bg("cervical")}>
        {Array.from({ length: 7 }, (_, i) => (
          <g key={i}>
            <rect x={94} y={46+i*7} width={12} height={6} rx={2} fill={SK.inner} stroke={SK.dark} strokeWidth="0.7" />
            <rect x={90} y={46+i*7+1} width={4} height={4} rx={1} fill={SK.cortical} stroke={SK.dark} strokeWidth="0.5" />
            <rect x={106} y={46+i*7+1} width={4} height={4} rx={1} fill={SK.cortical} stroke={SK.dark} strokeWidth="0.5" />
          </g>
        ))}
      </g>

      <g {...bg("scapula_r")}>
        <path d="M108,68 Q120,70 130,80 Q138,92 134,106 Q128,112 118,108 Q110,100 108,84 Z" fill={SK.light} stroke={SK.dark} strokeWidth="0.9" />
        <path d="M118,68 Q122,76 120,86" fill="none" stroke={SK.dark} strokeWidth="1.5" />
      </g>
      <g {...bg("scapula_l")}>
        <path d="M92,68 Q80,70 70,80 Q62,92 66,106 Q72,112 82,108 Q90,100 92,84 Z" fill={SK.light} stroke={SK.dark} strokeWidth="0.9" />
        <path d="M82,68 Q78,76 80,86" fill="none" stroke={SK.dark} strokeWidth="1.5" />
      </g>

      <g {...bg("thoracic")}>
        {Array.from({ length: 12 }, (_, i) => (
          <g key={i}>
            <rect x={94} y={76+i*8} width={12} height={7} rx={1.5} fill={SK.inner} stroke={SK.dark} strokeWidth="0.7" />
            <rect x={90} y={76+i*8+1} width={4} height={5} rx={1} fill={SK.cortical} stroke={SK.dark} strokeWidth="0.5" />
            <rect x={106} y={76+i*8+1} width={4} height={5} rx={1} fill={SK.cortical} stroke={SK.dark} strokeWidth="0.5" />
            <path d={`M100,${76+i*8+7} L100,${76+i*8+12}`} fill="none" stroke={SK.dark} strokeWidth="1.2" />
          </g>
        ))}
      </g>

      <g {...bg("ribs")}>
        {Array.from({ length: 12 }, (_, i) => {
          const y = 78 + i * 8;
          const sw = i < 7 ? 3 : 2;
          return (
            <g key={i}>
              <path d={`M94,${y+3} Q${78-i*0.5},${y+5} ${66+i*0.3},${y+12}`} fill="none" stroke={SK.cortical} strokeWidth={sw} />
              <path d={`M106,${y+3} Q${122+i*0.5},${y+5} ${134-i*0.3},${y+12}`} fill="none" stroke={SK.cortical} strokeWidth={sw} />
            </g>
          );
        })}
      </g>

      <g {...bg("lumbar")}>
        {Array.from({ length: 5 }, (_, i) => (
          <g key={i}>
            <rect x={93} y={172+i*9} width={14} height={8} rx={2} fill={SK.light} stroke={SK.dark} strokeWidth="0.8" />
            <rect x={88} y={172+i*9+1} width={5} height={6} rx={1} fill={SK.cortical} stroke={SK.dark} strokeWidth="0.5" />
            <rect x={107} y={172+i*9+1} width={5} height={6} rx={1} fill={SK.cortical} stroke={SK.dark} strokeWidth="0.5" />
            <path d={`M100,${172+i*9+8} L100,${172+i*9+13}`} fill="none" stroke={SK.dark} strokeWidth="1.2" />
          </g>
        ))}
      </g>

      <g {...bg("sacrum")}>
        <path d="M94,218 Q100,215 106,218 L108,252 Q100,258 92,252 Z" fill={SK.cortical} stroke={SK.dark} strokeWidth="0.8" />
      </g>
      <g {...bg("coccyx")}>
        <path d="M96,252 Q100,250 104,252 L103,268 Q100,272 97,268 Z" fill={SK.inner} stroke={SK.dark} strokeWidth="0.7" />
      </g>

      <g {...bg("ilium_r")}>
        <path d="M100,218 Q114,214 124,220 Q132,228 130,244 Q128,256 120,260 Q110,264 100,261" fill={SK.light} stroke={SK.dark} strokeWidth="1" />
      </g>
      <g {...bg("ilium_l")}>
        <path d="M100,218 Q86,214 76,220 Q68,228 70,244 Q72,256 80,260 Q90,264 100,261" fill={SK.light} stroke={SK.dark} strokeWidth="1" />
      </g>

      <g {...bg("humerus_r")}>
        <ellipse cx={136} cy={78} rx={8} ry={8} fill={SK.joint} stroke={SK.dark} strokeWidth="0.8" />
        <path d="M136,86 Q138,110 137,140 Q136,155 134,162" fill="none" stroke={SK.cortical} strokeWidth="10" strokeLinecap="round" />
        <ellipse cx={134} cy={163} rx={10} ry={6} fill={SK.joint} stroke={SK.dark} strokeWidth="0.8" />
      </g>
      <g {...bg("humerus_l")}>
        <ellipse cx={64} cy={78} rx={8} ry={8} fill={SK.joint} stroke={SK.dark} strokeWidth="0.8" />
        <path d="M64,86 Q62,110 63,140 Q64,155 66,162" fill="none" stroke={SK.cortical} strokeWidth="10" strokeLinecap="round" />
        <ellipse cx={66} cy={163} rx={10} ry={6} fill={SK.joint} stroke={SK.dark} strokeWidth="0.8" />
      </g>

      <g {...bg("radius_r")}>
        <path d="M130,168 Q128,195 129,224" fill="none" stroke={SK.cortical} strokeWidth="7" strokeLinecap="round" />
      </g>
      <g {...bg("ulna_r")}>
        <path d="M140,165 Q142,195 140,226" fill="none" stroke={SK.inner} strokeWidth="5" strokeLinecap="round" />
        <path d="M140,165 L142,160 L138,158 L136,165" fill={SK.cortical} stroke={SK.dark} strokeWidth="0.6" />
      </g>
      <g {...bg("radius_l")}>
        <path d="M70,168 Q72,195 71,224" fill="none" stroke={SK.cortical} strokeWidth="7" strokeLinecap="round" />
      </g>
      <g {...bg("ulna_l")}>
        <path d="M60,165 Q58,195 60,226" fill="none" stroke={SK.inner} strokeWidth="5" strokeLinecap="round" />
        <path d="M60,165 L58,160 L62,158 L64,165" fill={SK.cortical} stroke={SK.dark} strokeWidth="0.6" />
      </g>

      <g {...bg("carpals_r")}>
        {Array.from({ length: 4 }, (_, i) => (
          <g key={i}>
            <rect x={126+i*5} y={226} width={4} height={4} rx={1.5} fill={SK.light} stroke={SK.dark} strokeWidth="0.6" />
            <rect x={127+i*5} y={231} width={4} height={4} rx={1.5} fill={SK.inner} stroke={SK.dark} strokeWidth="0.6" />
          </g>
        ))}
      </g>
      <g {...bg("metacarpals_r")}>
        {Array.from({ length: 5 }, (_, i) => (
          <rect key={i} x={124+i*5} y={236} width={3.5} height={12} rx={1.5} fill={SK.inner} stroke={SK.dark} strokeWidth="0.6" />
        ))}
      </g>
      <g {...bg("phalanges_r")}>
        {Array.from({ length: 5 }, (_, i) => (
          <g key={i}>
            <rect x={124.5+i*5} y={249} width={3} height={6} rx={1} fill={SK.light} stroke={SK.dark} strokeWidth="0.5" />
            {i > 0 && <rect x={124.5+i*5} y={256} width={3} height={5} rx={1} fill={SK.cortical} stroke={SK.dark} strokeWidth="0.5" />}
            <rect x={124.5+i*5} y={i>0?262:256} width={3} height={4} rx={1} fill={SK.light} stroke={SK.dark} strokeWidth="0.5" />
          </g>
        ))}
      </g>
      <g {...bg("carpals_l")}>
        {Array.from({ length: 4 }, (_, i) => (
          <g key={i}>
            <rect x={50+i*5} y={226} width={4} height={4} rx={1.5} fill={SK.light} stroke={SK.dark} strokeWidth="0.6" />
            <rect x={51+i*5} y={231} width={4} height={4} rx={1.5} fill={SK.inner} stroke={SK.dark} strokeWidth="0.6" />
          </g>
        ))}
      </g>
      <g {...bg("metacarpals_l")}>
        {Array.from({ length: 5 }, (_, i) => (
          <rect key={i} x={48+i*5} y={236} width={3.5} height={12} rx={1.5} fill={SK.inner} stroke={SK.dark} strokeWidth="0.6" />
        ))}
      </g>
      <g {...bg("phalanges_l")}>
        {Array.from({ length: 5 }, (_, i) => (
          <g key={i}>
            <rect x={48.5+i*5} y={249} width={3} height={6} rx={1} fill={SK.light} stroke={SK.dark} strokeWidth="0.5" />
            {i > 0 && <rect x={48.5+i*5} y={256} width={3} height={5} rx={1} fill={SK.cortical} stroke={SK.dark} strokeWidth="0.5" />}
            <rect x={48.5+i*5} y={i>0?262:256} width={3} height={4} rx={1} fill={SK.light} stroke={SK.dark} strokeWidth="0.5" />
          </g>
        ))}
      </g>

      <g {...bg("femur_r")}>
        <ellipse cx={117} cy={284} rx={10} ry={10} fill={SK.joint} stroke={SK.dark} strokeWidth="0.8" />
        <path d="M117,292 Q115,315 113,348 Q112,368 112,388" fill="none" stroke={SK.cortical} strokeWidth="12" strokeLinecap="round" />
        <ellipse cx={112} cy={389} rx={13} ry={8} fill={SK.joint} stroke={SK.dark} strokeWidth="0.8" />
      </g>
      <g {...bg("femur_l")}>
        <ellipse cx={83} cy={284} rx={10} ry={10} fill={SK.joint} stroke={SK.dark} strokeWidth="0.8" />
        <path d="M83,292 Q85,315 87,348 Q88,368 88,388" fill="none" stroke={SK.cortical} strokeWidth="12" strokeLinecap="round" />
        <ellipse cx={88} cy={389} rx={13} ry={8} fill={SK.joint} stroke={SK.dark} strokeWidth="0.8" />
      </g>

      <g {...bg("tibia_r")}>
        <path d="M109,397 Q110,425 110,455 Q110,462 108,470" fill="none" stroke={SK.cortical} strokeWidth="9" strokeLinecap="round" />
        <ellipse cx={108} cy={471} rx={9} ry={5} fill={SK.joint} stroke={SK.dark} strokeWidth="0.7" />
      </g>
      <g {...bg("fibula_r")}>
        <path d="M119,402 Q120,432 120,462 Q120,468 119,472" fill="none" stroke={SK.inner} strokeWidth="4" strokeLinecap="round" />
      </g>
      <g {...bg("tibia_l")}>
        <path d="M91,397 Q90,425 90,455 Q90,462 92,470" fill="none" stroke={SK.cortical} strokeWidth="9" strokeLinecap="round" />
        <ellipse cx={92} cy={471} rx={9} ry={5} fill={SK.joint} stroke={SK.dark} strokeWidth="0.7" />
      </g>
      <g {...bg("fibula_l")}>
        <path d="M81,402 Q80,432 80,462 Q80,468 81,472" fill="none" stroke={SK.inner} strokeWidth="4" strokeLinecap="round" />
      </g>

      <g {...bg("calcaneus_r")}>
        <path d="M102,472 Q108,474 114,472 Q118,476 116,482 Q112,488 106,488 Q100,488 98,482 Q97,476 102,472 Z" fill={SK.cortical} stroke={SK.dark} strokeWidth="0.8" />
      </g>
      <g {...bg("talus_r")}><ellipse cx={109} cy={471} rx={7} ry={4} fill={SK.light} stroke={SK.dark} strokeWidth="0.6" /></g>
      <g {...bg("calcaneus_l")}>
        <path d="M98,472 Q92,474 86,472 Q82,476 84,482 Q88,488 94,488 Q100,488 102,482 Q103,476 98,472 Z" fill={SK.cortical} stroke={SK.dark} strokeWidth="0.8" />
      </g>
      <g {...bg("talus_l")}><ellipse cx={91} cy={471} rx={7} ry={4} fill={SK.light} stroke={SK.dark} strokeWidth="0.6" /></g>

      <g {...bg("metatarsals_r")}>
        {Array.from({ length: 5 }, (_, i) => (
          <path key={i} d={`M${103+i*4},472 L${104+i*4.5},462 L${106+i*4.5},462 L${105+i*4},472`} fill={SK.inner} stroke={SK.dark} strokeWidth="0.6" />
        ))}
      </g>
      <g {...bg("toephalanges_r")}>
        {Array.from({ length: 5 }, (_, i) => (
          <g key={i}>
            <rect x={103+i*4.5} y={456} width={3} height={5} rx={1.5} fill={SK.light} stroke={SK.dark} strokeWidth="0.5" />
            {i > 0 && <rect x={103.5+i*4.5} y={450} width={2.5} height={5} rx={1} fill={SK.cortical} stroke={SK.dark} strokeWidth="0.4" />}
          </g>
        ))}
      </g>
      <g {...bg("metatarsals_l")}>
        {Array.from({ length: 5 }, (_, i) => (
          <path key={i} d={`M${93-i*4},472 L${92-i*4.5},462 L${90-i*4.5},462 L${91-i*4},472`} fill={SK.inner} stroke={SK.dark} strokeWidth="0.6" />
        ))}
      </g>
      <g {...bg("toephalanges_l")}>
        {Array.from({ length: 5 }, (_, i) => (
          <g key={i}>
            <rect x={90-i*4.5} y={456} width={3} height={5} rx={1.5} fill={SK.light} stroke={SK.dark} strokeWidth="0.5" />
            {i > 0 && <rect x={90.5-i*4.5} y={450} width={2.5} height={5} rx={1} fill={SK.cortical} stroke={SK.dark} strokeWidth="0.4" />}
          </g>
        ))}
      </g>
    </svg>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────
export interface BodyMapProps {
  /** boneId → pain intensity 0–10. Highlighted with pain-color glow. */
  markedBones?: Record<string, number>;
  onBoneClick?: (id: string) => void;
  readonly?: boolean;
}

export function BodyMap({ markedBones = {}, onBoneClick, readonly = false }: BodyMapProps) {
  const [showBody, setShowBody] = useState(false);

  const handleClick = useCallback(
    (id: string) => { if (!readonly) onBoneClick?.(id); },
    [readonly, onBoneClick]
  );

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        <button
          onClick={() => setShowBody(false)}
          className={`px-3 py-1 text-sm rounded-md border transition-colors ${!showBody ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"}`}
        >
          عظام فقط
        </button>
        <button
          onClick={() => setShowBody(true)}
          className={`px-3 py-1 text-sm rounded-md border transition-colors ${showBody ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"}`}
        >
          عظام + جسم
        </button>
      </div>
      <div className="flex gap-6 justify-center flex-wrap">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">الأمام</p>
          <FrontSkeleton markedBones={markedBones} onBoneClick={handleClick} showBody={showBody} />
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">الخلف</p>
          <BackSkeleton markedBones={markedBones} onBoneClick={handleClick} showBody={showBody} />
        </div>
      </div>
    </div>
  );
}
