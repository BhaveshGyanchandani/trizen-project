"use client";

import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

/** Returns whether the viewport is currently narrower than the mobile breakpoint (client-only; assumes desktop during SSR). */
function getIsMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

/**
 * Tracks whether the viewport is currently mobile-width, updating live
 * as the window is resized or the device rotates. Used to switch the
 * sidebar between its docked and Sheet (slide-out) presentations.
 */
export function useIsMobile() {
  // Lazy initializer reads the real value on first client render instead of
  // setting state inside the effect body (which triggers a cascading
  // extra render — flagged by eslint-plugin-react-hooks' set-state-in-effect
  // rule). The effect below only handles *subsequent* changes.
  const [isMobile, setIsMobile] = useState(getIsMobile);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(getIsMobile());
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
