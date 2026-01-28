"use client";

import { useAutoRefreshToken } from "@/lib/hooks/use-auto-refresh-token";

export function AuthRefreshProvider({ children }: { children: React.ReactNode }) {
  // This hook will automatically refresh the token every 10 minutes
  useAutoRefreshToken();

  return <>{children}</>;
}
