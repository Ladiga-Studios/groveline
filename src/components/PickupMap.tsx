/* Map of the pickup spot using OpenStreetMap's free embed, plus a
   directions button that opens the buyer's maps app. No API keys. */
export default function PickupMap({
  lat,
  lng,
  address,
  place,
}: {
  lat: number | null;
  lng: number | null;
  address: string;
  place: string;
}) {
  const directions = address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
    : null;
  return (
    <div className="tag-card overflow-hidden">
      {lat && lng ? (
        <iframe
          title={`Map of ${place}`}
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.012},${lat - 0.008},${lng + 0.012},${lat + 0.008}&layer=mapnik&marker=${lat},${lng}`}
          className="block h-56 w-full border-0"
          loading="lazy"
        />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="font-semibold">{place}</p>
          {address && <p className="text-sm text-muted">{address}</p>}
        </div>
        {directions && (
          <a href={directions} target="_blank" rel="noopener" className="btn btn-grove !min-h-11">
            Get directions
          </a>
        )}
      </div>
    </div>
  );
}
