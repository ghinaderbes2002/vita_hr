import axios from "axios";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/stores/auth-store";
import { AUTH_ERROR_CODES } from "@/lib/permissions/error-codes";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000, // 15 second timeout
});

// Separate instance for refresh to avoid interceptor loop
export const refreshClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Helper function to get token from cookie
function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split("; ");
  const tokenCookie = cookies.find((c) => c.startsWith("wso-token="));
  return tokenCookie ? tokenCookie.split("=")[1] : null;
}

// Request interceptor
apiClient.interceptors.request.use((config) => {
  // Try to get token from cookie first (more reliable), then fallback to store
  const token = getTokenFromCookie() || useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Remove Cache-Control header to avoid CORS preflight rejection
  delete config.headers['Cache-Control'];
  delete config.headers['cache-control'];
  delete config.headers['Pragma'];
  return config;
});

// Queue to handle multiple 401s at once (prevents race conditions)
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const errorCode = error.response?.data?.code;

    // Rate limit (429) — handle globally, except on login (login page shows its own message)
    if (error.response?.status === 429) {
      return Promise.reject(error);
    }

    // Endpoints that return 403 silently (background polling, not user-initiated)
    const SILENT_403_PATHS = ["/physio/emergency/incoming"];
    if (
      errorCode === AUTH_ERROR_CODES.INSUFFICIENT_PERMISSIONS &&
      !SILENT_403_PATHS.some((p) => originalRequest?.url?.includes(p))
    ) {
      toast.error("ليس لديك صلاحية لهذا الإجراء");
      return Promise.reject(error);
    }
    if (errorCode === AUTH_ERROR_CODES.INSUFFICIENT_PERMISSIONS) {
      return Promise.reject(error);
    }

    // Endpoints that should fail silently on 401 — no logout triggered
    const SILENT_FAIL_PATHS = [
      "/employees/my",
      "/notifications/unread-count",
      "/notifications",
    ];
    const isSilentPath = SILENT_FAIL_PATHS.some((p) => originalRequest?.url?.includes(p));

    // Only try to refresh if we get a 401 and haven't retried this request yet
    // Token revoked / invalid both trigger refresh attempt
    if (error.response?.status === 401 && !originalRequest._retry && !isSilentPath) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the access token
        await useAuthStore.getState().refreshAccessToken();

        // Get the new token from cookie (more reliable)
        const newToken = getTokenFromCookie() || useAuthStore.getState().accessToken;

        if (newToken) {
          // Update the failed request with new token and retry
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          return apiClient(originalRequest);
        } else {
          throw new Error("No token after refresh");
        }
      } catch (refreshError: any) {
        // Process queue with error
        processQueue(refreshError, null);

        // Only logout for definitive auth failures (401/403 from refresh endpoint).
        // Network errors, timeouts, and server errors (5xx) should NOT cause logout —
        // they are transient and the current token may still be valid.
        const refreshStatus = refreshError?.response?.status;
        const isDefinitiveAuthFailure = refreshStatus === 401 || refreshStatus === 403;

        if (isDefinitiveAuthFailure) {
          console.error('❌ Token refresh failed — session expired, logging out');
          const refreshErrorCode = refreshError?.response?.data?.code;
          if (refreshErrorCode === AUTH_ERROR_CODES.ACCOUNT_INACTIVE) {
            toast.error(refreshError?.response?.data?.message || "الحساب غير نشط. يرجى التواصل مع المسؤول.");
          }
          useAuthStore.getState().logout();
          if (typeof window !== "undefined" && !window.location.pathname.includes('/login')) {
            const currentLocale = window.location.pathname.split('/')[1] || 'ar';
            window.location.href = `/${currentLocale}/login`;
          }
        } else {
          console.error('❌ Token refresh failed (transient error, staying logged in):', refreshError?.message);
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
