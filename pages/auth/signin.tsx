import React from "react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { getServerSession } from "next-auth/next";
import { signIn } from "next-auth/react";
import Layout from "../../components/Layout";
import Seo from "../../components/Seo";
import { authOptions } from "../api/auth/[...nextauth]";
import { useLanguage } from "../../lib/i18n";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  // Already signed-in visitors have nothing to do here.
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (session) {
    const callbackUrl = typeof ctx.query.callbackUrl === "string" ? ctx.query.callbackUrl : "/";
    return { redirect: { destination: safeCallback(callbackUrl), permanent: false } };
  }
  return { props: {} };
};

// Only same-site paths are valid redirect targets after sign-in.
function safeCallback(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

const SignInPage: React.FC = () => {
  const { t } = useLanguage();
  const router = useRouter();
  const callbackUrl = safeCallback(typeof router.query.callbackUrl === "string" ? router.query.callbackUrl : "/");
  return (
    <Layout>
      <Seo title={t.auth.seoTitle} path="/auth/signin" />
      <main className="mx-auto max-w-[760px] px-5 py-20 text-center">
        <h1 className="text-5xl">{t.auth.heading}</h1>
        <p className="text-muted">{t.auth.body}</p>
        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="mt-5 bg-terra px-6 py-4 font-sans text-xs font-extrabold uppercase tracking-[.12em] text-white"
        >
          {t.auth.google}
        </button>
      </main>
    </Layout>
  );
};

export default SignInPage;
