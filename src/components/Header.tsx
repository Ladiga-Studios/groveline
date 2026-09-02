"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Logo from "./Logo";
import Avatar from "./Avatar";
import { supabaseBrowser } from "@/lib/supabase/client";

/* Top-level links. "Sell" goes straight to the selling page; the themed
   "made for" pages are linked from there and the footer instead of a
   dropdown, so one tap gets people to the pitch. */
const links = [
  { href: "/browse", label: "Browse drops" },
  { href: "/sellers", label: "Shops" },
  { href: "/sell", label: "Sell" },
  { href: "/pricing", label: "Pricing" },
];

export type HeaderUser = { name: string; avatarUrl: string | null; slug: string; shopCount: number; isAdmin: boolean } | null;

function Chevron({ open = false }: { open?: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M2 4 L6 8 L10 4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function Header({ user }: { user: HeaderUser }) {
  const [open, setOpen] = useState(false); // mobile sheet
  const [menu, setMenu] = useState(false); // account dropdown
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const acctRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Any navigation closes everything.
  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [pathname]);

  useEffect(() => {
    if (!open && !menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setMenu(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menu && acctRef.current && !acctRef.current.contains(t)) setMenu(false);
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

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));
  // The themed /for pages are part of the selling pitch, so "Sell" stays lit there.
  const isSellActive = (href: string) => href === "/sell" && pathname.startsWith("/for/");

  /* Account menu, grouped by what you're doing: selling, buying, then the
     account itself. */
  const accountGroups: { label: string; items: { href: string; label: string }[] }[] = user
    ? [
        {
          label: "Selling",
          items:
            user.shopCount > 0
              ? [
                  { href: "/dashboard", label: "My drops" },
                  { href: "/dashboard/new", label: "Post a drop" },
                  { href: "/dashboard/shops", label: "My shops" },
                ]
              : [{ href: "/dashboard", label: "Start selling" }],
        },
        {
          label: "Buying",
          items: [
            { href: "/reservations", label: "My reservations" },
            { href: "/following", label: "Sellers I follow" },
          ],
        },
        {
          label: "Account",
          items: [
            { href: `/u/${user.slug}`, label: "My profile" },
            { href: "/dashboard/settings", label: "Settings" },
            { href: "/support", label: "Get help" },
            ...(user.isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
          ],
        },
      ]
    : [];

  const navLink = "rounded-lg px-3 py-2 font-medium text-ink transition-colors hover:bg-cream-dark hover:text-grove";
  const navActive = "text-grove";

  return (
    <header className={`sticky top-0 z-40 bg-cream/95 backdrop-blur transition-shadow ${scrolled ? "shadow-lift" : ""}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />

        {/* Desktop nav */}
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`${navLink} ${isActive(l.href) || isSellActive(l.href) ? navActive : ""}`}>
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:flex">
          {user && user.shopCount > 0 && (
            <Link href="/dashboard/new" className="btn btn-primary !min-h-11 !px-5">Post a drop</Link>
          )}
          {user ? (
            <div ref={acctRef} className="relative">
              <button
                onClick={() => setMenu(!menu)}
                aria-expanded={menu}
                aria-haspopup="menu"
                aria-label={`Account menu for ${user.name}`}
                className="flex min-h-11 items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-cream-dark"
              >
                <Avatar url={user.avatarUrl} name={user.name} size={34} />
                <span className="max-w-32 truncate font-medium">{user.name.split(" ")[0]}</span>
                <Chevron open={menu} />
              </button>
              {menu && (
                <div role="menu" className="absolute right-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-2xl border border-cream-dark bg-white p-2 shadow-lift">
                  <Link href={`/u/${user.slug}`} role="menuitem" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-cream">
                    <Avatar url={user.avatarUrl} name={user.name} size={40} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{user.name}</span>
                      <span className="block text-sm text-muted">View profile</span>
                    </span>
                  </Link>
                  {accountGroups.map((g) => (
                    <div key={g.label} className="mt-1 border-t border-cream-dark pt-1">
                      <p className="px-3 pb-0.5 pt-1 text-xs font-semibold text-muted">{g.label}</p>
                      {g.items.map((i) => (
                        <Link
                          key={i.href}
                          href={i.href}
                          prefetch={false}
                          role="menuitem"
                          className={`block rounded-lg px-3 py-2 hover:bg-cream ${isActive(i.href) && i.href !== "/dashboard" ? "font-medium text-grove" : ""}`}
                        >
                          {i.label}
                        </Link>
                      ))}
                    </div>
                  ))}
                  <div className="mt-1 border-t border-cream-dark pt-1">
                    <button role="menuitem" onClick={logOut} className="block w-full rounded-lg px-3 py-2 text-left text-muted hover:bg-cream">
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="btn btn-outline !min-h-11 !px-5">Log in</Link>
              <Link href="/login?mode=register" className="btn btn-grove !min-h-11 !px-5">Create account</Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="grid h-11 w-11 place-items-center rounded-lg md:hidden"
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

      {/* Mobile sheet */}
      {open && (
        <div id="mobile-menu" ref={menuRef} className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-cream-dark bg-cream px-4 pb-6 pt-2 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            <Link href="/" className={`rounded-lg px-3 py-3 font-medium hover:bg-cream-dark ${pathname === "/" ? "text-grove" : ""}`}>Home</Link>
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={`rounded-lg px-3 py-3 font-medium hover:bg-cream-dark ${isActive(l.href) || isSellActive(l.href) ? "text-grove" : ""}`}>
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                {user.shopCount > 0 && (
                  <Link href="/dashboard/new" className="btn btn-primary mt-3">Post a drop</Link>
                )}
                <div className="mt-3 flex items-center gap-3 border-t border-cream-dark px-3 pt-4">
                  <Avatar url={user.avatarUrl} name={user.name} size={36} />
                  <span className="font-semibold">{user.name}</span>
                </div>
                {accountGroups.map((g) => (
                  <div key={g.label} className="mt-1">
                    <p className="px-3 pb-0.5 pt-2 text-xs font-semibold text-muted">{g.label}</p>
                    {g.items.map((i) => (
                      <Link key={i.href} href={i.href} prefetch={false} className="block rounded-lg px-3 py-2.5 hover:bg-cream-dark">
                        {i.label}
                      </Link>
                    ))}
                  </div>
                ))}
                <button onClick={logOut} className="mt-1 rounded-lg px-3 py-3 text-left text-muted hover:bg-cream-dark">Log out</button>
              </>
            ) : (
              <>
                <Link href="/login?mode=register" className="btn btn-grove mt-3">Create account</Link>
                <Link href="/login" className="btn btn-outline mt-2">Log in</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
