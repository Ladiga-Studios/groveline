"use client";
import { useToast } from "./Toast";

/* Native share sheet on phones, copy on desktop. */
export default function ShareButton({
  url,
  title,
  text,
  label = "Share",
  primary = false,
}: {
  url: string;
  title: string;
  text?: string;
  label?: string;
  primary?: boolean;
}) {
  const toast = useToast();
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ url, title, text });
        return;
      } catch {
        /* user closed the sheet, nothing to do */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast("Link copied. Paste it anywhere.", "success");
      } catch {
        toast("Could not copy. Long press the link to copy it.", "error");
      }
    }
  }
  return (
    <button onClick={share} className={primary ? "btn btn-primary" : "btn btn-outline"}>
      {label}
    </button>
  );
}
