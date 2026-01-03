// src/lib/auth.ts
import { NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { sql } from "./db";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (!user.email) {
          console.error('No email provided by OAuth provider');
          return false;
        }

        // Check if user already exists
        const existingUser = await sql`
          SELECT id, email FROM users WHERE email = ${user.email}
        `;

        if (existingUser.rows.length === 0) {
          // Create new user
          await sql`
            INSERT INTO users (email, name, image, subscription_tier)
            VALUES (
              ${user.email},
              ${user.name || 'User'},
              ${user.image || null},
              'free'
            )
          `;
          console.log(`New user created: ${user.email}`);
        } else {
          // Update existing user's name and image if changed
          await sql`
            UPDATE users
            SET name = ${user.name || 'User'},
                image = ${user.image || null}
            WHERE email = ${user.email}
          `;
          console.log(`User updated: ${user.email}`);
        }

        return true;
      } catch (error) {
        console.error('Error saving user to database:', error);
        // Allow sign-in even if database fails (you can change this to return false if you want to block)
        return true;
      }
    },
    async session({ session, token }) {
      // Add user ID from database to session
      if (session.user?.email) {
        try {
          const result = await sql`
            SELECT id, subscription_tier FROM users WHERE email = ${session.user.email}
          `;

          if (result.rows.length > 0) {
            session.user.id = result.rows[0].id.toString();
            session.user.subscription = result.rows[0].subscription_tier;
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