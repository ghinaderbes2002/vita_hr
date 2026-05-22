"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { clinicProstheticsApi } from "@/lib/api/clinic-prosthetics";
import { clinicPhysioApi } from "@/lib/api/clinic-physio";

type PdfType = "prosthetics-case" | "physio-case" | "donor-report";

interface PdfExportButtonProps {
  type: PdfType;
  id?: string;
  params?: Record<string, string>;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function PdfExportButton({
  type,
  id,
  params,
  label = "تصدير PDF",
  variant = "outline",
  size = "sm",
}: PdfExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (loading) return;
    setLoading(true);
    try {
      let blob: Blob;
      if (type === "prosthetics-case" && id) {
        blob = await clinicProstheticsApi.downloadPdf(id);
      } else if (type === "physio-case" && id) {
        blob = await clinicPhysioApi.downloadPdf(id);
      } else if (type === "donor-report") {
        blob = await clinicProstheticsApi.downloadDonorPdf(params);
      } else {
        throw new Error("Invalid PDF type");
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${id ?? "export"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast.success("تم تنزيل PDF");
    } catch {
      toast.error("فشل تنزيل PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleExport} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {loading ? "جاري التنزيل..." : label}
    </Button>
  );
}
