// src/app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=token_missing', request.url));
  }

  const result = await pool.query<{ user_id: number; expires_at: Date }>(
    `SELECT user_id, expires_at FROM email_verification_tokens WHERE token = $1`,
    [token]
  );

  if (result.rows.length === 0) {
    return NextResponse.redirect(new URL('/login?error=token_invalid', request.url));
  }

  const { user_id, expires_at } = result.rows[0];

  if (new Date() > new Date(expires_at)) {
    return NextResponse.redirect(new URL('/login?error=token_expired', request.url));
  }

  await pool.query(`UPDATE users SET email_verified = true WHERE id = $1`, [user_id]);
  await pool.query(`DELETE FROM email_verification_tokens WHERE user_id = $1`, [user_id]);

  return NextResponse.redirect(new URL('/login?verified=1', request.url));
}
