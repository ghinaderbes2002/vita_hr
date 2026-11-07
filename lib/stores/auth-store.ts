import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/lib/api/auth";
import { User } from "@/types";
import type { ActiveDelegation, EffectiveAccess } from "@/lib/api/effective-access";
import { globalQueryClient } from "@/components/providers/query-provider";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  permissions: string[];
  /**
   * Live access from /auth/me/effective: everything the login granted plus what
   * an active leave delegation adds. Kept out of storage — it is re-read on load,
   * so a delegation that has ended never lingers. Empty until the first read.
   */
  effectivePermissions: string[];
  /** Own job title plus the delegators'; null until the first read. */
  jobTitleCodes: string[] | null;
  activeDelegations: ActiveDelegation[];
  setEffectiveAccess: (access: EffectiveAccess) => void;
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
  hasRole: (roleName: string) => boolean;
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
      effectivePermissions: [],
      jobTitleCodes: null,
      activeDelegations: [],

      setEffectiveAccess: ({ permissions, jobTitleCodes, activeDelegations }) =>
        set({ effectivePermissions: permissions, jobTitleCodes, activeDelegations }),

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

          // Set cookie FIRST so apiClient can use token for /auth/me call
          document.cookie = `wso-token=${response.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

          // استعادة employeeId من localStorage إذا كان مربوطاً مسبقاً
          let userWithEmployee = response.user;
          try {
            const map = JSON.parse(localStorage.getItem("vita-user-employee-map") || "{}");
            const savedEmployeeId = map[response.user?.id];
            if (savedEmployeeId) {
              userWithEmployee = { ...response.user, employeeId: savedEmployeeId };
            }
          } catch {}

          // Clear any cached data from a previous session before setting new user
          globalQueryClient?.clear();

          set({
            user: userWithEmployee,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            permissions,
          });
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
            effectivePermissions: [],
            jobTitleCodes: null,
            activeDelegations: [],
          });
          // Clear the auth token cookie
          document.cookie = "wso-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          // Clear React Query cache so next user doesn't see previous user's data
          globalQueryClient?.clear();
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }
        try {
          const response = await authApi.refresh(refreshToken);
          set({
            accessToken: response.accessToken,
            ...(response.refreshToken && { refreshToken: response.refreshToken }),
          });

          // Update the cookie with the new access token
          if (typeof document !== "undefined") {
            document.cookie = `wso-token=${response.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
          }
        } catch (error) {
          // Don't clear auth state here — let the caller (interceptor) decide.
          // Clearing isAuthenticated here would kick the user out even on
          // transient network errors or failed proactive refreshes.
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

        // التحقق من وجود الصلاحية في القائمة — صلاحيات الدخول أو صلاحيات التفويض
        return state.permissions.includes(permission) || state.effectivePermissions.includes(permission);
      },

      // التحقق من أي صلاحية من القائمة (OR)
      hasAnyPermission: (permissions: string[]) => {
        const state = get();

        // Admin له كل الصلاحيات
        if (state.isAdmin()) return true;

        // التحقق من وجود أي صلاحية
        return permissions.some((p) => state.permissions.includes(p) || state.effectivePermissions.includes(p));
      },

      // التحقق من كل الصلاحيات (AND)
      hasAllPermissions: (permissions: string[]) => {
        const state = get();

        // Admin له كل الصلاحيات
        if (state.isAdmin()) return true;

        // التحقق من وجود كل الصلاحيات
        return permissions.every((p) => state.permissions.includes(p) || state.effectivePermissions.includes(p));
      },

      // التحقق من وجود دور معين (بالاسم أو الاسم العربي/الإنجليزي)
      hasRole: (roleName: string) => {
        const state = get();
        if (!state.user?.roles) return false;
        const normalized = roleName.toLowerCase();
        return state.user.roles.some((r: any) => {
          // إذا الدور نص مباشر مثل "employee"
          if (typeof r === "string") return r.toLowerCase() === normalized;
          // إذا الدور object مثل { role: { name, displayNameAr } } أو { name, displayNameAr }
          const role = r.role ?? r;
          return (
            role.name?.toLowerCase() === normalized ||
            role.displayNameAr === roleName ||
            role.displayNameEn?.toLowerCase() === normalized
          );
        });
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
      // Delegated access is read live on every load, never restored from storage.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- picked out to be left unsaved
      partialize: ({ effectivePermissions: _p, jobTitleCodes: _j, activeDelegations: _a, ...rest }) => rest,
    }
  )
);
