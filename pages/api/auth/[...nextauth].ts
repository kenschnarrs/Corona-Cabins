import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { isAdminEmail } from "../../../lib/admin";

// NEXTAUTH_SECRET must be a stable value from protected environment
// configuration (Vercel env vars). A random boot-time secret invalidates every
// session on each redeploy, and hardcoding a secret in source is not allowed.
// NextAuth errors in production when no secret is configured, so a missing
// variable fails closed instead of silently weakening auth.
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID ?? "",
      clientSecret: process.env.GOOGLE_SECRET ?? "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // Any verified Google user may sign in as a customer. Admin privileges are
    // still derived only from the server-side allowlist.
    async signIn({ account, profile }) {
      return account?.provider === "google" && (profile as { email_verified?: boolean } | undefined)?.email_verified === true;
    },
    async session({ session }) {
      if (session.user) {
        (session.user as { isAdmin?: boolean }).isAdmin = isAdminEmail(
          session.user.email
        );
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
