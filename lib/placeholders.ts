// Real cabin photos, supplied by Ken on 2026-11-25 and cropped into a
// consistent 3:2 set under public/photos. These are the fallback photos
// shown until a cabin has uploaded photos in the database: once a cabin has
// a Primary image in the database, the database image wins.
//
// Cabin mapping confirmed by Ken: the wide single-story is Pequeña, the
// compact two-story with the balcony is Mediana, and the big two-story is
// Grande. None of the photos show the palapa, so its gallery stays on a
// labeled temporary placeholder until Ken sends a real palapa shot.

// Same shape as Lang in ./i18n, kept local so the pure-logic test compile
// (scripts/check-features.mjs) doesn't pull in the .tsx i18n module.
export type Lang = "es" | "en";

export type SitePhoto = {
  url: string;
  alt: Record<Lang, string>;
  // Labeled "Foto temporal / Temporary photo" in the UI.
  temporary?: boolean;
};

export const HERO_PHOTO: SitePhoto = {
  url: "/photos/hero.jpg",
  alt: {
    es: "Las cabañas de noche con series de luces",
    en: "The cabins at night with string lights",
  },
};

/** Social preview card (1200x630) for the home page. */
export const HOME_OG_PHOTO = "/photos/og-home.jpg";

// Keyed by the cabin's Spanish database name, matching the approved mockup.
// First photo is the cabin's card/share photo; the rest fill its gallery.
export const CABIN_PHOTOS: Record<string, SitePhoto[]> = {
  "Cabaña Grande": [
    {
      url: "/photos/cabana-grande-1.jpg",
      alt: {
        es: "Cabaña Grande iluminada con series de luces de noche",
        en: "Cabaña Grande lit up with string lights at night",
      },
    },
    {
      url: "/photos/cabana-grande-2.jpg",
      alt: {
        es: "Cabaña Grande y su área exterior de noche",
        en: "Cabaña Grande and its outdoor area at night",
      },
    },
    {
      url: "/photos/cabana-grande-3.jpg",
      alt: {
        es: "Vista nocturna de Cabaña Grande",
        en: "Cabaña Grande at night",
      },
    },
  ],
  "Cabaña Mediana": [
    {
      url: "/photos/cabana-mediana-1.jpg",
      alt: {
        es: "Cabaña Mediana al anochecer con luces cálidas",
        en: "Cabaña Mediana at dusk with warm lights",
      },
    },
    {
      url: "/photos/cabana-mediana-2.jpg",
      alt: {
        es: "Cabaña Mediana de noche junto al asador",
        en: "Cabaña Mediana at night by the grill station",
      },
    },
    {
      url: "/photos/cabana-mediana-3.jpg",
      alt: {
        es: "Cabaña Mediana iluminada de noche",
        en: "Cabaña Mediana lit up at night",
      },
    },
  ],
  "Cabaña Pequeña": [
    {
      url: "/photos/cabana-pequena-1.jpg",
      alt: {
        es: "Fachada y porche de Cabaña Pequeña durante el día",
        en: "Cabaña Pequeña front porch during the day",
      },
    },
    {
      url: "/photos/cabana-pequena-2.jpg",
      alt: {
        es: "Porche de Cabaña Pequeña",
        en: "Cabaña Pequeña porch",
      },
    },
    {
      url: "/photos/cabana-pequena-3.jpg",
      alt: {
        es: "Cabaña Pequeña al anochecer con series de luces",
        en: "Cabaña Pequeña at dusk with string lights",
      },
    },
  ],
  // Ken has not sent a palapa photo yet; keep the labeled temporary
  // placeholders until he does.
  Palapa: [
    {
      url: "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1600&q=85",
      alt: {
        es: "Foto temporal de una cabaña en el bosque",
        en: "Temporary placeholder photo of a cabin in the woods",
      },
      temporary: true,
    },
    {
      url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85",
      alt: {
        es: "Foto temporal de un paisaje de montaña",
        en: "Temporary placeholder photo of a mountain landscape",
      },
      temporary: true,
    },
    {
      url: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1600&q=85",
      alt: {
        es: "Foto temporal de un lago entre montañas",
        en: "Temporary placeholder photo of a lake and mountains",
      },
      temporary: true,
    },
  ],
};

/** Social preview cards (1200x630) per cabin. Cabins without a card use the home card. */
export const CABIN_OG_PHOTOS: Record<string, string> = {
  "Cabaña Grande": "/photos/og-cabana-grande.jpg",
  "Cabaña Mediana": "/photos/og-cabana-mediana.jpg",
  "Cabaña Pequeña": "/photos/og-cabana-pequena.jpg",
};

/** A cabin's own photos, or the property panorama for an unknown name. */
export function cabinPhotos(cabinName: string): SitePhoto[] {
  return CABIN_PHOTOS[cabinName] ?? [HERO_PHOTO];
}

export function cabinPhoto(
  cabinName: string,
  primaryImageUrl?: string | null
): { url: string; ogUrl: string; alt: Record<Lang, string>; isPlaceholder: boolean } {
  if (primaryImageUrl) {
    return {
      url: primaryImageUrl,
      ogUrl: primaryImageUrl,
      alt: { es: cabinName, en: cabinName },
      isPlaceholder: false,
    };
  }
  const photo = cabinPhotos(cabinName)[0];
  return {
    url: photo.url,
    ogUrl: CABIN_OG_PHOTOS[cabinName] ?? HOME_OG_PHOTO,
    alt: photo.alt,
    isPlaceholder: photo.temporary ?? false,
  };
}
