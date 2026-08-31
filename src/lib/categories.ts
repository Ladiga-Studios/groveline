export const CATEGORIES = [
  { value: "baked", label: "Baked goods" },
  { value: "produce", label: "Produce & eggs" },
  { value: "meat", label: "Meat & shares" },
  { value: "plants", label: "Plants & flowers" },
  { value: "crafts", label: "Handmade goods" },
  { value: "plates", label: "Plate sales" },
  { value: "other", label: "Other" },
] as const;

export function categoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? "Other";
}
