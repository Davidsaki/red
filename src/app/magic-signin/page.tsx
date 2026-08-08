// src/app/magic-signin/page.tsx
// Intermediate page that completes magic link login after email click
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

function MagicSigninContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      router.replace('/login?error=token_missing');
      return;
    }

    signIn('magic-link', { magicToken: token, redirect: false }).then((result) => {
      if (result?.error) {
        setError('El enlace es inválido o ya fue usado. Solicita uno nuevo.');
      } else {
        router.replace('/dashboard');
      }
    });
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm px-4">
          <p className="text-red-600 mb-4">{error}</p>
          <a href="/login" className="text-blue-600 hover:underline text-sm">
            Volver al login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-sm">Iniciando sesión...</p>
      </div>
    </div>
  );
}

export default function MagicSigninPage() {
  return (
    <Suspense>
      <MagicSigninContent />
    </Suspense>
  );
}
