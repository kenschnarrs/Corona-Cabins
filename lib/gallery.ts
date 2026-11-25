import type { CabinImageProps } from "./types";
import { CABIN_PLACEHOLDERS, cabinPhoto } from "./placeholders";

export type GalleryPhoto = { url: string; alt: string; isPlaceholder: boolean };

export const MIN_GALLERY_PHOTOS = 3;

/**
 * Photos for a cabin's gallery: the real uploaded photos in the admin's order
 * with the Primary photo first. Until a cabin has enough real photos, the
 * gallery is filled out with the labeled temporary placeholders so it never
 * looks empty. Uploading photos in the cabin editor replaces them with no
 * code change.
 */
export function galleryPhotos(cabinName: string, images: CabinImageProps[]): GalleryPhoto[] {
  const real = [...images]
    .sort((a, b) => (a.type === "Primary" ? -1 : 0) - (b.type === "Primary" ? -1 : 0) || a.sort_order - b.sort_order)
    .map((image, index): GalleryPhoto => ({ url: image.url, alt: `${cabinName} ${index + 1}`, isPlaceholder: false }));
  if (real.length >= MIN_GALLERY_PHOTOS) return real;
  const own = cabinPhoto(cabinName, null);
  const fillers = [own, ...Object.entries(CABIN_PLACEHOLDERS).filter(([name]) => name !== cabinName).map(([, photo]) => ({ ...photo, isPlaceholder: true }))];
  const seen = new Set(real.map((photo) => photo.url));
  const out = [...real];
  for (const filler of fillers) {
    if (out.length >= MIN_GALLERY_PHOTOS) break;
    if (!seen.has(filler.url)) { seen.add(filler.url); out.push(filler); }
  }
  return out;
}
