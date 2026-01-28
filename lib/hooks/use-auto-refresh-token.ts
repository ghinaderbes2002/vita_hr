import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getTokenExpiryTime, isTokenExpiringSoon } from "@/lib/utils/jwt";

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
        console.log('✅ Token auto-refreshed successfully');

        // Schedule next refresh based on new token
        scheduleNextRefresh();
      } catch (error) {
        console.error('❌ Auto-refresh failed:', error);
        // Don't redirect here, let the axios interceptor handle it
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
