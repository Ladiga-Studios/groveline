import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Groveline drop";

const colors = {
  cream: "#faf6ef",
  creamDark: "#f1eadc",
  grove: "#1e4d2b",
  leaf: "#4e8a5a",
  peach: "#f2a65a",
  ink: "#2b2b26",
  muted: "#6b6a5f",
};

function money(cents: number) {
  const d = cents / 100;
  return d % 1 === 0 ? `$${d}` : `$${d.toFixed(2)}`;
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: drop } = await supabase
    .from("drops")
    .select("*, shops!drops_seller_id_fkey(name, town)")
    .eq("slug", slug)
    .maybeSingle();

  const title = drop?.title ?? "A local drop";
  const price = drop ? money(drop.price_cents) : "";
  const seller = drop?.shops?.name || "";
  const town = drop?.pickup_city || drop?.shops?.town || "";
  const left = drop ? drop.quantity - drop.claimed : 0;
  const photo = drop?.photo_url as string | undefined;
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
          padding: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            background: "white",
            borderRadius: 28,
            border: `3px solid ${colors.creamDark}`,
            overflow: "hidden",
          }}
        >
          {photo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={photo}
              alt=""
              style={{ width: 470, height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 300,
                height: "100%",
                background: colors.grove,
                color: colors.cream,
                fontSize: 130,
              }}
            >
              *
            </div>
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              flex: 1,
              padding: 44,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: 56,
                  fontWeight: 700,
                  color: colors.ink,
                  lineHeight: 1.1,
                }}
              >
                {title}
              </div>
              {seller ? (
                <div style={{ fontSize: 30, color: colors.muted, marginTop: 12 }}>
                  {seller}
                  {town ? ` in ${town}` : ""}
                </div>
              ) : null}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 76, fontWeight: 700, color: colors.grove }}>
                {price}
              </div>
              <div style={{ fontSize: 28, color: colors.ink, marginTop: 4 }}>
                {left > 0 ? `${left} left` : "Sold out"}
                {pickup ? `, pickup ${pickup}` : ""}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 24,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    background: colors.peach,
                    color: colors.ink,
                    fontSize: 30,
                    fontWeight: 700,
                    padding: "18px 36px",
                    borderRadius: 999,
                  }}
                >
                  Tap to reserve
                </div>
                <div style={{ fontSize: 24, color: colors.leaf, fontWeight: 600 }}>
                  groveline.io
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
