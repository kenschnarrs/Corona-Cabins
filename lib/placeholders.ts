// Temporary placeholder photos for the Phase 1 launch.
// Every placeholder is visibly labeled "Foto temporal / Temporary photo" in
// the UI. Ken will supply real cabin and property photos later (Phase 2);
// once a cabin has a Primary image in the database, the database image wins
// and the placeholder is no longer shown.

export type PlaceholderPhoto = {
  url: string;
  alt: string;
};

export const HERO_PLACEHOLDER: PlaceholderPhoto = {
  url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2200&q=90",
  alt: "Mountain landscape standing in as a temporary hero photo",
};

// Keyed by the cabin's Spanish database name, matching the approved mockup.
export const CABIN_PLACEHOLDERS: Record<string, PlaceholderPhoto> = {
  "Cabaña Grande": {
    url: "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1600&q=85",
    alt: "Temporary placeholder photo of a cabin in the woods",
  },
  "Cabaña Mediana": {
    url: "https://images.unsplash.com/photo-1520984032042-162d526883e0?auto=format&fit=crop&w=1600&q=85",
    alt: "Temporary placeholder photo of a cabin interior",
  },
  "Cabaña Pequeña": {
    url: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1600&q=85",
    alt: "Temporary placeholder photo of a lake and mountains",
  },
};

export function cabinPhoto(
  cabinName: string,
  primaryImageUrl?: string | null
): { url: string; alt: string; isPlaceholder: boolean } {
  if (primaryImageUrl) {
    return { url: primaryImageUrl, alt: cabinName, isPlaceholder: false };
  }
  const placeholder = CABIN_PLACEHOLDERS[cabinName] ?? HERO_PLACEHOLDER;
  return { ...placeholder, isPlaceholder: true };
}
