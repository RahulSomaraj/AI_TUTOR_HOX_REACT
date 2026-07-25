import { useEffect } from "react";

// Calls `onOutside` when a mousedown happens outside the referenced element.
// Used for closing dropdowns, popovers, and menus.
export default function useOutsideClick(ref, onOutside) {
  useEffect(() => {
    function handleClick(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        onOutside();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onOutside, ref]);
}

