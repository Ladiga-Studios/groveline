import { ImageResponse } from "next/og";
import { MARK_DARK_DATA_URI, MARK_DARK_SIZE } from "@/lib/og-mark";

/* The preview card for groveline.io itself, used by Facebook, iMessage,
   and anywhere else a link gets pasted. Individual drops have their own at
   /d/[slug]/opengraph-image.tsx; this covers the home page and every page
   that doesn't define one.

   Deliberately plain. These get seen at thumbnail size in a feed, so the
   name and one clear line are all that survive. */
export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Groveline: sell what you make in batches";

const colors = {
  cream: "#faf6ef",
  grove: "#1e4d2b",
  peach: "#f2a65a",
  ink: "#2b2b26",
};

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: colors.grove,
          padding: "0 90px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MARK_DARK_DATA_URI}
            alt=""
            width={MARK_DARK_SIZE.width}
            height={MARK_DARK_SIZE.height}
            style={{ width: MARK_DARK_SIZE.width, height: MARK_DARK_SIZE.height }}
          />
          <div style={{ fontSize: 118, fontWeight: 700, color: colors.cream, letterSpacing: -3 }}>
            groveline
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 44,
            color: colors.cream,
            marginTop: 40,
            lineHeight: 1.35,
            maxWidth: 1000,
          }}
        >
          Sell what you make in batches. Share one link, and neighbors reserve
          it in seconds.
        </div>

        <div style={{ display: "flex", marginTop: 44 }}>
          <div
            style={{
              display: "flex",
              background: colors.peach,
              color: colors.ink,
              fontSize: 32,
              fontWeight: 700,
              padding: "14px 30px",
              borderRadius: 999,
            }}
          >
            groveline.io
          </div>
        </div>
      </div>
    ),
    size
  );
}
