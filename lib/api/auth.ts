import { refreshClient } from "./client";
import { User } from "@/types";

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

export const authApi = {
  login: async (data: {
    username: string;
    password: string;
  }): Promise<LoginResponse> => {
    const response = await refreshClient.post("/auth/login", data);
    return response.data.data;
  },

  /**
   * Must carry the access token: the API revokes it by the jti inside it, and
   * without the header it cannot. Called before the token is cleared locally.
   * `fallbackToken` is the store's copy, for when the cookie is gone.
   */
  logout: async (fallbackToken?: string | null): Promise<void> => {
    const cookieToken =
      typeof document !== "undefined"
        ? document.cookie.split("; ").find((c) => c.startsWith("wso-token="))?.split("=")[1]
        : null;
    const token = cookieToken || fallbackToken;
    if (!token && process.env.NODE_ENV !== "production") {
      console.warn("logout: no access token to send — the server cannot revoke it");
    }
    await refreshClient.post("/auth/logout", {}, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // Logging out shouldn't hang the UI if the server is slow.
      timeout: 8000,
    });
  },

  refresh: async (refreshToken: string): Promise<RefreshResponse> => {
    const response = await refreshClient.post("/auth/refresh", { refreshToken });
    return response.data.data;
  },

  // TODO: backend endpoint not implemented yet (feature/permissions-upgrade)
  // أعد تفعيلها عندما يضيف الباك GET /auth/me
  // me: async (): Promise<User> => {
  //   const response = await apiClient.get("/auth/me");
  //   return response.data.data;
  // },
};
