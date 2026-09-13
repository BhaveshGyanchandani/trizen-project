"use client";

import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

function getIsMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

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
