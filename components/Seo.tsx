import React from "react";
import Head from "next/head";
import { useLanguage } from "../lib/i18n";
import { HERO_PLACEHOLDER } from "../lib/placeholders";

export const SITE_URL = "https://cabanascorona.vercel.app";

type Props = {
  title?: string;
  description?: string;
  path?: string;
};

/** Page titles, descriptions, and social preview (Open Graph / Twitter). */
const Seo: React.FC<Props> = ({ title, description, path = "/" }) => {
  const { lang, t } = useLanguage();
  const fullTitle = title ?? t.meta.title;
  const desc = description ?? t.meta.description;
  const url = `${SITE_URL}${path}`;
  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Cabañas Corona" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      {/* Temporary placeholder hero until Ken supplies real property photos. */}
      <meta property="og:image" content={HERO_PLACEHOLDER.url} />
      <meta property="og:locale" content={lang === "es" ? "es_MX" : "en_US"} />
      <meta property="og:locale:alternate" content={lang === "es" ? "en_US" : "es_MX"} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={HERO_PLACEHOLDER.url} />
    </Head>
  );
};

export default Seo;
