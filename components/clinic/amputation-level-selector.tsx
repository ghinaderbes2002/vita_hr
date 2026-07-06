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
  values?: string[];
  onChange?: (levels: string[]) => void;
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

export function AmputationLevelSelector({ type, values = [], onChange, disabled }: AmputationLevelSelectorProps) {
  const t = (type ?? "").toUpperCase();
  const showUpper = !t || t === "UPPER" || t === "BOTH";
  const showLower = !t || t === "LOWER" || t === "BOTH";

  const toggle = (level: string) => {
    const next = values.includes(level)
      ? values.filter((v) => v !== level)
      : [...values, level];
    onChange?.(next);
  };

  return (
    <div className="space-y-3">
      {showUpper && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">طرف علوي</p>
          <div className="grid grid-cols-3 gap-x-4 gap-y-2 sm:grid-cols-6">
            {UPPER_LEVELS.map((l) => (
              <CheckItem
                key={l.value}
                labelAr={l.labelAr}
                labelCode={l.labelCode}
                selected={values.includes(l.value)}
                onClick={() => toggle(l.value)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}
      {showLower && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">طرف سفلي</p>
          <div className="grid grid-cols-3 gap-x-4 gap-y-2 sm:grid-cols-6">
            {LOWER_LEVELS.map((l) => (
              <CheckItem
                key={l.value}
                labelAr={l.labelAr}
                labelCode={l.labelCode}
                selected={values.includes(l.value)}
                onClick={() => toggle(l.value)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
