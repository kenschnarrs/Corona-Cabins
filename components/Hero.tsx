import React from "react";
import Logo from "./Logo";
import LanguageToggle from "./LanguageToggle";
import { HERO_PLACEHOLDER } from "../lib/placeholders";
import { useLanguage } from "../lib/i18n";

const Hero: React.FC = () => {
  const { t } = useLanguage();
  return (
    <section
      className="hero-bg relative min-h-[820px] overflow-hidden text-[#fff7e8] sm:min-h-[92vh]"
      style={{
        ["--hero-url" as string]: `url("${HERO_PLACEHOLDER.url}")`,
      }}
    >
      <div className="hero-shade absolute inset-0" />
      <nav
        aria-label={t.nav.home}
        className="relative z-[2] flex items-center justify-between px-5 py-6 sm:px-[clamp(20px,6vw,80px)]"
      >
        <Logo />
        <LanguageToggle />
      </nav>
      <div className="relative z-[2] max-w-[960px] px-[22px] pb-[140px] pt-[110px] sm:px-[clamp(24px,8vw,125px)] sm:pb-[150px] sm:pt-[100px]">
        <p className="m-0 mb-[18px] font-sans text-xs font-bold uppercase tracking-[0.24em]">
          {t.hero.eyebrow}
        </p>
        <h1 className="m-0 text-[clamp(62px,10vw,138px)] font-medium leading-[0.84] tracking-[-0.06em] [text-shadow:0_4px_30px_rgba(26,11,4,.35)]">
          {t.hero.title}
        </h1>
        <p className="mb-[34px] mt-[30px] max-w-[620px] text-[clamp(20px,2.2vw,30px)] leading-[1.38]">
          {t.hero.subtitle}
        </p>
        <a
          href="#cabins"
          className="inline-flex bg-terra px-[22px] py-[15px] font-sans text-xs font-extrabold uppercase tracking-[0.13em] text-white"
        >
          {t.hero.cta}
        </a>
      </div>
      <div className="absolute inset-x-0 bottom-0 z-[2] flex min-h-[72px] items-center gap-[14px] border-t border-white/30 px-6 py-[18px] font-sans text-[11px] sm:px-[clamp(24px,6vw,88px)] sm:text-[13px]">
        <span aria-hidden="true" className="text-[26px]">
          ☼
        </span>
        <span className="flex-1">{t.hero.location}</span>
        <span className="whitespace-nowrap font-sans text-[10px] opacity-80">
          {t.hero.tempPhoto}
        </span>
      </div>
    </section>
  );
};

export default Hero;
