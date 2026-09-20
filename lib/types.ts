export type CabinProps = {
  id: string;
  name: string;
  num_bathrooms: number;
  num_bedrooms: number;
  num_beds: number;
  num_floors: number;
  square_feet: number;
  price_per_night: number;
  description: string;
  has_kitchen: boolean;
  has_wood_stove: boolean;
  has_terrace: boolean;
  images: CabinImageProps[];
};

export type CabinImageProps = {
  id: string;
  url: string;
  type: string;
  cabinId: string;
};
