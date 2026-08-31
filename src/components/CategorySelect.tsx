import { CATEGORY_GROUPS } from "@/lib/categories";

export default function CategorySelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="" disabled>
        Pick one
      </option>
      {CATEGORY_GROUPS.map((grp) => (
        <optgroup key={grp.id} label={grp.label}>
          {grp.items.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
