// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { createVerificationToken, validateTurnstile } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/email';
import { getClientIp, isRateLimited } from '@/lib/rate-limit';

const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(255),
  email: z.email('Email inválido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72, 'La contraseña no puede superar 72 caracteres'),
  cfToken: z.string().optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, cfToken } = validation.data;

    if (await isRateLimited(`register:ip:${getClientIp(request)}`, `register:email:${email}`)) {
      return NextResponse.json({ error: 'Demasiados intentos. Intenta de nuevo más tarde.' }, { status: 429 });
    }

    // Validate Turnstile in production. A missing token must be rejected, not skipped,
    // otherwise bots bypass verification simply by omitting the field.
    if (process.env.NODE_ENV === 'production') {
      if (!cfToken) {
        return NextResponse.json({ error: 'Verificación de seguridad requerida' }, { status: 400 });
      }
      const valid = await validateTurnstile(cfToken);
      if (!valid) {
        return NextResponse.json({ error: 'Verificación fallida. Intenta de nuevo.' }, { status: 400 });
      }
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Este email ya está registrado' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await sql<{ id: number }>`
      INSERT INTO users (email, name, subscription_tier, password_hash, email_verified)
      VALUES (${email}, ${name}, 'free', ${passwordHash}, false)
      RETURNING id
    `;

    const userId = newUser.rows[0].id;
    const token = await createVerificationToken(userId);
    await sendVerificationEmail(email, token);

    return NextResponse.json(
      { success: true, message: 'Revisa tu email para confirmar tu cuenta.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
