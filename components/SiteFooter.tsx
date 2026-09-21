import React from "react";
import Link from "next/link";
import Logo from "./Logo";
import { useLanguage } from "../lib/i18n";

const SiteFooter: React.FC = () => {
  const { t } = useLanguage();
  return (
    <footer className="grid grid-cols-[auto_1fr] items-center gap-[18px] bg-nightdeep px-6 py-8 font-sans text-footertext sm:grid-cols-[auto_1fr_auto] sm:px-[clamp(24px,6vw,88px)]">
      <Logo />
      <div>
        <strong>{t.footer.name}</strong>
        <p>{t.footer.location}</p>
      </div>
      <p className="col-span-full sm:col-span-1">
        {t.footer.copyright}
        <span aria-hidden="true" className="mx-2 opacity-40">·</span>
        <Link href="/customer/bookings" className="opacity-60 underline-offset-2 hover:opacity-100 hover:underline">My bookings</Link>
        <span aria-hidden="true" className="mx-2 opacity-40">·</span>
        <Link href="/inquiries" className="opacity-60 underline-offset-2 hover:opacity-100 hover:underline">{t.footer.admin}</Link>
      </p>
    </footer>
  );
};

export default SiteFooter;
