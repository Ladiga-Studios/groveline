"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* Re-fetches the page when the tab comes back into focus or the user
   navigates back to it, so lists like reservations are never stale. */
export default function RefreshOnReturn() {
  const router = useRouter();
  useEffect(() => {
    router.refresh();
    const onShow = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("pageshow", onShow);
    return () => {
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("pageshow", onShow);
    };
  }, [router]);
  return null;
}
