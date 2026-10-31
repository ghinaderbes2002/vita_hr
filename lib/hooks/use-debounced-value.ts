import { useEffect, useState } from "react";

/** The value once it has stopped changing — keeps a search box from firing a request per keystroke. */
export function useDebouncedValue<T>(value: T, ms = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}
