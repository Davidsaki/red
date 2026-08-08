// src/app/(auth)/login/page.tsx
'use client';

import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Turnstile } from '@marsidev/react-turnstile';

const loginSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

const magicSchema = z.object({
  email: z.email('Email inválido'),
});

type LoginForm = z.infer<typeof loginSchema>;
type MagicForm = z.infer<typeof magicSchema>;

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

const errorMessages: Record<string, string> = {
  token_missing: 'El enlace es inválido.',
  token_invalid: 'El enlace no existe o ya fue usado.',
  token_expired: 'El enlace expiró. Solicita uno nuevo.',
  token_used: 'Este enlace ya fue utilizado.',
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');
  const verified = searchParams.get('verified');

  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [authError, setAuthError] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const cfTokenRef = useRef('');

  const passwordForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const magicForm = useForm<MagicForm>({ resolver: zodResolver(magicSchema) });

  async function onPasswordSubmit(data: LoginForm) {
    setIsLoading(true);
    setAuthError('');

    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      cfToken: cfTokenRef.current,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      if (result.error.includes('verify') || result.error === 'CredentialsSignin') {
        setAuthError('Email o contraseña incorrectos, o aún no has confirmado tu email.');
      } else {
        setAuthError('Email o contraseña incorrectos.');
      }
    } else {
      router.push('/dashboard');
    }
  }

  async function onMagicSubmit(data: MagicForm) {
    setIsLoading(true);
    setAuthError('');

    await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email, cfToken: cfTokenRef.current }),
    });

    setIsLoading(false);
    setMagicSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-6 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Red de Contratistas</h1>
          <p className="mt-2 text-gray-600">Conecta con proyectos y talentos</p>
        </div>

        {verified && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 text-center">
            Email confirmado. Ya puedes ingresar.
          </p>
        )}

        {urlError && errorMessages[urlError] && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-center">
            {errorMessages[urlError]}
          </p>
        )}

        {/* Google OAuth */}
        <button
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar con Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 text-gray-500">o ingresa con email</span>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-md border border-gray-200 overflow-hidden text-sm font-medium">
          <button
            onClick={() => { setMode('password'); setMagicSent(false); setAuthError(''); }}
            className={`flex-1 py-2 ${mode === 'password' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Con contraseña
          </button>
          <button
            onClick={() => { setMode('magic'); setMagicSent(false); setAuthError(''); }}
            className={`flex-1 py-2 ${mode === 'magic' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Link al email
          </button>
        </div>

        {/* Password form */}
        {mode === 'password' && (
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            {authError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {authError}
              </p>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...passwordForm.register('email')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
              />
              {passwordForm.formState.errors.email && (
                <p className="mt-1 text-xs text-red-600">{passwordForm.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...passwordForm.register('password')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
              />
              {passwordForm.formState.errors.password && (
                <p className="mt-1 text-xs text-red-600">{passwordForm.formState.errors.password.message}</p>
              )}
            </div>
            {SITE_KEY && (
              <Turnstile siteKey={SITE_KEY} onSuccess={(token) => { cfTokenRef.current = token; }} />
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        )}

        {/* Magic link form */}
        {mode === 'magic' && !magicSent && (
          <form onSubmit={magicForm.handleSubmit(onMagicSubmit)} className="space-y-4">
            <p className="text-sm text-gray-500">
              Te enviamos un enlace a tu email. Un clic y entras, sin contraseña.
            </p>
            <div>
              <label htmlFor="magic-email" className="block text-sm font-medium text-gray-700">Email</label>
              <input
                id="magic-email"
                type="email"
                autoComplete="email"
                {...magicForm.register('email')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
              />
              {magicForm.formState.errors.email && (
                <p className="mt-1 text-xs text-red-600">{magicForm.formState.errors.email.message}</p>
              )}
            </div>
            {SITE_KEY && (
              <Turnstile siteKey={SITE_KEY} onSuccess={(token) => { cfTokenRef.current = token; }} />
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Enviando...' : 'Enviar enlace'}
            </button>
          </form>
        )}

        {mode === 'magic' && magicSent && (
          <div className="text-center py-4">
            <p className="text-green-700 font-medium">¡Enlace enviado!</p>
            <p className="text-sm text-gray-500 mt-1">Revisa tu email. El enlace expira en 15 minutos.</p>
            <button
              onClick={() => setMagicSent(false)}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Enviar de nuevo
            </button>
          </div>
        )}

        <p className="text-center text-sm text-gray-600">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-blue-600 hover:underline font-medium">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
