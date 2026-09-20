import prisma from "./prisma";
import { PictureType } from "@prisma/client";
import type { CabinProps } from "./types";
import { plural, type Dictionary } from "./i18n";

/**
 * All cabins with their primary image, ordered largest (and priciest) first,
 * matching the approved mockup order: Grande, Mediana, Pequeña.
 */
export async function getCabins(): Promise<CabinProps[]> {
  const cabins = await prisma.cabin.findMany({
    include: {
      images: {
        orderBy: { sort_order: "asc" },
      },
    },
    orderBy: { price_per_night: "desc" },
  });
  // Prisma Decimal and Date objects are not serializable for page props.
  return JSON.parse(JSON.stringify(cabins));
}

export function formatPrice(price: number): string {
  return `$${Number(price).toLocaleString("es-MX")}`;
}

/** Amenity chips for a cabin card, built from live database fields. */
export function amenityChips(cabin: CabinProps, t: Dictionary): string[] {
  const chips: string[] = [
    `${cabin.num_bedrooms} ${plural(t, "bedroom", cabin.num_bedrooms)}`,
    `${cabin.num_beds} ${plural(t, "bed", cabin.num_beds)}`,
    `${cabin.num_bathrooms} ${plural(t, "bathroom", cabin.num_bathrooms)}`,
  ];
  if (cabin.has_kitchen) chips.push(t.amenities.kitchen);
  if (cabin.has_wood_stove) chips.push(t.amenities.woodStove);
  if (cabin.has_terrace) chips.push(t.amenities.terrace);
  return chips;
}
