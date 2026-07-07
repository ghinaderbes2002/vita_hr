import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getTokenExpiryTime, isTokenExpiringSoon } from "@/lib/utils/jwt";
import { AUTH_ERROR_CODES } from "@/lib/permissions/error-codes";

// Fallback: Auto refresh token every 4 minutes (240000ms)
// This is used when we can't determine the token expiry time
const FALLBACK_REFRESH_INTERVAL = 4 * 60 * 1000;

// Refresh when token has 2 minutes left (120 seconds)
const REFRESH_BUFFER = 120;

export function useAutoRefreshToken() {
  const { isAuthenticated, refreshToken, accessToken } = useAuthStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    // Only set up auto-refresh if user is authenticated and has a refresh token
    if (!isAuthenticated || !refreshToken) {
      // Clear any existing interval/timeout
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Function to refresh the token
    const performRefresh = async () => {
      // Prevent concurrent refresh requests
      if (isRefreshingRef.current) {
        return;
      }

      isRefreshingRef.current = true;
      try {
        await useAuthStore.getState().refreshAccessToken();
        // scheduleNextRefresh() is NOT called here intentionally:
        // the effect re-runs automatically when accessToken changes,
        // which schedules the next refresh — calling it here too would
        // create duplicate timers.
      } catch (error: any) {
        // Silent failure by default — user stays logged in with the current token.
        // The axios interceptor will handle logout if an actual API call fails.
        // Exception: account deactivation should force an immediate logout rather
        // than waiting for the next real API call.
        if (error?.response?.data?.code === AUTH_ERROR_CODES.ACCOUNT_INACTIVE) {
          toast.error(error.response.data.message || "الحساب غير نشط. يرجى التواصل مع المسؤول.");
          useAuthStore.getState().logout();
          if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
            const currentLocale = window.location.pathname.split("/")[1] || "ar";
            window.location.href = `/${currentLocale}/login`;
          }
        }
      } finally {
        isRefreshingRef.current = false;
      }
    };

    // Schedule next refresh based on token expiry
    const scheduleNextRefresh = () => {
      const currentToken = useAuthStore.getState().accessToken;
      const expiresIn = getTokenExpiryTime(currentToken);

      if (expiresIn && expiresIn > REFRESH_BUFFER) {
        // Schedule refresh when token has REFRESH_BUFFER seconds left
        const refreshIn = (expiresIn - REFRESH_BUFFER) * 1000;
        console.log(`⏰ Next token refresh in ${Math.floor(refreshIn / 1000)} seconds`);

        timeoutRef.current = setTimeout(() => {
          performRefresh();
        }, refreshIn);
      } else {
        // Fallback to interval-based refresh if we can't determine expiry
        console.log(`⏰ Using fallback refresh interval (${FALLBACK_REFRESH_INTERVAL / 1000}s)`);
        intervalRef.current = setInterval(performRefresh, FALLBACK_REFRESH_INTERVAL);
      }
    };

    // Check if token is already expiring soon on mount
    if (isTokenExpiringSoon(accessToken, REFRESH_BUFFER)) {
      console.log('⚠️ Token expiring soon, refreshing immediately');
      performRefresh();
    } else {
      // Schedule refresh based on current token expiry
      scheduleNextRefresh();
    }

    // Clean up on unmount or when auth state changes
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, refreshToken, accessToken]);
}
