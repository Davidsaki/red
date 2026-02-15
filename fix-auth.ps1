# final-fix-auth.ps1
Write-Host "🚀 SOLUCIÓN DEFINITIVA para autenticación..." -ForegroundColor Cyan

# 1. Limpiar estructura anterior
if (Test-Path "src/app/api/auth") {
    Remove-Item -Path "src/app/api/auth" -Recurse -Force
    Write-Host "🗑️  Estructura auth anterior eliminada" -ForegroundColor Yellow
}

# 2. Crear nueva estructura
New-Item -Path "src/app/api/auth/[...nextauth]" -ItemType Directory -Force | Out-Null

# 3. Crear auth.ts NUEVO
$authContent = @'
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
'@

$authContent | Out-File -FilePath "src/lib/auth.ts" -Encoding UTF8 -Force

# 4. Crear route.ts NUEVO
$routeContent = @'
import { GET, POST } from "@/lib/auth";
export { GET, POST };
'@

$routeContent | Out-File -FilePath "src/app/api/auth/[...nextauth]/route.ts" -Encoding UTF8 -Force

Write-Host "✅ Estructura de auth recreada exitosamente!" -ForegroundColor Green
Write-Host "📁 Archivos creados:" -ForegroundColor Cyan
Write-Host "  - src/lib/auth.ts (nueva versión)"
Write-Host "  - src/app/api/auth/[...nextauth]/route.ts"