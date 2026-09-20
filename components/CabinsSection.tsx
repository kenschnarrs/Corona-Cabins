import React from "react";
import type { CabinProps } from "../lib/types";
import CabinCard from "./CabinCard";
import { useLanguage } from "../lib/i18n";

const CabinsSection: React.FC<{ cabins: CabinProps[] }> = ({ cabins }) => {
  const { t } = useLanguage();
  return (
    <section id="cabins" className="px-5 pb-[120px] pt-[100px] sm:px-[clamp(20px,5vw,72px)]">
      <div className="mb-[52px] text-center">
        <p className="m-0 mb-4 font-sans text-xs font-bold uppercase tracking-[0.24em] text-eyebrow">
          {t.cabins.eyebrow}
        </p>
        <h2 className="m-0 text-[clamp(42px,6vw,76px)] font-medium leading-none tracking-[-0.045em]">
          {t.cabins.heading}
        </h2>
      </div>
      <div className="mx-auto grid max-w-cardcol grid-cols-1 gap-6 md:max-w-grid md:grid-cols-3">
        {cabins.map((cabin, i) => (
          <CabinCard key={cabin.id} cabin={cabin} index={i} />
        ))}
      </div>
    </section>
  );
};

export default CabinsSection;
