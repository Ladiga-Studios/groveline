"use client";
import { useToast } from "./Toast";

/* Share a link to Facebook.

   On phones, facebook.com/sharer links get intercepted by the Facebook app,
   which opens and then shows nothing. The reliable path on mobile is the
   native share sheet (navigator.share): the person taps Facebook there and
   the app's own share extension builds the post, with the photo, title, and
   price pulled from the link's Open Graph tags.

   On desktop, the sharer URL works fine, so it opens in a small popup. The
   element stays a real link so it still does something if JS hasn't loaded. */
export default function FacebookShareButton({
  url,
  label = "Share to Facebook",
  title,
  text,
}: {
  url: string;
  label?: string;
  title?: string;
  text?: string;
}) {
  const toast = useToast();
  const sharer = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

  async function share(e: React.MouseEvent<HTMLAnchorElement>) {
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (mobile && typeof navigator.share === "function") {
      e.preventDefault();
      try {
        await navigator.share({ url, title, text });
      } catch (err) {
        // AbortError means they closed the sheet. Anything else, fall back to copy.
        if ((err as { name?: string })?.name !== "AbortError") {
          try {
            await navigator.clipboard.writeText(url);
            toast("Link copied. Paste it into your Facebook post.", "success");
          } catch {
            toast("Could not open the share sheet. Long press the link to copy it.", "error");
          }
        }
      }
      return;
    }
    // Desktop: popup instead of a full tab.
    e.preventDefault();
    window.open(sharer, "fb-share", "noopener,noreferrer,width=600,height=520");
  }

  return (
    <a
      href={sharer}
      onClick={share}
      target="_blank"
      rel="noopener noreferrer"
      className="btn !min-h-11 bg-[#1877F2] text-white hover:bg-[#166fe0]"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z" />
      </svg>
      {label}
    </a>
  );
}
