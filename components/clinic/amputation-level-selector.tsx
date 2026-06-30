"use client";

const UPPER_LEVELS = [
  { value: "PH", labelAr: "بتر جزئي / الأصابع", labelCode: "PH / Finger" },
  { value: "WD", labelAr: "عبر الرسغ",           labelCode: "WD" },
  { value: "TR", labelAr: "تحت المرفق",           labelCode: "TR" },
  { value: "ED", labelAr: "عبر المرفق",           labelCode: "ED" },
  { value: "TH", labelAr: "فوق المرفق",           labelCode: "TH" },
  { value: "SD", labelAr: "عبر الكتف",            labelCode: "SD" },
];

const LOWER_LEVELS = [
  { value: "PF",      labelAr: "بتر جزئي / الأصابع", labelCode: "PF / toe" },
  { value: "CHOPART", labelAr: "عبر الكاحل",          labelCode: "chopart" },
  { value: "TT",      labelAr: "تحت الركبة",          labelCode: "TT" },
  { value: "KD",      labelAr: "عبر الركبة",          labelCode: "KD" },
  { value: "TF",      labelAr: "فوق الركبة",          labelCode: "TF" },
  { value: "HD",      labelAr: "عبر الحوض",           labelCode: "HD" },
];

interface AmputationLevelSelectorProps {
  type?: string | null;
  value?: string | null;
  onChange?: (level: string) => void;
  onTypeChange?: (type: "UPPER" | "LOWER") => void;
  disabled?: boolean;
}

function CheckItem({
  labelAr, labelCode, selected, onClick, disabled,
}: {
  labelAr: string; labelCode: string; selected: boolean;
  onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex items-start gap-1.5 text-right group disabled:opacity-40"
    >
      <div className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded-none border flex items-center justify-center transition-colors ${
        selected ? "border-primary bg-primary" : "border-muted-foreground group-hover:border-primary/60"
      }`}>
        {selected && (
          <svg viewBox="0 0 10 10" className="h-2 w-2 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="1.5,5 4,7.5 8.5,2.5" />
          </svg>
        )}
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-xs font-medium">{labelAr}</span>
        <span className="text-[10px] text-muted-foreground">{labelCode}</span>
      </div>
    </button>
  );
}

export function AmputationLevelSelector({ type, value, onChange, onTypeChange, disabled }: AmputationLevelSelectorProps) {
  const upperVals = new Set(UPPER_LEVELS.map((l) => l.value));
  const lowerVals = new Set(LOWER_LEVELS.map((l) => l.value));

  const handleSelect = (level: string, sectionType: "UPPER" | "LOWER") => {
    onChange?.(level);
    if (onTypeChange && type?.toUpperCase() !== sectionType) {
      onTypeChange(sectionType);
    }
  };

  return (
    <div className="space-y-3">
      {/* طرف علوي */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground">طرف علوي</p>
        <div className="grid grid-cols-3 gap-x-4 gap-y-2 sm:grid-cols-6">
          {UPPER_LEVELS.map((l) => (
            <CheckItem
              key={l.value}
              labelAr={l.labelAr}
              labelCode={l.labelCode}
              selected={value === l.value}
              onClick={() => handleSelect(l.value, "UPPER")}
              disabled={disabled}
            />
          ))}
        </div>
      </div>

      {/* طرف سفلي */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground">طرف سفلي</p>
        <div className="grid grid-cols-3 gap-x-4 gap-y-2 sm:grid-cols-6">
          {LOWER_LEVELS.map((l) => (
            <CheckItem
              key={l.value}
              labelAr={l.labelAr}
              labelCode={l.labelCode}
              selected={value === l.value}
              onClick={() => handleSelect(l.value, "LOWER")}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
