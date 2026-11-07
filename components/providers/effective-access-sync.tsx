"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserCheck } from "lucide-react";
import { effectiveAccessApi } from "@/lib/api/effective-access";
import { useAuthStore } from "@/lib/stores/auth-store";

const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB");

/**
 * Keeps the signed-in user's live access in the auth store: what a leave
 * delegation adds starts and ends on the server, so it is re-read on load, when
 * the tab regains focus and every few minutes. Also shows who they stand in for.
 */
export function EffectiveAccessSync() {
  const setEffectiveAccess = useAuthStore((s) => s.setEffectiveAccess);
  const delegations = useAuthStore((s) => s.activeDelegations);

  const { data } = useQuery({
    queryKey: ["auth-effective-access"],
    queryFn: () => effectiveAccessApi.get(),
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  useEffect(() => {
    if (data) setEffectiveAccess(data);
  }, [data, setEffectiveAccess]);

  if (delegations.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
      <UserCheck className="h-4 w-4 shrink-0" />
      {delegations.map((d) => (
        <span key={d.id}>
          أنت تعمل حالياً نيابة عن <b>{d.delegatorName}</b>
          {d.delegatorJobTitle ? ` (${d.delegatorJobTitle})` : ""} حتى <span dir="ltr">{fmt(d.to)}</span>
        </span>
      ))}
    </div>
  );
}
