import { useQuery, useMutation } from "@tanstack/react-query";
import { clinicReportsApi } from "@/lib/api/clinic-reports";
import { toast } from "sonner";

export function useDonorReport(params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ["clinic-donor-report", params],
    queryFn: () => clinicReportsApi.getDonorReport(params),
  });
}

export function useDownloadDonorPdf() {
  return useMutation({
    mutationFn: (params?: { from?: string; to?: string }) => clinicReportsApi.downloadDonorPdf(params),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast.success("تم تنزيل التقرير PDF");
    },
    onError: () => toast.error("فشل تنزيل التقرير"),
  });
}
