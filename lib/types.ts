/*export type CabinInquiryProps {

}

export type CabinReservationProps {

}

export type ReservationProps {

}

export type InquiryProps {

}*/

export type CabinProps = {
  id: string;
  name: string;
  num_bathrooms: number;
  num_bedrooms: number;
  num_beds: number,
  num_floors: number,
  square_feet: number,
  price_per_night: number,
  description: string,
  //inquiries: CabinInquiryProps[],
  //reservations: CabinReservationProps[],
  images: CabinImageProps[]
};

export type CabinImageProps = {
  id: string;
  url: string;
  type: PictureType;
  cabinId: string;
}

export enum PictureType {
    Primary,
    LivingRoom,
    Bedroom,
    Kitchen,
    Bathroom,
    DiningRoom,
    Balcony,
    Outside,
    Other
}