import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as XLSX from "xlsx";
import { supabaseServer } from "@/lib/supabase/server";
import { money, pickupWindow, shortDate, formatPhone } from "@/lib/format";

export const runtime = "nodejs";

/* Printable pickup sheet (PDF) or a spreadsheet (XLSX) of every claim. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = new URL(req.url).searchParams.get("format") === "xlsx" ? "xlsx" : "pdf";
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { data: drop } = await supabase
    .from("drops")
    .select("*, shops!drops_seller_id_fkey(name, owner_id)")
    .eq("id", id)
    .maybeSingle();
  const shop = Array.isArray(drop?.shops) ? drop?.shops[0] : drop?.shops;
  if (!drop || shop?.owner_id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: claims } = await supabase
    .from("claims")
    .select("*")
    .eq("drop_id", id)
    .is("cancelled_at", null)
    .order("created_at", { ascending: true });
  const rows = claims ?? [];
  const when = drop.fulfillment === "shipping" ? `Order by ${shortDate(drop.pickup_end)}` : `${pickupWindow(drop.pickup_start, drop.pickup_end)}${drop.pickup_place ? ` at ${drop.pickup_place}` : ""}`;
  const payLabel = (c: (typeof rows)[number]) =>
    c.method === "cash" ? "Cash" : c.payment_status === "captured" ? "Card, paid" : c.payment_status === "authorized" ? "Card on hold" : c.payment_status === "refunded" ? "Refunded" : "Card, incomplete";
  const safeName = drop.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  if (format === "xlsx") {
    const data = [
      ["#", "Name", "Phone", "Email", "Qty", "Total", "Payment", "Delivery", "Ship to", "Done", "Done at", "Tracking", "Reserved"],
      ...rows.map((c, i) => [
        i + 1, c.buyer_name, formatPhone(c.buyer_phone), c.buyer_email ?? "", c.quantity, (drop.price_cents * c.quantity) / 100, payLabel(c),
        c.delivery === "shipping" ? "Ship" : "Pickup", c.ship_address ?? "", c.picked_up ? "Yes" : "", c.picked_up_at ? new Date(c.picked_up_at).toLocaleString("en-US") : "", c.tracking ?? "", new Date(c.created_at).toLocaleString("en-US"),
      ]),
      [],
      ["Total items", rows.reduce((n, c) => n + c.quantity, 0)],
      ["Total value", rows.reduce((n, c) => n + (drop.price_cents * c.quantity) / 100, 0)],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [3, 24, 16, 26, 5, 9, 16, 9, 34, 6, 20, 24, 20].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Claims");
    const info = XLSX.utils.aoa_to_sheet([["Drop", drop.title], ["Shop", shop?.name ?? ""], ["Price", (drop.price_cents / 100)], ["When", when], ["Claimed", `${drop.claimed} of ${drop.quantity}`]]);
    XLSX.utils.book_append_sheet(wb, info, "Drop");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeName}-claims.xlsx"`,
      },
    });
  }

  // PDF: a pickup sheet you can print and check off at the table.
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.118, 0.302, 0.169);
  const ink = rgb(0.17, 0.17, 0.15);
  const muted = rgb(0.42, 0.42, 0.37);
  const line = rgb(0.85, 0.82, 0.76);
  const W = 612, H = 792, M = 48;
  let page = pdf.addPage([W, H]);
  let y = H - M;

  const text = (t: string, x: number, size = 10, f = font, color = ink) => page.drawText(t, { x, y, size, font: f, color });
  const newPage = () => {
    page = pdf.addPage([W, H]);
    y = H - M;
    header(true);
  };
  const header = (cont = false) => {
    text(drop.title + (cont ? " (continued)" : ""), M, 20, bold, green);
    y -= 18;
    text(`${shop?.name ?? ""}  ·  ${money(drop.price_cents)} each  ·  ${when}`, M, 10, font, muted);
    y -= 14;
    text(`${drop.claimed} of ${drop.quantity} claimed  ·  ${rows.length} reservation${rows.length === 1 ? "" : "s"}  ·  ${rows.reduce((n, c) => n + c.quantity, 0)} items`, M, 10, font, muted);
    y -= 22;
    // column headers
    text("Done", M, 9, bold, muted);
    text("#", M + 36, 9, bold, muted);
    text("Name", M + 56, 9, bold, muted);
    text("Phone", M + 216, 9, bold, muted);
    text("Qty", M + 316, 9, bold, muted);
    text("Total", M + 350, 9, bold, muted);
    text("Payment", M + 404, 9, bold, muted);
    y -= 6;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: line });
    y -= 14;
  };
  header();

  rows.forEach((c, i) => {
    const rowH = c.delivery === "shipping" && c.ship_address ? 30 : 20;
    if (y - rowH < M + 30) newPage();
    page.drawRectangle({ x: M + 2, y: y - 3, width: 11, height: 11, borderColor: ink, borderWidth: 0.9 });
    if (c.picked_up) text("X", M + 4.5, 9, bold, green);
    if (c.picked_up_at) {
      const t = new Date(c.picked_up_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      page.drawText(t, { x: W - M - 40, y: y + 1, size: 7, font, color: muted });
    }
    text(String(i + 1), M + 36, 10);
    text(c.buyer_name.slice(0, 28), M + 56, 10, bold);
    text(formatPhone(c.buyer_phone), M + 216, 10);
    text(String(c.quantity), M + 316, 10);
    text(money(drop.price_cents * c.quantity), M + 350, 10);
    text(payLabel(c), M + 404, 9, font, muted);
    if (c.delivery === "shipping" && c.ship_address) {
      y -= 11;
      text(`Ship to: ${c.ship_address.slice(0, 70)}`, M + 56, 8, font, muted);
    }
    y -= rowH - 8;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.4, color: line });
    y -= 12;
  });

  if (rows.length === 0) {
    text("No reservations yet.", M, 11, font, muted);
  }
  page.drawText(`Printed ${new Date().toLocaleDateString("en-US")}  ·  groveline.io`, { x: M, y: M - 18, size: 8, font, color: muted });

  const bytes = await pdf.save();
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${safeName}-pickup-sheet.pdf"` },
  });
}
