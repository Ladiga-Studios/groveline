"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "./Logo";
import Avatar from "./Avatar";
import { supabaseBrowser } from "@/lib/supabase/client";

const links = [
  { href: "/browse", label: "Browse drops" },
  { href: "/sellers", label: "Sellers" },
  { href: "/sell", label: "Start selling" },
  { href: "/pricing", label: "Pricing" },
];

export type HeaderUser = { name: string; avatarUrl: string | null; slug: string; shopCount: number; isAdmin: boolean } | null;

export default function Header({ user }: { user: HeaderUser }) {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const acctRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open && !menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setMenu(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (menu && acctRef.current && !acctRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    if (open) menuRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, menu]);

  async function logOut() {
    await supabaseBrowser().auth.signOut();
    setMenu(false);
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const accountItems = user
    ? [
        ...(user.shopCount > 0 ? [{ href: "/dashboard", label: "My drops" }] : [{ href: "/dashboard", label: "Start selling" }]),
        { href: "/reservations", label: "My reservations" },
        { href: "/following", label: "Sellers I follow" },
        { href: `/u/${user.slug}`, label: "My profile" },
        { href: "/dashboard/settings", label: "Settings" },
        { href: "/support", label: "Get help" },
        ...(user.isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : [];

  return (
    <header className={`sticky top-0 z-40 bg-cream/95 backdrop-blur transition-shadow ${scrolled ? "shadow-lift" : ""}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav aria-label="Primary" className="hidden items-center gap-6 sm:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="font-medium text-ink hover:text-grove">
              {l.label}
            </Link>
          ))}
          {user && user.shopCount > 0 && (
            <Link href="/dashboard/new" className="btn btn-primary !min-h-11 !px-5">Post a drop</Link>
          )}
          {user ? (
            <div ref={acctRef} className="relative">
              <button
                onClick={() => setMenu(!menu)}
                aria-expanded={menu}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-cream-dark"
              >
                <Avatar url={user.avatarUrl} name={user.name} size={34} />
                <span className="max-w-32 truncate font-medium">{user.name.split(" ")[0]}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4 L6 8 L10 4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" /></svg>
              </button>
              {menu && (
                <div role="menu" className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-cream-dark bg-white shadow-lift">
                  {accountItems.map((i) => (
                    <Link key={i.href} href={i.href} prefetch={false} role="menuitem" onClick={() => setMenu(false)} className="block px-4 py-2.5 hover:bg-cream-dark">
                      {i.label}
                    </Link>
                  ))}
                  <button role="menuitem" onClick={logOut} className="block w-full px-4 py-2.5 text-left text-muted hover:bg-cream-dark">
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn btn-grove !min-h-11 !px-5">Log in</Link>
          )}
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
              <path d="M4 4 L18 18 M18 4 L4 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            ) : (
              <path d="M3 6 H19 M3 11 H19 M3 16 H19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>
      {open && (
        <div id="mobile-menu" ref={menuRef} className="border-t border-cream-dark bg-cream px-4 pb-4 pt-2 sm:hidden">
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 font-medium hover:bg-cream-dark">
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                {user.shopCount > 0 && (
                  <Link href="/dashboard/new" onClick={() => setOpen(false)} className="btn btn-primary mt-2">Post a drop</Link>
                )}
                <div className="mt-2 flex items-center gap-3 border-t border-cream-dark px-3 pt-3">
                  <Avatar url={user.avatarUrl} name={user.name} size={36} />
                  <span className="font-semibold">{user.name}</span>
                </div>
                {accountItems.map((i) => (
                  <Link key={i.href} href={i.href} prefetch={false} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 hover:bg-cream-dark">
                    {i.label}
                  </Link>
                ))}
                <button onClick={logOut} className="rounded-lg px-3 py-3 text-left text-muted hover:bg-cream-dark">Log out</button>
              </>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="btn btn-grove mt-2">Log in</Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
