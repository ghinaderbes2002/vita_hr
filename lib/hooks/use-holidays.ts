import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { holidaysApi, CreateHolidayData, UpdateHolidayData } from "@/lib/api/holidays";
import { toast } from "sonner";

export function useHolidays(params?: { year?: number }) {
  return useQuery({
    queryKey: ["holidays", params],
    queryFn: () => holidaysApi.getAll(params),
  });
}

export function useUpcomingHolidays() {
  return useQuery({
    queryKey: ["holidays", "upcoming"],
    queryFn: () => holidaysApi.getUpcoming(),
  });
}

export function useHolidaysByDateRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["holidays", "range", startDate, endDate],
    queryFn: () => holidaysApi.getByDateRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

export function useHoliday(id: string) {
  return useQuery({
    queryKey: ["holiday", id],
    queryFn: () => holidaysApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateHolidayData) => holidaysApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast.success("تم إنشاء العطلة بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useUpdateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHolidayData }) =>
      holidaysApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast.success("تم تحديث العطلة بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => holidaysApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast.success("تم حذف العطلة بنجاح");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "حدث خطأ");
    },
  });
}
