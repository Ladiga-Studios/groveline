import Link from "next/link";
import Logo from "./Logo";
import Sprout from "./Sprout";
import { FOR_PAGES } from "@/lib/for";

export default function Footer() {
  return (
    <footer className="mt-20 bg-grove text-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-3 max-w-xs text-cream/80">
            A place for people who sell things in batches. Post what you have,
            neighbors reserve it, everybody meets up in person.
          </p>
          <div className="mt-5 flex flex-col gap-2 text-cream/80">
            <a href="mailto:hello@groveline.io" className="w-fit hover:underline">hello@groveline.io</a>
            <p className="flex items-center gap-1.5">
              <Sprout size={18} className="text-leaf" />
              Grown in Alabama.
            </p>
          </div>
        </div>
        <nav aria-label="Groveline" className="flex flex-col gap-2">
          <p className="font-semibold">Groveline</p>
          <Link href="/" className="hover:underline">Home</Link>
          <Link href="/browse" className="hover:underline">Browse drops</Link>
          <Link href="/sellers" className="hover:underline">Shops</Link>
          <Link href="/sell" className="hover:underline">Start selling</Link>
          <Link href="/pricing" className="hover:underline">Pricing</Link>
          <Link href="/reservations" className="hover:underline">My reservations</Link>
          <Link href="/login" className="hover:underline">Log in</Link>
        </nav>
        <nav aria-label="Made for" className="flex flex-col gap-2">
          <p className="font-semibold">Made for</p>
          {FOR_PAGES.map((p) => (
            <Link key={p.slug} href={`/for/${p.slug}`} className="hover:underline">{p.heading}</Link>
          ))}
        </nav>
        <nav aria-label="Help and legal" className="flex flex-col gap-2">
          <p className="font-semibold">Help</p>
          <Link href="/support" className="hover:underline">Support</Link>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <Link href="/terms" className="hover:underline">Terms</Link>
        </nav>
      </div>
      <div className="border-t border-cream/15">
        <p className="mx-auto max-w-6xl px-4 py-5 text-sm text-cream/70">
          Copyright {new Date().getFullYear()} Ladiga Studios LLC. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
