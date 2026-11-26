import type { CabinImageProps } from "./types";
import { cabinPhotos } from "./placeholders";
import type { Lang } from "./placeholders";

export type GalleryPhoto = { url: string; alt: Record<Lang, string>; isPlaceholder: boolean };

export const MIN_GALLERY_PHOTOS = 3;

/**
 * Photos for a cabin's gallery: the real uploaded photos in the admin's order
 * with the Primary photo first. Until a cabin has enough uploaded photos, the
 * gallery is filled out from the cabin's own photo set (the real photos Ken
 * supplied, kept in public/photos) so it never looks empty. Uploading photos
 * in the cabin editor replaces them with no code change.
 */
export function galleryPhotos(cabinName: string, images: CabinImageProps[]): GalleryPhoto[] {
  const real = [...images]
    .sort((a, b) => (a.type === "Primary" ? -1 : 0) - (b.type === "Primary" ? -1 : 0) || a.sort_order - b.sort_order)
    .map((image, index): GalleryPhoto => ({
      url: image.url,
      alt: { es: `${cabinName} ${index + 1}`, en: `${cabinName} ${index + 1}` },
      isPlaceholder: false,
    }));
  if (real.length >= MIN_GALLERY_PHOTOS) return real;
  const seen = new Set(real.map((photo) => photo.url));
  const out = [...real];
  for (const photo of cabinPhotos(cabinName)) {
    if (out.length >= MIN_GALLERY_PHOTOS) break;
    if (!seen.has(photo.url)) { seen.add(photo.url); out.push({ ...photo, isPlaceholder: false }); }
  }
  return out;
}
