import React from "react";
import { GetServerSideProps } from "next";
import Link from "next/link";
import Layout from "../../components/Layout";
import Seo from "../../components/Seo";
import { CabinProps } from "../../lib/types";
import { amenityChips, formatPrice } from "../../lib/cabins";
import { cabinPhoto } from "../../lib/placeholders";
import { cabinCopy, useLanguage } from "../../lib/i18n";

import prisma from "../../lib/prisma";

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const cabin = await prisma.cabin.findUnique({
    where: { id: String(params?.id) },
    include: { images: true },
  });

  if (!cabin) {
    return { notFound: true };
  }

  const serializedCabin = JSON.parse(JSON.stringify(cabin));

  return { props: { cabin: serializedCabin } };
};

type CabinShowPageProps = {
  cabin: CabinProps;
};

const CabinShowPage: React.FC<CabinShowPageProps> = ({ cabin }) => {
  const { t, lang } = useLanguage();
  const copy = cabinCopy(t, cabin.name);
  const primary = cabin.images.find((img) => img.type === "Primary");
  const photo = cabinPhoto(cabin.name, primary?.url ?? null);
  const chips = amenityChips(cabin, t);
  const name = copy?.name ?? cabin.name;

  return (
    <Layout>
      <Seo
        title={`${name} | ${t.meta.title}`}
        description={copy?.desc ?? t.meta.description}
        path={`/p/${cabin.id}`}
      />
      <main className="mx-auto max-w-[960px] px-5 py-12 sm:px-8">
        <p className="font-sans text-sm">
          <Link href="/#cabins" className="underline">
            {t.detail.back}
          </Link>
        </p>
        <div
          className="card-photo relative mt-6 h-[320px] bg-cover bg-center sm:h-[440px]"
          style={{ backgroundImage: `url('${photo.url}')` }}
          role="img"
          aria-label={photo.alt}
        >
          {photo.isPlaceholder && (
            <span className="absolute right-[10px] top-[10px] z-[1] bg-[rgba(36,18,9,.65)] px-2 py-[6px] font-sans text-[10px] text-white">
              {t.detail.tempPhoto}
            </span>
          )}
        </div>
        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="m-0 text-[clamp(38px,5vw,60px)] font-medium leading-none tracking-[-0.045em]">
            {name}
          </h1>
          <p className="m-0 font-sans text-[11px] uppercase text-pricemuted">
            <strong className="block text-2xl text-terradeep">
              {formatPrice(cabin.price_per_night)}
            </strong>
            {t.detail.perNight}
          </p>
        </div>
        <div className="rich-text-display mt-4 text-lg leading-relaxed text-muted" dangerouslySetInnerHTML={{ __html: lang === "es" ? cabin.description_es : cabin.description_en }} />
        <h2 className="mb-3 mt-10 font-sans text-xs font-bold uppercase tracking-[0.24em] text-eyebrow">
          {t.detail.amenitiesHeading}
        </h2>
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span key={chip} className="bg-chip px-[9px] py-[7px] font-sans text-[11px]">
              {chip}
            </span>
          ))}
        </div>
        <h2 className="mb-3 mt-10 font-sans text-xs font-bold uppercase tracking-[0.24em] text-eyebrow">
          {t.detail.descriptionHeading}
        </h2>
        <div className="rich-text-display leading-relaxed text-muted" dangerouslySetInnerHTML={{ __html: lang === "es" ? cabin.description_es : cabin.description_en }} />
      </main>
    </Layout>
  );
};

export default CabinShowPage;
