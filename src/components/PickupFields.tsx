"use client";
import { STATES } from "@/lib/states";

export type Pickup = {
  place: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  date: string;
  start: string;
  end: string;
};

/* Shared between create and edit. Place name plus a real address so the
   drop page can show a map and a directions button. */
export default function PickupFields({
  value,
  onChange,
  prefix = "p",
  minDate,
}: {
  value: Pickup;
  onChange: (v: Pickup) => void;
  prefix?: string;
  minDate?: string;
}) {
  const set = (k: keyof Pickup) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value });
  return (
    <div className="flex flex-col gap-5">
      <div>
        <label htmlFor={`${prefix}-place`} className="field-label">
          Pickup place
        </label>
        <input id={`${prefix}-place`} className="field" value={value.place} onChange={set("place")} placeholder="Piedmont Farmers Market, or My driveway" />
        <p className="field-hint">The name buyers will recognize.</p>
      </div>
      <div>
        <label htmlFor={`${prefix}-address`} className="field-label">
          Street address <span className="font-normal text-muted">(optional, shows a map)</span>
        </label>
        <input id={`${prefix}-address`} className="field" value={value.address} onChange={set("address")} placeholder="123 Main St" autoComplete="street-address" />
      </div>
      <div className="grid grid-cols-6 gap-3">
        <div className="col-span-3">
          <label htmlFor={`${prefix}-city`} className="field-label">
            City
          </label>
          <input id={`${prefix}-city`} className="field" value={value.city} onChange={set("city")} placeholder="Piedmont" autoComplete="address-level2" />
        </div>
        <div className="col-span-2">
          <label htmlFor={`${prefix}-state`} className="field-label">
            State
          </label>
          <select id={`${prefix}-state`} className="field" value={value.state} onChange={set("state")}>
            {STATES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-1">
          <label htmlFor={`${prefix}-zip`} className="field-label">
            Zip
          </label>
          <input id={`${prefix}-zip`} className="field !px-2" value={value.zip} onChange={set("zip")} inputMode="numeric" autoComplete="postal-code" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor={`${prefix}-date`} className="field-label">
            Date
          </label>
          <input id={`${prefix}-date`} type="date" className="field" value={value.date} min={minDate} onChange={set("date")} />
        </div>
        <div>
          <label htmlFor={`${prefix}-start`} className="field-label">
            From
          </label>
          <input id={`${prefix}-start`} type="time" className="field" value={value.start} onChange={set("start")} />
        </div>
        <div>
          <label htmlFor={`${prefix}-end`} className="field-label">
            Until
          </label>
          <input id={`${prefix}-end`} type="time" className="field" value={value.end} onChange={set("end")} />
        </div>
      </div>
    </div>
  );
}
