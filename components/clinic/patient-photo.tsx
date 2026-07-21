"use client";

// Patient's personal photo. Documents are behind auth, so the image is fetched
// as a blob and shown from an object URL rather than a plain <img src=…>.
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { clinicPatientsApi } from "@/lib/api/clinic-patients";
import { usePatientDocuments } from "@/lib/hooks/use-clinic-patients";

export function PatientPhoto({ patientId, className }: { patientId?: string; className?: string }) {
  const { data: documents = [] } = usePatientDocuments(patientId ?? "");
  const photoDoc = documents.find((d) => d.type === "PERSONAL_PHOTO");

  const { data: src } = useQuery({
    queryKey: ["patient-photo-blob", photoDoc?.id],
    queryFn: async () => {
      const blob = await clinicPatientsApi.downloadDocument(patientId!, photoDoc!.id);
      if (!blob.type.startsWith("image/")) return null;
      return URL.createObjectURL(blob);
    },
    enabled: !!patientId && !!photoDoc?.id,
    staleTime: Infinity,
    gcTime: 60_000,
  });

  useEffect(() => {
    return () => { if (src) URL.revokeObjectURL(src); };
  }, [src]);

  return (
    <div className={`flex items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/30 ${className ?? "h-32 w-32"}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="الصورة الشخصية" className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs text-muted-foreground">
          {photoDoc ? "جاري التحميل..." : "لا توجد صورة"}
        </span>
      )}
    </div>
  );
}
