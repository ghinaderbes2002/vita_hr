import { useQuery } from "@tanstack/react-query";
import { clinicCitiesApi } from "@/lib/api/clinic-cities";

export function useClinicCities() {
  return useQuery({
    queryKey: ["clinic-cities"],
    queryFn: () => clinicCitiesApi.getAll(),
    staleTime: 1000 * 60 * 60,
  });
}

export function useClinicCitiesByGovernorate() {
  return useQuery({
    queryKey: ["clinic-cities-by-governorate"],
    queryFn: () => clinicCitiesApi.getByGovernorate(),
    staleTime: 1000 * 60 * 60,
  });
}
