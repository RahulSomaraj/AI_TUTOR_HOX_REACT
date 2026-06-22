import { useEffect, useState } from "react";

// Returns a debounced copy of `value` that only updates after `delay` ms of
// no changes. Used to throttle search-as-you-type and filter inputs.
export default function useDebounce(value, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timeoutId);
  }, [delay, value]);

  return debouncedValue;
}
