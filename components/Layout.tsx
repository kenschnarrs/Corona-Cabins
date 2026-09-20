import React, { ReactNode } from "react";
import Link from "next/link";
import Logo from "./Logo";
import LanguageToggle from "./LanguageToggle";
import SiteFooter from "./SiteFooter";
import { useLanguage } from "../lib/i18n";

type Props = {
  children: ReactNode;
  /**
   * overlay: nav floats over a full-bleed hero (home page renders its own
   * hero; Layout renders nothing above children). solid: a simple top bar
   * for interior pages (cabin detail, admin).
   */
  header?: "none" | "solid";
};

const Layout: React.FC<Props> = ({ children, header = "solid" }) => {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#cabins"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-terra focus:px-4 focus:py-2 focus:text-white"
      >
        {t.nav.skip}
      </a>
      {header === "solid" && (
        <header className="bg-nightdeep text-nighttext">
          <nav
            aria-label={t.nav.home}
            className="flex items-center justify-between px-5 py-4 sm:px-[clamp(24px,6vw,80px)]"
          >
            <Link href="/" aria-label={t.nav.home}>
              <Logo />
            </Link>
            <LanguageToggle />
          </nav>
        </header>
      )}
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
};

export default Layout;
