import Link from "next/link";
import Logo from "./Logo";
import Sprout from "./Sprout";

export default function Footer() {
  return (
    <footer className="mt-20 bg-grove text-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3">
        <div>
          <Logo light />
          <p className="mt-3 max-w-xs text-cream/80">
            A place for people who sell things in batches. Post what you have,
            neighbors reserve it, everybody meets up in person.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2">
          <Link href="/browse" className="hover:underline">Browse drops</Link>
          <Link href="/sellers" className="hover:underline">Sellers</Link>
          <Link href="/sell" className="hover:underline">Start selling</Link>
          <Link href="/reservations" className="hover:underline">My reservations</Link>
          <Link href="/login" className="hover:underline">Log in</Link>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <Link href="/terms" className="hover:underline">Terms</Link>
        </nav>
        <div className="flex flex-col gap-2 text-cream/80">
          <a href="mailto:hello@groveline.io" className="hover:underline">hello@groveline.io</a>
          <p className="flex items-center gap-1.5">
            <Sprout size={18} className="text-leaf" />
            Grown in Alabama.
          </p>
          <p>Copyright {new Date().getFullYear()} Groveline. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
