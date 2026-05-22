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

export const clinicCitiesApi = {
  getAll: async (): Promise<City[]> => {
    const { data } = await apiClient.get("/cities");
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },

  getByGovernorate: async (): Promise<Governorate[]> => {
    const { data } = await apiClient.get("/cities/by-governorate");
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : [];
  },
};
