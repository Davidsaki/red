// src/lib/auth.ts
import { NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { sql, pool } from "./db";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
        cfToken: { label: 'Turnstile', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Validate Turnstile in production
        if (process.env.NODE_ENV === 'production' && credentials.cfToken) {
          const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              secret: process.env.TURNSTILE_SECRET_KEY ?? '',
              response: credentials.cfToken,
            }),
          });
          const data = await res.json() as { success: boolean };
          if (!data.success) return null;
        }

        const result = await sql<{ id: number; email: string; name: string; image: string | null; password_hash: string | null; email_verified: boolean }>`
          SELECT id, email, name, image, password_hash, email_verified FROM users WHERE email = ${credentials.email}
        `;

        if (result.rows.length === 0) return null;

        const user = result.rows[0];
        if (!user.password_hash) return null; // Google-only account
        if (!user.email_verified) return null; // Must verify email first

        const isValid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isValid) return null;

        return { id: user.id.toString(), email: user.email, name: user.name, image: user.image };
      },
    }),
    CredentialsProvider({
      id: 'magic-link',
      name: 'magic-link',
      credentials: {
        magicToken: { label: 'Magic Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.magicToken) return null;

        const result = await pool.query<{ id: number; email: string; name: string; image: string | null; used_at: Date | null; expires_at: Date }>(
          `SELECT u.id, u.email, u.name, u.image, m.used_at, m.expires_at
           FROM magic_link_tokens m
           JOIN users u ON u.email = m.email
           WHERE m.token = $1`,
          [credentials.magicToken]
        );

        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        if (row.used_at) return null;
        if (new Date() > new Date(row.expires_at)) return null;

        // Mark token as used and mark user email as verified
        await pool.query(
          `UPDATE magic_link_tokens SET used_at = NOW() WHERE token = $1`,
          [credentials.magicToken]
        );
        await pool.query(
          `UPDATE users SET email_verified = true WHERE id = $1`,
          [row.id]
        );

        return { id: row.id.toString(), email: row.email, name: row.name, image: row.image };
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      // Credentials/magic-link: user already validated in authorize()
      if (account?.provider === 'credentials' || account?.provider === 'magic-link') {
        return true;
      }

      try {
        if (!user.email) {
          console.error('No email provided by OAuth provider');
          return false;
        }

        const existingUser = await sql`
          SELECT id FROM users WHERE email = ${user.email}
        `;

        if (existingUser.rows.length === 0) {
          // Google verifies email, so email_verified = true from the start
          await sql`
            INSERT INTO users (email, name, image, subscription_tier, email_verified)
            VALUES (${user.email}, ${user.name || 'User'}, ${user.image || null}, 'free', true)
          `;
        } else {
          await sql`
            UPDATE users
            SET name = ${user.name || 'User'},
                image = ${user.image || null},
                email_verified = true
            WHERE email = ${user.email}
          `;
        }

        return true;
      } catch (error) {
        console.error('Error saving user to database:', error);
        return true;
      }
    },
    async session({ session, token }) {
      // Add user ID from database to session
      if (session.user?.email) {
        try {
          const result = await sql`
            SELECT id, subscription_tier, role FROM users WHERE email = ${session.user.email}
          `;

          if (result.rows.length > 0) {
            session.user.id = result.rows[0].id.toString();
            session.user.subscription = result.rows[0].subscription_tier;
            session.user.role = result.rows[0].role;
          }
        } catch (error) {
          console.error('Error fetching user from database:', error);
        }
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

// Helper function to get session in Server Components
export const getSession = () => getServerSession(authOptions);