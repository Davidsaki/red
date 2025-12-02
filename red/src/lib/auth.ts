import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Configuración que funciona
const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async session({ session, token }: any) {
      if (token?.sub && session?.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});

// Exportar handlers individualmente
export const GET = handler.handlers?.GET || (() => new Response("Not found", { status: 404 }));
export const POST = handler.handlers?.POST || (() => new Response("Not found", { status: 404 }));
export default handler;
