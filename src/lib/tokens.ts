// src/lib/tokens.ts
import crypto from 'crypto';
import { pool } from './db';

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createVerificationToken(userId: number): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  await pool.query(
    `INSERT INTO email_verification_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3`,
    [userId, token, expiresAt]
  );

  return token;
}

export async function createMagicLinkToken(email: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

  await pool.query(
    `INSERT INTO magic_link_tokens (email, token, expires_at)
     VALUES ($1, $2, $3)`,
    [email, token, expiresAt]
  );

  return token;
}

export async function validateTurnstile(token: string): Promise<boolean> {
  if (process.env.NODE_ENV === 'development') return true;

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY ?? '',
      response: token,
    }),
  });

  const data = await res.json() as { success: boolean };
  return data.success;
}
