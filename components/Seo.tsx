import React from "react";
import Head from "next/head";
import { useLanguage } from "../lib/i18n";
import { HERO_PLACEHOLDER } from "../lib/placeholders";
import { ogImageUrl, SITE_URL } from "../lib/seo";

export { SITE_URL };

type Props = {
  title?: string;
  description?: string;
  path?: string;
  /** Social preview photo (the cabin photo on cabin pages). */
  image?: string;
  imageAlt?: string;
};

/** Page titles, descriptions, and social preview (Open Graph / Twitter). */
const Seo: React.FC<Props> = ({ title, description, path = "/", image, imageAlt }) => {
  const { lang, t } = useLanguage();
  const fullTitle = title ?? t.meta.title;
  const desc = description ?? t.meta.description;
  const url = `${SITE_URL}${path}`;
  // Temporary placeholder hero until Ken supplies real property photos.
  const previewImage = ogImageUrl(image ?? HERO_PLACEHOLDER.url);
  const previewAlt = imageAlt ?? HERO_PLACEHOLDER.alt;
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
      <meta property="og:image" content={previewImage} />
      <meta property="og:image:alt" content={previewAlt} />
      <meta property="og:locale" content={lang === "es" ? "es_MX" : "en_US"} />
      <meta property="og:locale:alternate" content={lang === "es" ? "en_US" : "es_MX"} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={previewImage} />
      <meta name="twitter:image:alt" content={previewAlt} />
    </Head>
  );
};

export default Seo;
