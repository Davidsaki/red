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

        // Validate Turnstile in production. A missing token must be rejected, not skipped,
        // otherwise bots bypass verification simply by omitting the field.
        if (process.env.NODE_ENV === 'production') {
          if (!credentials.cfToken) return null;
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

        // Atomically claim the token: only one concurrent request can win this
        // UPDATE, closing the check-then-act race between reading used_at and
        // setting it.
        const claim = await pool.query<{ email: string }>(
          `UPDATE magic_link_tokens SET used_at = NOW()
           WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()
           RETURNING email`,
          [credentials.magicToken]
        );

        if (claim.rows.length === 0) return null;

        const { email } = claim.rows[0];
        const userResult = await pool.query<{ id: number; email: string; name: string; image: string | null }>(
          `UPDATE users SET email_verified = true WHERE email = $1
           RETURNING id, email, name, image`,
          [email]
        );

        if (userResult.rows.length === 0) return null;

        const user = userResult.rows[0];
        return { id: user.id.toString(), email: user.email, name: user.name, image: user.image };
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