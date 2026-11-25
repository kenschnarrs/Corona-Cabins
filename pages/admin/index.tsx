import React from "react";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import Layout from "../../components/Layout";
import Seo from "../../components/Seo";
import { authOptions } from "../api/auth/[...nextauth]";
import { isAdminEmail } from "../../lib/admin";
import { useLanguage } from "../../lib/i18n";
import prisma from "../../lib/prisma";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session || !isAdminEmail(session.user?.email)) return { redirect: { destination: "/auth/signin", permanent: false } };
  const cabins = await prisma.cabin.findMany({ orderBy: { price_per_night: "desc" }, select: { id: true, name: true, images: { select: { id: true } } } });
  return { props: { cabins } };
};
export default function Admin({ cabins }: { cabins: { id: string; name: string; images: { id: string }[] }[] }) {
  const { t } = useLanguage();
  const a = t.admin.hub;
  const photoCount = (count: number) => (count === 1 ? a.photos_one : a.photos_other).replace("{count}", String(count));
  return <Layout><Seo title={a.seoTitle} path="/admin"/><main className="mx-auto max-w-[960px] px-5 py-12"><div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-5xl">{a.heading}</h1><div className="flex gap-2"><Link href="/inquiries" className="bg-terra px-5 py-3 font-sans text-xs font-extrabold uppercase tracking-[.12em] text-white">{a.bookingsLink}</Link><Link href="/admin/calendar" className="border border-terra px-5 py-3 font-sans text-xs font-extrabold uppercase tracking-[.12em] text-terra">{a.calendarLink}</Link></div></div><p className="text-muted">{a.intro}</p><div className="mt-8 grid gap-4 sm:grid-cols-3">{cabins.map(c => <Link key={c.id} href={`/admin/cabins/${c.id}`} className="border border-cardborder bg-card p-6 shadow"><h2 className="text-2xl">{c.name}</h2><p className="font-sans text-sm">{photoCount(c.images.length)}</p><span className="font-sans text-xs font-bold uppercase text-terra">{a.manage}</span></Link>)}</div></main></Layout>;
}
