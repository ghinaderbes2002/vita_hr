import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/lib/api/auth";
import { User } from "@/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  permissions: string[];
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  setUser: (user: User) => void;
  setPermissions: (permissions: string[]) => void;

  // Permission checks
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,
      permissions: [],

      login: async (username, password) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login({ username, password });

          // Extract permissions - يمكن أن تأتي مباشرة من user.permissions أو من user.roles
          let permissions: string[] = [];

          // إذا الصلاحيات موجودة مباشرة في user.permissions
          if (response.user?.permissions && Array.isArray(response.user.permissions)) {
            permissions = response.user.permissions;
          }
          // أو إذا الصلاحيات داخل roles
          else if (response.user?.roles) {
            permissions = response.user.roles.flatMap((role: any) =>
              role.permissions?.map((p: any) => p.name || p) || []
            );
          }

          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            permissions,
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
            permissions: [],
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
            permissions: [],
          });
          // Clear the cookie
          if (typeof document !== "undefined") {
            document.cookie = "wso-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          }
          throw error;
        }
      },

      setUser: (user) => set({ user }),

      setPermissions: (permissions) => set({ permissions }),

      // التحقق من صلاحية واحدة
      hasPermission: (permission: string) => {
        const state = get();

        // Admin له كل الصلاحيات
        if (state.isAdmin()) return true;

        // التحقق من وجود الصلاحية في القائمة
        return state.permissions.includes(permission);
      },

      // التحقق من أي صلاحية من القائمة (OR)
      hasAnyPermission: (permissions: string[]) => {
        const state = get();

        // Admin له كل الصلاحيات
        if (state.isAdmin()) return true;

        // التحقق من وجود أي صلاحية
        return permissions.some((p) => state.permissions.includes(p));
      },

      // التحقق من كل الصلاحيات (AND)
      hasAllPermissions: (permissions: string[]) => {
        const state = get();

        // Admin له كل الصلاحيات
        if (state.isAdmin()) return true;

        // التحقق من وجود كل الصلاحيات
        return permissions.every((p) => state.permissions.includes(p));
      },

      // التحقق من أن المستخدم Admin
      isAdmin: () => {
        const state = get();

        // التحقق من الصلاحية الخاصة
        if (state.permissions.includes("*")) return true;
        if (state.permissions.includes("ADMIN")) return true;

        // التحقق من الدور - يمكن أن يكون roles مصفوفة نصوص أو كائنات
        if (state.user?.roles) {
          // إذا roles مصفوفة نصوص (مثل ["super_admin"])
          if (Array.isArray(state.user.roles)) {
            return state.user.roles.some((role: any) =>
              typeof role === "string"
                ? role === "ADMIN" || role === "super_admin" || role === "admin"
                : role.name === "ADMIN" || role.name === "super_admin" || role.name === "admin"
            );
          }
        }

        return false;
      },
    }),
    {
      name: "wso-auth",
    }
  )
);
