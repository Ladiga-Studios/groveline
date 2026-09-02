import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="font-display text-6xl font-semibold text-leaf">404</p>
      <h1 className="mt-3 text-2xl font-semibold">
        We couldn't find that page.
      </h1>
      <p className="mt-2 text-muted">
        The drop may have ended, or the link may be incorrect.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/browse" className="btn btn-primary">
          Browse active drops
        </Link>
        <Link href="/" className="btn btn-outline">
          Go home
        </Link>
      </div>
    </div>
  );
}
