import { apiClient, refreshClient } from "./client";
import { User } from "@/types";

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface RefreshResponse {
  accessToken: string;
}

export const authApi = {
  login: async (data: {
    username: string;
    password: string;
  }): Promise<LoginResponse> => {
    const response = await apiClient.post("/auth/login", data);
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },

  refresh: async (refreshToken: string): Promise<RefreshResponse> => {
    const response = await refreshClient.post("/auth/refresh", { refreshToken });
    return response.data.data;
  },

  me: async (): Promise<User> => {
    const response = await apiClient.get("/auth/me");
    return response.data.data;
  },
};
