import React from "react";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import { signOut } from "next-auth/react";

import Layout from "../components/Layout";
import Seo from "../components/Seo";
import { authOptions } from "./api/auth/[...nextauth]";
import { isAdminEmail } from "../lib/admin";
import { useLanguage } from "../lib/i18n";

// Admin-only page: enforced on the server, not just hidden in the UI.
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session || !isAdminEmail(session.user?.email)) {
    return {
      redirect: { destination: "/api/auth/signin", permanent: false },
    };
  }
  return { props: {} };
};

const InquiriesPage: React.FC = () => {
  const { t } = useLanguage();
  return (
    <Layout>
      <Seo title={`${t.inquiries.heading} | ${t.meta.title}`} path="/inquiries" />
      <main className="mx-auto max-w-[960px] px-5 py-12 sm:px-8">
        <div className="flex items-start justify-between gap-5">
          <h1 className="m-0 text-[clamp(38px,5vw,60px)] font-medium leading-none tracking-[-0.045em]">
            {t.inquiries.heading}
          </h1>
          <button
            type="button"
            onClick={() => signOut()}
            className="bg-terra px-[22px] py-[15px] font-sans text-xs font-extrabold uppercase tracking-[0.13em] text-white"
          >
            {t.inquiries.signOut}
          </button>
        </div>
        <p className="mt-8 leading-relaxed text-muted">{t.inquiries.empty}</p>
      </main>
    </Layout>
  );
};

export default InquiriesPage;
