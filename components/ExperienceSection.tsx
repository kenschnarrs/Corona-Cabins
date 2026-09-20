import React from "react";
import { useLanguage } from "../lib/i18n";

const FACEBOOK_URL = "https://www.facebook.com/share/1bBgudVB1G/?mibextid=wwXIfr";

const ExperienceSection: React.FC = () => {
  const { t } = useLanguage();
  return (
    <section className="grid min-h-[600px] grid-cols-1 bg-night text-nighttext md:grid-cols-[1.1fr_.9fr]">
      <div className="experience-art relative min-h-[500px] overflow-hidden">
        <div className="experience-moon" aria-hidden="true">
          ☾
        </div>
        <div className="experience-mountains" aria-hidden="true" />
      </div>
      <div className="flex flex-col justify-center p-[clamp(50px,8vw,110px)]">
        <p className="m-0 mb-[18px] font-sans text-xs font-bold uppercase tracking-[0.24em]">
          {t.experience.eyebrow}
        </p>
        <h2 className="m-0 text-[clamp(42px,6vw,76px)] font-medium leading-none tracking-[-0.045em]">
          {t.experience.heading}
        </h2>
        <p className="text-[19px] leading-[1.65] text-nightmuted">
          {t.experience.body}
        </p>
        <div className="my-[22px] mb-[34px] flex gap-[22px] font-sans text-[11px] font-bold uppercase tracking-[0.1em]">
          <span>{t.experience.checkin}</span>
          <span>{t.experience.checkout}</span>
        </div>
        <a
          href={FACEBOOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit bg-terra px-[22px] py-[15px] font-sans text-xs font-extrabold uppercase tracking-[0.13em] text-white"
        >
          {t.experience.cta}
        </a>
      </div>
    </section>
  );
};

export default ExperienceSection;
