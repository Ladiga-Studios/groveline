"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/* Start every page at the top.

   `scroll-behavior: smooth` is set globally for in-page anchor links, and
   it also applies to the jump the router makes on navigation, which is
   why a new page could open halfway down or drift up slowly while you're
   already reading. This forces an instant jump on a route change and
   leaves anchor links alone. */
export default function ScrollToTop() {
  const pathname = usePathname();
  useEffect(() => {
    const html = document.documentElement;
    const previous = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    html.style.scrollBehavior = previous;
  }, [pathname]);
  return null;
}
