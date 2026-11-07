import { useAuthStore } from "@/lib/stores/auth-store";
import { useMyEmployee } from "@/lib/hooks/use-employees";

/**
 * Every job title the signed-in user holds right now: their own, plus those of
 * anyone they stand in for during a leave delegation.
 *
 * Two readings, because a delegate must gain without losing:
 * - `hasAny(codes)` — for titles that GRANT something (sees every patient…):
 *   one matching title is enough.
 * - `onlyAmong(codes)` — for titles that RESTRICT something (reception tab only…):
 *   applies only when every title the user holds is restricted, so standing in
 *   for a restricted role never takes away what their own role allows.
 */
export function useJobTitleCodes() {
  const { data: myEmployee, isLoading } = useMyEmployee();
  const delegated = useAuthStore((s) => s.jobTitleCodes);
  const own: string = (myEmployee as { jobTitle?: { code?: string } } | undefined)?.jobTitle?.code ?? "";
  const codes = [...new Set([own, ...(delegated ?? [])].filter(Boolean))];

  return {
    codes,
    isLoading,
    hasAny: (list: readonly string[]) => codes.some((c) => list.includes(c)),
    onlyAmong: (list: readonly string[]) => codes.length > 0 && codes.every((c) => list.includes(c)),
  };
}
