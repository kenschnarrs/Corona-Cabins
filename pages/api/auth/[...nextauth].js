import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { v4 as uuidv4 } from 'uuid';
export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
     }),
  ],
  secret: uuidv4(),
  session: {
    strategy: 'jwt',
  },
}
export default NextAuth(authOptions)