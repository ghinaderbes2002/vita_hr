"use client";

// The signed-in user's own signature. Unlike the per-employee signature (which
// can only be read), this one can be written back: a drawing is persisted via
// PUT /employees/my/signature, so it is reused by every later form instead of
// being re-drawn each time.
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, PenLine, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clinicProstheticsApi } from "@/lib/api/clinic-prosthetics";
import { SignaturePadDialog } from "./signature-pad-dialog";

interface MySignatureFieldProps {
  /** Current signature (data URI or absolute URL); empty when unsigned. */
  value: string;
  onChange: (value: string) => void;
  /** Name shown on the signature pad. */
  signerName?: string;
  title?: string;
  className?: string;
}

export function MySignatureField({
  value,
  onChange,
  signerName,
  title = "التوقيع",
  className,
}: MySignatureFieldProps) {
  const [padOpen, setPadOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Pull the stored signature; if there is none, go straight to drawing one.
  const handleUseSaved = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const sig = await clinicProstheticsApi.getMySignature();
      if (sig.hasSignature && sig.displaySrc) {
        onChange(sig.displaySrc);
      } else {
        toast.info("لا يوجد توقيع محفوظ — ارسمه مرة وسيُحفظ للنماذج القادمة");
        setPadOpen(true);
      }
    } catch {
      toast.error("فشل جلب التوقيع المحفوظ");
    } finally {
      setBusy(false);
    }
  };

  // Drawing both fills this form and becomes the user's stored signature.
  const handleSign = async (base64: string) => {
    onChange(base64);
    try {
      const saved = await clinicProstheticsApi.saveMySignature(base64);
      if (saved.displaySrc) onChange(saved.displaySrc);
      toast.success("تم حفظ التوقيع");
    } catch {
      // The form still has the drawing, only the permanent copy failed.
      toast.error("تم استخدام التوقيع، لكن حفظه للنماذج القادمة فشل");
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || busy) return;
    setBusy(true);
    try {
      const saved = await clinicProstheticsApi.uploadMySignatureImage(file);
      if (saved.displaySrc) onChange(saved.displaySrc);
      toast.success("تم حفظ التوقيع");
    } catch {
      toast.error("فشل رفع التوقيع");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      {value ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={title} className="h-16 w-full object-contain border rounded bg-white" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-0 left-0 text-destructive text-xs p-0.5"
            aria-label="إزالة التوقيع"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={handleUseSaved} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="h-3.5 w-3.5" />}
            التوقيع المحفوظ
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setPadOpen(true)} disabled={busy}>
            <PenLine className="h-3.5 w-3.5" />
            رسم
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-1 text-xs" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload className="h-3.5 w-3.5" />
            رفع
          </Button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      <SignaturePadDialog
        open={padOpen}
        onOpenChange={setPadOpen}
        title={title}
        signerName={signerName}
        onSign={handleSign}
      />
    </div>
  );
}
