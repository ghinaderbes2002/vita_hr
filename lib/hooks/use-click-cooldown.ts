import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Guards an action that creates a record against an accidental second press.
 *
 * `isPending` on a mutation is not enough: it clears the moment the request
 * answers, while the page is still navigating to the new record — a second press
 * in that gap creates a duplicate. The lock here is taken synchronously on the
 * first press (a ref, so two clicks in the same frame cannot both pass) and held
 * for `ms` after a success. A failed attempt releases it at once, so the user
 * can retry.
 */
export function useClickCooldown(ms = 60_000) {
  const lockedRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [locked, setLocked] = useState(false);

  useEffect(() => () => clearTimeout(timer.current), []);

  const run = useCallback(async (action: () => Promise<unknown>) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setLocked(true);
    try {
      await action();
      timer.current = setTimeout(() => {
        lockedRef.current = false;
        setLocked(false);
      }, ms);
    } catch {
      // The mutation hook has already reported the error.
      lockedRef.current = false;
      setLocked(false);
    }
  }, [ms]);

  return { run, locked };
}
