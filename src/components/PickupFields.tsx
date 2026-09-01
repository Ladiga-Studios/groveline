"use client";
import { STATES } from "@/lib/states";

export type Pickup = {
  fulfillment: "pickup" | "shipping" | "both";
  shipping: string;
  place: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  date: string;
  start: string;
  end: string;
};

/* Shared between create and edit. Pickup, shipping, or both. */
export default function PickupFields({
  value,
  onChange,
  prefix = "p",
  minDate,
  canShip,
}: {
  value: Pickup;
  onChange: (v: Pickup) => void;
  prefix?: string;
  minDate?: string;
  canShip: boolean;
}) {
  const set = (k: keyof Pickup) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value });
  const shipping = value.fulfillment !== "pickup";
  const pickup = value.fulfillment !== "shipping";

  return (
    <div className="flex flex-col gap-5">
      <fieldset>
        <legend className="field-label">How do folks get this from you</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {([["pickup", "Pickup only"], ["both", "Pickup or shipping"], ["shipping", "Shipping only"]] as const).map(([v, l]) => (
            <label key={v} className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 p-3 ${value.fulfillment === v ? "border-leaf bg-cream" : "border-cream-dark bg-white"} ${v !== "pickup" && !canShip ? "opacity-50" : ""}`}>
              <input type="radio" name={`${prefix}-fulfillment`} value={v} checked={value.fulfillment === v} onChange={() => onChange({ ...value, fulfillment: v })} disabled={v !== "pickup" && !canShip} className="accent-[#1e4d2b]" />
              <span className="text-sm font-medium">{l}</span>
            </label>
          ))}
        </div>
        {!canShip && (
          <p className="field-hint">Shipping needs card payments turned on first. Do that in Settings and this unlocks.</p>
        )}
      </fieldset>

      {shipping && (
        <div>
          <label htmlFor={`${prefix}-shipping`} className="field-label">Shipping charge <span className="font-normal text-muted">(flat, per order)</span></label>
          <div className="relative sm:w-48">
            <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted">$</span>
            <input id={`${prefix}-shipping`} type="number" inputMode="decimal" min="0" step="0.01" className="field pl-8" value={value.shipping} onChange={set("shipping")} placeholder="8" />
          </div>
          <p className="field-hint">Buyers pay by card, and it charges once you mark the order shipped.</p>
        </div>
      )}

      {pickup && (
        <>
          <div>
            <label htmlFor={`${prefix}-place`} className="field-label">Where should people meet you</label>
            <input id={`${prefix}-place`} className="field" value={value.place} onChange={set("place")} placeholder="Piedmont Farmers Market, or My driveway" />
            <p className="field-hint">Whatever your buyers would recognize right away.</p>
          </div>
          <div>
            <label htmlFor={`${prefix}-address`} className="field-label">Street address <span className="font-normal text-muted">(optional, we'll drop a map in)</span></label>
            <input id={`${prefix}-address`} className="field" value={value.address} onChange={set("address")} placeholder="123 Main St" autoComplete="street-address" />
          </div>
        </>
      )}

      <div className="grid grid-cols-6 gap-3">
        <div className="col-span-3">
          <label htmlFor={`${prefix}-city`} className="field-label">{pickup ? "City" : "Shipping from"}</label>
          <input id={`${prefix}-city`} className="field" value={value.city} onChange={set("city")} placeholder="Piedmont" autoComplete="address-level2" />
        </div>
        <div className="col-span-2">
          <label htmlFor={`${prefix}-state`} className="field-label">State</label>
          <select id={`${prefix}-state`} className="field" value={value.state} onChange={set("state")}>
            {STATES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </div>
        <div className="col-span-1">
          <label htmlFor={`${prefix}-zip`} className="field-label">Zip</label>
          <input id={`${prefix}-zip`} className="field !px-2" value={value.zip} onChange={set("zip")} inputMode="numeric" autoComplete="postal-code" />
        </div>
      </div>

      {pickup ? (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor={`${prefix}-date`} className="field-label">What date</label>
            <input id={`${prefix}-date`} type="date" className="field" value={value.date} min={minDate} onChange={set("date")} />
          </div>
          <div>
            <label htmlFor={`${prefix}-start`} className="field-label">From</label>
            <input id={`${prefix}-start`} type="time" className="field" value={value.start} onChange={set("start")} />
          </div>
          <div>
            <label htmlFor={`${prefix}-end`} className="field-label">Until</label>
            <input id={`${prefix}-end`} type="time" className="field" value={value.end} onChange={set("end")} />
          </div>
        </div>
      ) : (
        <div className="sm:w-56">
          <label htmlFor={`${prefix}-date`} className="field-label">Last day to get an order in</label>
          <input id={`${prefix}-date`} type="date" className="field" value={value.date} min={minDate} onChange={set("date")} />
          <p className="field-hint">The drop closes itself once this day passes.</p>
        </div>
      )}
    </div>
  );
}
