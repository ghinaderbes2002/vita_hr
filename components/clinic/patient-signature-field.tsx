"use client";

// One control for every place a patient has to sign: pull the signature already
// on file, draw a new one, or upload a picture of one. Mirrors the employee
// signature flow used across the prosthetics forms.
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, PenLine, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { clinicPatientsApi } from "@/lib/api/clinic-patients";
import { SignaturePadDialog } from "./signature-pad-dialog";

interface PatientSignatureFieldProps {
  /** Omitted while the patient is still being created — hides the "on file" button. */
  patientId?: string;
  patientName?: string;
  /** Data URI or absolute URL of the current signature. */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export function PatientSignatureField({
  patientId,
  patientName,
  value,
  onChange,
  label,
  className,
}: PatientSignatureFieldProps) {
  const t = useTranslations("clinic.patients.new.consentForm");
  const [padOpen, setPadOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [fetching, setFetching] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFetchSaved = async () => {
    if (!patientId || fetching) return;
    setFetching(true);
    try {
      const sig = await clinicPatientsApi.getPatientSignature(patientId);
      if (sig.hasSignature && sig.signatureUrl) {
        onChange(sig.signatureUrl);
      } else {
        // Nothing on file yet — go straight to drawing one.
        toast.info(t("noSavedSignature"));
        setPadOpen(true);
      }
    } catch {
      toast.error(t("fetchSignatureFailed"));
    } finally {
      setFetching(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => toast.error(t("signatureUploadFailed"));
    reader.readAsDataURL(file);
  };

  return (
    <div className={className}>
      <Label className="text-xs">{label ?? t("patientSignature")}</Label>
      {value ? (
        <div className="relative mt-2 w-full max-w-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label ?? t("patientSignature")} className="h-20 w-full object-contain border rounded bg-white" />
          <button
            type="button"
            onClick={() => setConfirmRemove(true)}
            className="absolute top-1 left-1 rounded bg-white/80 p-0.5 text-destructive"
            aria-label={t("removeSignature")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {patientId && (
            <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleFetchSaved} disabled={fetching}>
              {fetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="h-3.5 w-3.5" />}
              {t("useSavedSignature")}
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setPadOpen(true)}>
            <PenLine className="h-3.5 w-3.5" />
            {t("drawSignature")}
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" />
            {t("uploadSignature")}
          </Button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      <SignaturePadDialog
        open={padOpen}
        onOpenChange={setPadOpen}
        title={label ?? t("patientSignature")}
        signerName={patientName}
        onSign={async (base64) => onChange(base64)}
      />

      {/* A signature is easy to lose by a stray click on the ✕, so confirm first. */}
      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeSignature")}</AlertDialogTitle>
            <AlertDialogDescription>{t("removeSignatureConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => onChange("")}>{t("confirmRemove")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
