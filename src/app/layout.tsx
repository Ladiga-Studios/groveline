import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/instrument-sans";
import "./globals.css";
import Header, { type HeaderUser } from "@/components/Header";
import ScrollToTop from "@/components/ScrollToTop";
import Footer from "@/components/Footer";
import { ToastProvider } from "@/components/Toast";
import { supabaseServer } from "@/lib/supabase/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://groveline.io";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Groveline | Local drops, claimed in seconds",
    template: "%s | Groveline",
  },
  description:
    "Sell what you make in batches. Post what you have, share one link, and neighbors reserve it in seconds. Pickup or shipping, cash or card. First three drops free.",
  openGraph: {
    siteName: "Groveline",
    type: "website",
    url: siteUrl,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1e4d2b",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let headerUser: HeaderUser = null;
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const [{ data: p }, { count }] = await Promise.all([
        supabase.from("profiles").select("name, avatar_url, slug, is_admin").eq("id", user.id).maybeSingle(),
        supabase.from("shops").select("*", { count: "exact", head: true }).eq("owner_id", user.id),
      ]);
      if (p) headerUser = { name: p.name, avatarUrl: p.avatar_url, slug: p.slug, shopCount: count ?? 0, isAdmin: !!p.is_admin };
    }
  } catch {
    headerUser = null;
  }

  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <Header user={headerUser} />
          <ScrollToTop />
          <main id="main">{children}</main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
