
export const CATEGORY_ICONS = [
  "folder",
  "shopping-bag",
  "shirt",
  "smartphone",
  "laptop",
  "monitor",
  "headphones",
  "watch",
  "camera",
  "gamepad-2",
  "book-open",
  "coffee",
  "utensils",
  "armchair",
  "lamp",
  "car",
  "bike",
  "baby",
  "heart",
  "paw-print",
] as const;

export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export function isCategoryIcon(
  value: string,
): value is CategoryIcon {
  return CATEGORY_ICONS.some((icon) => icon === value);
}
