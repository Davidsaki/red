// src/lib/email.ts
import { Resend } from 'resend';

// Lazy init so build doesn't fail without RESEND_API_KEY
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY ?? 'placeholder');
  return _resend;
}

const FROM = process.env.EMAIL_FROM ?? 'RED <onboarding@resend.dev>';
const BASE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const url = `${BASE_URL}/api/auth/verify-email?token=${token}`;
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'Confirma tu email — Red de Contratistas',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#111827">Confirma tu cuenta</h2>
        <p style="color:#6b7280">Haz clic en el botón para activar tu cuenta en Red de Contratistas. El enlace expira en 24 horas.</p>
        <a href="${url}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
          Confirmar email
        </a>
        <p style="margin-top:24px;color:#9ca3af;font-size:12px">Si no creaste esta cuenta puedes ignorar este mensaje.</p>
      </div>
    `,
  });
}

export async function sendMagicLink(email: string, token: string): Promise<void> {
  const url = `${BASE_URL}/api/auth/magic-link?token=${token}`;
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'Tu enlace de acceso — Red de Contratistas',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#111827">Accede a tu cuenta</h2>
        <p style="color:#6b7280">Haz clic en el botón para entrar. El enlace expira en 15 minutos y solo funciona una vez.</p>
        <a href="${url}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
          Entrar a RED
        </a>
        <p style="margin-top:24px;color:#9ca3af;font-size:12px">Si no solicitaste este enlace puedes ignorar este mensaje.</p>
      </div>
    `,
  });
}
