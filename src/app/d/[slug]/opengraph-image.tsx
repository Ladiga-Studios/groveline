import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Groveline drop";

const colors = {
  cream: "#faf6ef",
  grove: "#1e4d2b",
  leaf: "#4e8a5a",
  peach: "#f2a65a",
  ink: "#2b2b26",
};

function money(cents: number) {
  const d = cents / 100;
  return d % 1 === 0 ? `$${d}` : `$${d.toFixed(2)}`;
}

export default async function OgImage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: drop } = await supabase
    .from("drops")
    .select("*, profiles!drops_seller_id_fkey(name, farm_name, town)")
    .eq("slug", params.slug)
    .maybeSingle();

  const title = drop?.title ?? "A local drop";
  const price = drop ? money(drop.price_cents) : "";
  const seller = drop?.profiles?.farm_name || drop?.profiles?.name || "";
  const town = drop?.profiles?.town || "";
  const left = drop ? drop.quantity - drop.claimed : 0;
  const pickup = drop
    ? new Date(drop.pickup_start).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: colors.cream,
          padding: 48,
        }}
      >
        {/* The tag card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            background: "white",
            borderRadius: 32,
            border: `3px solid #f1eadc`,
            padding: 56,
            position: "relative",
          }}
        >
          {/* punched hole */}
          <div
            style={{
              position: "absolute",
              left: 28,
              top: 285,
              width: 26,
              height: 26,
              borderRadius: 26,
              background: colors.cream,
              border: `5px solid #f1eadc`,
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 40 }}>
            <div
              style={{
                fontSize: 68,
                fontWeight: 700,
                color: colors.ink,
                lineHeight: 1.1,
              }}
            >
              {title}
            </div>
            {seller ? (
              <div style={{ fontSize: 34, color: "#6b6a5f", marginTop: 14 }}>
                {seller}
                {town ? ` in ${town}` : ""}
              </div>
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginLeft: 40,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 84, fontWeight: 700, color: colors.grove }}>
                {price}
              </div>
              <div style={{ fontSize: 32, color: colors.ink }}>
                {left > 0 ? `${left} left` : "Sold out"}
                {pickup ? `, pickup ${pickup}` : ""}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: colors.peach,
                color: colors.ink,
                fontSize: 36,
                fontWeight: 700,
                padding: "24px 44px",
                borderRadius: 999,
              }}
            >
              Tap to reserve
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 24,
              right: 44,
              display: "flex",
              alignItems: "center",
              fontSize: 26,
              color: colors.leaf,
              fontWeight: 600,
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
