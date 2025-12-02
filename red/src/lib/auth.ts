// src/lib/auth.ts - Versión corregida
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session?.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};

// Exportar handlers
export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);