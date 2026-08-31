"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Logo from "./Logo";

const links = [
  { href: "/browse", label: "Browse drops" },
  { href: "/sell", label: "Start selling" },
];

export default function Header({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    menuRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-40 bg-cream/95 backdrop-blur transition-shadow ${
        scrolled ? "shadow-lift" : ""
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav aria-label="Primary" className="hidden items-center gap-6 sm:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-medium text-ink hover:text-grove"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href={loggedIn ? "/dashboard" : "/login"}
            className="btn btn-grove !min-h-11 !px-5"
          >
            {loggedIn ? "My drops" : "Log in"}
          </Link>
        </nav>
        <button
          className="grid h-11 w-11 place-items-center rounded-lg sm:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            {open ? (
              <path
                d="M4 4 L18 18 M18 4 L4 18"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M3 6 H19 M3 11 H19 M3 16 H19"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>
      {open && (
        <div
          id="mobile-menu"
          ref={menuRef}
          className="border-t border-cream-dark bg-cream px-4 pb-4 pt-2 sm:hidden"
        >
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 font-medium hover:bg-cream-dark"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href={loggedIn ? "/dashboard" : "/login"}
              onClick={() => setOpen(false)}
              className="btn btn-grove mt-2"
            >
              {loggedIn ? "My drops" : "Log in"}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
