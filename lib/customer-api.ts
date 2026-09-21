import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../pages/api/auth/[...nextauth]";
export async function requireCustomer(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) { res.status(401).json({ error: "Sign in with Google to continue." }); return null; }
  return { session, email };
}
