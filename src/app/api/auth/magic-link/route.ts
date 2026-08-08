// src/app/api/auth/magic-link/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool, sql } from '@/lib/db';
import { createMagicLinkToken, validateTurnstile } from '@/lib/tokens';
import { sendMagicLink } from '@/lib/email';

const requestSchema = z.object({
  email: z.email('Email inválido'),
  cfToken: z.string().optional(),
});

// POST — request a magic link
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { email, cfToken } = validation.data;

    if (cfToken) {
      const valid = await validateTurnstile(cfToken);
      if (!valid) {
        return NextResponse.json({ error: 'Verificación fallida. Intenta de nuevo.' }, { status: 400 });
      }
    }

    // Always respond with success to avoid email enumeration
    const user = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (user.rows.length > 0) {
      const token = await createMagicLinkToken(email);
      await sendMagicLink(email, token);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Magic link error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// GET — validate token from email link and redirect to auto-login page
export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=token_missing', request.url));
  }

  const result = await pool.query<{ email: string; used_at: Date | null; expires_at: Date }>(
    `SELECT email, used_at, expires_at FROM magic_link_tokens WHERE token = $1`,
    [token]
  );

  if (result.rows.length === 0) {
    return NextResponse.redirect(new URL('/login?error=token_invalid', request.url));
  }

  const row = result.rows[0];
  if (row.used_at) {
    return NextResponse.redirect(new URL('/login?error=token_used', request.url));
  }
  if (new Date() > new Date(row.expires_at)) {
    return NextResponse.redirect(new URL('/login?error=token_expired', request.url));
  }

  // Redirect to a page that finishes the login client-side with the token
  return NextResponse.redirect(
    new URL(`/magic-signin?token=${token}`, request.url)
  );
}
