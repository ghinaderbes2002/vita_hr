import axios from "axios";
import { useAuthStore } from "@/lib/stores/auth-store";

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

    // Only try to refresh if we get a 401 and haven't retried this request yet
    if (error.response?.status === 401 && !originalRequest._retry) {
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
      } catch (refreshError) {
        // Process queue with error
        processQueue(refreshError, null);

        // Only logout and redirect if refresh actually failed
        console.error('❌ Token refresh failed:', refreshError);

        // Clear auth state silently
        useAuthStore.getState().logout();

        // Only redirect to login if we're not already there
        if (typeof window !== "undefined" && !window.location.pathname.includes('/login')) {
          window.location.href = "/ar/login";
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
