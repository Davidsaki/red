// src/proxy.ts
// Protects all /dashboard routes — redirects unauthenticated users to /login
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: ['/dashboard/:path*'],
};
