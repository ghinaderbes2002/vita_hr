import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authApi } from "@/lib/api/auth";
import { User } from "@/types";

// Cookie storage for SSR compatibility
const cookieStorage = {
  getItem: (name: string): string | null => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
  },
  setItem: (name: string, value: string): void => {
    if (typeof document === "undefined") return;
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  },
  removeItem: (name: string): void => {
    if (typeof document === "undefined") return;
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  },
};

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (username, password) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login({ username, password });

          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });

          // Set a separate simple cookie for middleware auth check (not managed by Zustand)
          document.cookie = `wso-token=${response.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        } catch (error: any) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Ignore logout API errors
        } finally {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
          // Clear the auth token cookie
          document.cookie = "wso-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }
        try {
          const response = await authApi.refresh(refreshToken);
          set({ accessToken: response.accessToken });

          // Update the cookie with the new access token
          if (typeof document !== "undefined") {
            document.cookie = `wso-token=${response.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
          }
        } catch (error) {
          // Clear auth state on refresh failure
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
          // Clear the cookie
          if (typeof document !== "undefined") {
            document.cookie = "wso-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          }
          throw error;
        }
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: "wso-auth",
      storage: createJSONStorage(() => cookieStorage),
    }
  )
);
