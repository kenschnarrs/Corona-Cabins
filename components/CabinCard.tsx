import React from "react";
import Link from "next/link";
import type { CabinProps } from "../lib/types";
import { amenityChips, formatPrice } from "../lib/cabins";
import { cabinPhoto } from "../lib/placeholders";
import { cabinCopy, useLanguage } from "../lib/i18n";

type Props = {
  cabin: CabinProps;
  index: number;
};

const CabinCard: React.FC<Props> = ({ cabin, index }) => {
  const { t, lang } = useLanguage();
  const copy = cabinCopy(t, cabin.name);
  const primary = cabin.images.find((img) => img.type === "Primary");
  const photo = cabinPhoto(cabin.name, primary?.url ?? null);
  const chips = amenityChips(cabin, t);

  return (
    <article className="border border-cardborder bg-card shadow-[0_18px_50px_rgba(73,39,19,.08)]">
      <div
        className="card-photo relative h-[290px] bg-cover bg-center sm:h-[400px] md:h-[320px]"
        style={{ backgroundImage: `url('${photo.url}')` }}
        role="img"
        aria-label={photo.alt}
      >
        <span className="absolute left-[18px] top-[18px] z-[1] font-sans text-xs font-bold tracking-[0.18em] text-white">
          {String(index + 1).padStart(2, "0")}
        </span>
        {copy && (
          <span className="absolute bottom-[18px] left-[18px] z-[1] bg-tag px-[11px] py-2 font-sans text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink">
            {copy.tag}
          </span>
        )}
        {photo.isPlaceholder && (
          <span className="absolute right-[10px] top-[10px] z-[1] bg-[rgba(36,18,9,.65)] px-2 py-[6px] font-sans text-[10px] text-white">
            {t.cabins.tempPhoto}
          </span>
        )}
      </div>
      <div className="p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:justify-between">
          <h3 className="m-0 text-3xl font-medium">
            <Link href={`/p/${cabin.id}`} className="hover:underline">
              {copy?.name ?? cabin.name}
            </Link>
          </h3>
          <p className="m-0 font-sans text-[11px] uppercase text-pricemuted sm:text-right">
            <strong className="block text-xl text-terradeep">
              {formatPrice(cabin.price_per_night)}
            </strong>
            {t.cabins.perNight}
          </p>
        </div>
        <div className="rich-text-display min-h-[54px] leading-normal text-muted" dangerouslySetInnerHTML={{ __html: lang === "es" ? cabin.description_es : cabin.description_en }} />
        <div className="flex flex-wrap gap-2 py-[18px]">
          {chips.map((chip) => (
            <span key={chip} className="bg-chip px-[9px] py-[7px] font-sans text-[11px]">
              {chip}
            </span>
          ))}
        </div>
        {copy && (
          <details className="cabin-details border-t border-[rgba(75,43,24,.14)] pt-[14px]">
            <summary className="flex cursor-pointer list-none justify-between font-sans text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#843619]">
              <span>{t.cabins.viewDetails}</span>
              <span aria-hidden="true">＋</span>
            </summary>
            <div className="px-0 pb-1 pt-4 leading-relaxed text-muted">
              <p>{copy.details}</p>
              <p>
                <Link href={`/p/${cabin.id}`} className="underline">
                  {t.cabins.viewPage}
                </Link>
              </p>
            </div>
          </details>
        )}
      </div>
    </article>
  );
};

export default CabinCard;
