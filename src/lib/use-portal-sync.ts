"use client";
import { useEffect } from "react";
import { useTour } from "@/tours/tour-context";

/** ponytail: shared database + visible-tab polling; add push only if instant delivery is required. */
export function usePortalSync(refresh: () => void | Promise<void>, enabled = true) {
  const { active } = useTour();
  useEffect(() => {
    if (!enabled || active) return;
    const update = () => { if (!document.hidden) void refresh(); };
    const timer = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [refresh, enabled, active]);
}
