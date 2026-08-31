/* Turns a street address into coordinates using OpenStreetMap's Nominatim,
   which is free and needs no API key. Their usage policy asks for a
   descriptive User-Agent and light traffic, which a local marketplace is. */
export async function geocode(parts: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): Promise<{ lat: number; lng: number } | null> {
  const q = [parts.address, parts.city, parts.state, parts.zip].filter(Boolean).join(", ");
  if (!parts.address || !parts.city) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`,
      { headers: { "User-Agent": "Groveline (hello@groveline.io)" } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export function fullAddress(d: {
  pickup_address?: string | null;
  pickup_city?: string | null;
  pickup_state?: string | null;
  pickup_zip?: string | null;
}) {
  return [d.pickup_address, d.pickup_city, d.pickup_state, d.pickup_zip].filter(Boolean).join(", ");
}
