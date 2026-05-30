import { apiClient } from "./client";
import { Holiday } from "@/types";

export interface CreateHolidayData {
  nameAr: string;
  nameEn: string;
  date: string;
  endDate?: string;
  type: "PUBLIC" | "NATIONAL" | "RELIGIOUS" | "OTHER";
  isRecurring: boolean;
  year?: number;
}

export interface UpdateHolidayData {
  nameAr?: string;
  nameEn?: string;
  date?: string;
  endDate?: string;
  type?: "PUBLIC" | "NATIONAL" | "RELIGIOUS" | "OTHER";
  isRecurring?: boolean;
  year?: number;
  isActive?: boolean;
}

export const holidaysApi = {
  getAll: async (params?: { year?: number }): Promise<Holiday[]> => {
    const response = await apiClient.get("/holidays", { params });
    return response.data;
  },

  getUpcoming: async (): Promise<Holiday[]> => {
    const response = await apiClient.get("/holidays/upcoming/list");
    return response.data;
  },

  getByDateRange: async (startDate: string, endDate: string): Promise<Holiday[]> => {
    const response = await apiClient.get(`/holidays/range/${startDate}/${endDate}`);
    return response.data;
  },

  getById: async (id: string): Promise<Holiday> => {
    const response = await apiClient.get(`/holidays/${id}`);
    return response.data.data;
  },

  create: async (data: CreateHolidayData): Promise<Holiday> => {
    const response = await apiClient.post("/holidays", data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateHolidayData): Promise<Holiday> => {
    const response = await apiClient.put(`/holidays/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/holidays/${id}`);
  },
};
