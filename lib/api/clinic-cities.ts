import { apiClient } from "./client";

export interface City {
  id: number;
  name: string;
  governorate: string;
}

export interface Governorate {
  name: string;
  cities: City[];
}

// The list arrives under a different key depending on the envelope the backend
// uses ({data: []}, {data: {items: []}}, {data: {data: []}}), and a city's name
// is not always on `name` — an unrecognised shape used to collapse silently to
// an empty list, which reads as "there are no cities".
function normalizeCities(payload: any): City[] {
  const d = payload?.data ?? payload;
  const raw: any[] = Array.isArray(d)
    ? d
    : d?.items ?? d?.data ?? d?.cities ?? [];
  return raw
    .map((c) => ({
      ...c,
      name: c?.name ?? c?.nameAr ?? c?.cityName ?? c?.title ?? "",
      governorate: c?.governorate ?? c?.governorateName ?? c?.province ?? "",
    }))
    .filter((c) => c.name);
}

export const clinicCitiesApi = {
  getAll: async (): Promise<City[]> => {
    const { data } = await apiClient.get("/cities");
    return normalizeCities(data);
  },

  getByGovernorate: async (): Promise<Governorate[]> => {
    const { data } = await apiClient.get("/cities/by-governorate");
    const d = data?.data ?? data;
    const raw: any[] = Array.isArray(d) ? d : d?.items ?? d?.data ?? [];
    return raw.map((g) => ({ ...g, cities: normalizeCities(g?.cities) }));
  },
};
