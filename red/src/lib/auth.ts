// src/lib/auth.ts - VERSIÓN CORRECTA
import NextAuth from "next-auth";

const handler = NextAuth({
  providers: [],
});

// Exportar TODAS las funciones necesarias
export const { handlers, auth, signIn, signOut } = handler;
export default handler;