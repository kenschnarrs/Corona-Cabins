// Real cabin and property photos, supplied by Ken on 2026-11-25 and cropped
// into a consistent 3:2 set under public/photos. These are the fallback
// photos shown until a cabin has uploaded photos in the database: once a
// cabin has a Primary image in the database, the database image wins.
//
// Cabin mapping, best read from the photos and the listings' floor/room
// counts: the wide single-story is Mediana (2BR, one floor), the compact
// two-story with the balcony is Pequeña (1BR, two floors), the big two-story
// is Grande (3BR, two floors), and the event pavilion is the Palapa.

// Same shape as Lang in ./i18n, kept local so the pure-logic test compile
// (scripts/check-features.mjs) doesn't pull in the .tsx i18n module.
export type Lang = "es" | "en";

export type SitePhoto = {
  url: string;
  alt: Record<Lang, string>;
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
        es: "Cabaña Grande de noche junto a la palapa",
        en: "Cabaña Grande at night next to the palapa",
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
        es: "Fachada y porche de Cabaña Mediana durante el día",
        en: "Cabaña Mediana front porch during the day",
      },
    },
    {
      url: "/photos/cabana-mediana-2.jpg",
      alt: {
        es: "Porche de Cabaña Mediana",
        en: "Cabaña Mediana porch",
      },
    },
    {
      url: "/photos/cabana-mediana-3.jpg",
      alt: {
        es: "Cabaña Mediana de noche con series de luces",
        en: "Cabaña Mediana at night with string lights",
      },
    },
  ],
  "Cabaña Pequeña": [
    {
      url: "/photos/cabana-pequena-1.jpg",
      alt: {
        es: "Cabaña Pequeña al anochecer con luces cálidas",
        en: "Cabaña Pequeña at dusk with warm lights",
      },
    },
    {
      url: "/photos/cabana-pequena-2.jpg",
      alt: {
        es: "Cabaña Pequeña de noche junto a la fogata",
        en: "Cabaña Pequeña at night by the fire pit",
      },
    },
    {
      url: "/photos/cabana-pequena-3.jpg",
      alt: {
        es: "Cabaña Pequeña iluminada de noche",
        en: "Cabaña Pequeña lit up at night",
      },
    },
  ],
  Palapa: [
    {
      url: "/photos/palapa-1.jpg",
      alt: {
        es: "La palapa, área de eventos con series de luces y bancas",
        en: "The palapa event area with string lights and bench seating",
      },
    },
    {
      url: "/photos/palapa-2.jpg",
      alt: {
        es: "Asadores junto a la palapa",
        en: "Grill station by the palapa",
      },
    },
    {
      url: "/photos/palapa-3.jpg",
      alt: {
        es: "Fogata con bancas para convivir",
        en: "Fire pit with bench seating",
      },
    },
  ],
};

/** Social preview cards (1200x630) per cabin. */
export const CABIN_OG_PHOTOS: Record<string, string> = {
  "Cabaña Grande": "/photos/og-cabana-grande.jpg",
  "Cabaña Mediana": "/photos/og-cabana-mediana.jpg",
  "Cabaña Pequeña": "/photos/og-cabana-pequena.jpg",
  Palapa: "/photos/og-palapa.jpg",
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
    isPlaceholder: false,
  };
}
