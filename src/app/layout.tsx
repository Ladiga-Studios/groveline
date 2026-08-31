import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/instrument-sans";
import "./globals.css";
import Header from "@/components/Header";
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
    "Local sellers post what they have. Buyers claim it in seconds and pick it up in person. Free until you sell.",
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
  let loggedIn = false;
  let isSeller = false;
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    loggedIn = !!user;
    if (user) {
      const { data: p } = await supabase.from("profiles").select("is_seller").eq("id", user.id).maybeSingle();
      isSeller = !!p?.is_seller;
    }
  } catch {
    loggedIn = false;
  }

  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <Header loggedIn={loggedIn} isSeller={isSeller} />
          <main id="main">{children}</main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
