import { useEffect, useState } from "react";

// Breakpoints (px): below each threshold = that device class
const BREAKPOINTS = { mobile: 640, tablet: 1024, desktop: 1440, monitor: 1920 };

export function getDeviceType(width) {
  if (width < BREAKPOINTS.mobile) return "mobile";
  if (width < BREAKPOINTS.tablet) return "tablet";
  if (width < BREAKPOINTS.desktop) return "desktop";
  if (width < BREAKPOINTS.monitor) return "monitor";
  return "tv";
}

export default function useViewport() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1440);

  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const device = getDeviceType(width);
  return {
    width,
    device,
    isMobile: device === "mobile",
    isTablet: device === "tablet",
    isDesktop: device === "desktop",
    isMonitor: device === "monitor",
    isTv: device === "tv",
    // "Compact" = sidebar becomes an overlay drawer instead of a pushing rail
    isCompact: device === "mobile" || device === "tablet",
  };
}